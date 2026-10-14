import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEmptyDriveChart, isStoredDriveChart } from './driveChartData';
import { DEFAULT_TEAM, getTeamDatasetKey, isStoredTeamSchedule, TEAM_SCHEDULE_KEY } from './teamSchedule';

export const APP_DATA_KEY = 'gridiron-scout.app-data.v1';
export const APP_DATA_FORMAT = 'gridiron-scout';
export const APP_DATA_VERSION = 1;
export const LEGACY_DATA_KEYS = [
  'gridiron-scout.dataset.v1',
  'gridiron-scout.cloud-csv-url.v1',
  'gridiron-scout.storage-mode.v1',
  TEAM_SCHEDULE_KEY,
];

const emptySchedule = () => ({
  teams: [{ ...DEFAULT_TEAM }],
  selectedTeamId: DEFAULT_TEAM.id,
});

const emptyTeamData = () => ({
  playbook: null,
  driveChart: createEmptyDriveChart(),
});

export function createEmptyAppData() {
  return {
    format: APP_DATA_FORMAT,
    version: APP_DATA_VERSION,
    schedule: emptySchedule(),
    teams: { [DEFAULT_TEAM.id]: emptyTeamData() },
    preferences: { storageMode: 'local', cloudCsvUrl: '' },
  };
}

function isStoredPlaybook(value) {
  return value === null || (
    value
    && Array.isArray(value.plays)
    && value.plays.every((play) => (
      play
      && typeof play.clip === 'string'
      && typeof play.downDistBucket === 'string'
      && typeof play.gain === 'number'
    ))
    && (value.rowCount === undefined || Number.isInteger(value.rowCount))
    && (value.name === undefined || typeof value.name === 'string')
  );
}

export function isStoredAppData(value) {
  if (
    !value
    || value.format !== APP_DATA_FORMAT
    || value.version !== APP_DATA_VERSION
    || !isStoredTeamSchedule(value.schedule)
    || !value.teams
    || typeof value.teams !== 'object'
    || Array.isArray(value.teams)
    || !value.preferences
    || !['local', 'cloud'].includes(value.preferences.storageMode)
    || typeof value.preferences.cloudCsvUrl !== 'string'
  ) {
    return false;
  }

  const scheduleIds = new Set(value.schedule.teams.map((team) => team.id));
  return scheduleIds.size === Object.keys(value.teams).length
    && [...scheduleIds].every((teamId) => value.teams[teamId])
    && Object.entries(value.teams).every(([teamId, teamData]) => (
    scheduleIds.has(teamId)
    && teamData
    && isStoredPlaybook(teamData.playbook)
    && isStoredDriveChart(teamData.driveChart)
    ));
}

export function serializeAppData(value) {
  if (!isStoredAppData(value)) {
    throw new Error('App data has an invalid structure and cannot be saved.');
  }
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function parseAppDataText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`This is not valid JSON: ${error.message}`);
  }
  if (!isStoredAppData(parsed)) {
    throw new Error('This JSON is not a supported Gridiron Scout data backup.');
  }
  return parsed;
}

async function getLegacyValue(key) {
  return AsyncStorage.getItem(key);
}

function parseLegacyJson(value, key) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Could not migrate saved data from ${key}: ${error.message}`);
  }
}

async function buildLegacyMigration() {
  const migrated = createEmptyAppData();
  const [legacyPlaybookValue, cloudCsvUrl, storageMode, scheduleValue] = await Promise.all([
    getLegacyValue('gridiron-scout.dataset.v1'),
    getLegacyValue('gridiron-scout.cloud-csv-url.v1'),
    getLegacyValue('gridiron-scout.storage-mode.v1'),
    getLegacyValue(TEAM_SCHEDULE_KEY),
  ]);
  const hasLegacyData = [legacyPlaybookValue, cloudCsvUrl, storageMode, scheduleValue].some(
    (value) => value !== null,
  );

  if (scheduleValue) {
    migrated.schedule = parseLegacyJson(scheduleValue, TEAM_SCHEDULE_KEY);
    if (!isStoredTeamSchedule(migrated.schedule)) {
      throw new Error('The saved team schedule has an invalid structure and could not be migrated.');
    }
  }

  if (storageMode === 'local' || storageMode === 'cloud') {
    migrated.preferences.storageMode = storageMode;
  } else if (storageMode !== null) {
    throw new Error('The saved storage preference has an invalid value and could not be migrated.');
  }
  migrated.preferences.cloudCsvUrl = cloudCsvUrl || '';

  for (const team of migrated.schedule.teams) {
    const teamData = emptyTeamData();
    const [playbookValue, driveChartValue] = await Promise.all([
      getLegacyValue(getTeamDatasetKey(team.id)),
      getLegacyValue(`gridiron-scout.team.${encodeURIComponent(team.id)}.drive-chart.v1`),
    ]);
    const legacyDefaultPlaybook = team.id === DEFAULT_TEAM.id
      ? legacyPlaybookValue
      : null;
    const storedPlaybookValue = playbookValue || legacyDefaultPlaybook;

    if (storedPlaybookValue) {
      const playbook = parseLegacyJson(
        storedPlaybookValue,
        playbookValue ? getTeamDatasetKey(team.id) : 'gridiron-scout.dataset.v1',
      );
      if (!isStoredPlaybook(playbook)) {
        throw new Error(`Saved play data for ${team.name} has an invalid structure and could not be migrated.`);
      }
      teamData.playbook = playbook;
    }

    if (driveChartValue) {
      const driveChart = parseLegacyJson(
        driveChartValue,
        `gridiron-scout.team.${encodeURIComponent(team.id)}.drive-chart.v1`,
      );
      if (!isStoredDriveChart(driveChart)) {
        throw new Error(`Saved drive chart for ${team.name} has an invalid structure and could not be migrated.`);
      }
      teamData.driveChart = driveChart;
    }
    migrated.teams[team.id] = teamData;
  }

  if (!hasLegacyData) return { data: migrated, migrated: false };
  if (!isStoredAppData(migrated)) {
    throw new Error('Existing app data could not be combined into the new JSON structure.');
  }
  return { data: migrated, migrated: true };
}

let storageQueue = Promise.resolve();

function runSerialized(operation) {
  const result = storageQueue.then(operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function readCanonicalAppData() {
  const saved = await AsyncStorage.getItem(APP_DATA_KEY);
  if (!saved) return createEmptyAppData();
  return parseAppDataText(saved);
}

export function loadAppData() {
  return runSerialized(async () => {
    const saved = await AsyncStorage.getItem(APP_DATA_KEY);
    if (saved) {
      return { data: parseAppDataText(saved), migrated: false, created: false };
    }
    const { data, migrated } = await buildLegacyMigration();
    await AsyncStorage.setItem(APP_DATA_KEY, serializeAppData(data));
    if (migrated) {
      await AsyncStorage.multiRemove(LEGACY_DATA_KEYS);
      for (const team of data.schedule.teams) {
        await AsyncStorage.removeItem(getTeamDatasetKey(team.id));
        await AsyncStorage.removeItem(`gridiron-scout.team.${encodeURIComponent(team.id)}.drive-chart.v1`);
      }
    }
    return { data, migrated, created: !migrated };
  });
}

export function updateAppData(updater) {
  return runSerialized(async () => {
    const current = await readCanonicalAppData();
    const next = updater(current);
    if (!isStoredAppData(next)) {
      throw new Error('App data update produced an invalid structure.');
    }
    await AsyncStorage.setItem(APP_DATA_KEY, serializeAppData(next));
    return next;
  });
}

export function replaceAppData(value) {
  return runSerialized(async () => {
    const validated = typeof value === 'string' ? parseAppDataText(value) : value;
    const serialized = serializeAppData(validated);
    await AsyncStorage.setItem(APP_DATA_KEY, serialized);
    return validated;
  });
}

export function updateTeamPlaybook(appData, teamId, playbook) {
  return {
    ...appData,
    teams: {
      ...appData.teams,
      [teamId]: {
        ...(appData.teams[teamId] || emptyTeamData()),
        playbook,
      },
    },
  };
}

export function updateTeamDriveChart(appData, teamId, driveChart) {
  return {
    ...appData,
    teams: {
      ...appData.teams,
      [teamId]: {
        ...(appData.teams[teamId] || emptyTeamData()),
        driveChart,
      },
    },
  };
}
