import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_DATA_KEY,
  createEmptyAppData,
  isStoredAppData,
  loadAppData,
  parseAppDataText,
  serializeAppData,
} from './appDataStore';
import { createEmptyDriveChart } from './driveChartData';
import { getTeamDatasetKey, TEAM_SCHEDULE_KEY } from './teamSchedule';

jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

describe('unified app data storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('serializes and parses the complete versioned JSON document', () => {
    const data = createEmptyAppData();
    const text = serializeAppData(data);

    expect(text).toBe(`${JSON.stringify(data, null, 2)}\n`);
    expect(parseAppDataText(text)).toEqual(data);
    expect(isStoredAppData(data)).toBe(true);
  });

  it('rejects invalid or unsupported backup documents', () => {
    expect(() => parseAppDataText('{')).toThrow('This is not valid JSON');
    expect(() => parseAppDataText(JSON.stringify({ format: 'other', version: 1 })))
      .toThrow('not a supported Gridiron Scout data backup');
  });

  it('combines legacy saved data into one document and removes old storage keys', async () => {
    const secondTeam = { id: 'team-week-2', name: 'Lakeview', week: '2' };
    const schedule = {
      teams: [{ id: 'team-default', name: 'My Team', week: '' }, secondTeam],
      selectedTeamId: secondTeam.id,
    };
    const defaultPlaybook = {
      plays: [{
        clip: 'legacy-1',
        downDistBucket: '1st & Long (L)',
        gain: 7,
      }],
      rowCount: 1,
      name: 'Legacy playbook',
    };
    const secondPlaybook = {
      plays: [{
        clip: 'lakeview-1',
        downDistBucket: '2nd & Medium (M)',
        gain: 4,
      }],
      rowCount: 1,
      name: 'Lakeview playbook',
    };
    const chart = createEmptyDriveChart();
    chart.notes.push({
      id: 'note-1',
      quarter: '1st Quarter',
      category: 'Other',
      text: 'Legacy note',
      createdAt: '2026-10-14T12:00:00.000Z',
    });
    await AsyncStorage.setItem('gridiron-scout.dataset.v1', JSON.stringify(defaultPlaybook));
    await AsyncStorage.setItem(getTeamDatasetKey(secondTeam.id), JSON.stringify(secondPlaybook));
    await AsyncStorage.setItem(
      `gridiron-scout.team.${encodeURIComponent(secondTeam.id)}.drive-chart.v1`,
      JSON.stringify(chart),
    );
    await AsyncStorage.setItem(TEAM_SCHEDULE_KEY, JSON.stringify(schedule));
    await AsyncStorage.setItem('gridiron-scout.cloud-csv-url.v1', 'https://example.com/plays.csv');
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');

    const loaded = await loadAppData();

    expect(loaded.migrated).toBe(true);
    expect(loaded.data.schedule).toEqual(schedule);
    expect(loaded.data.teams['team-default'].playbook).toEqual(defaultPlaybook);
    expect(loaded.data.teams[secondTeam.id].playbook).toEqual(secondPlaybook);
    expect(loaded.data.teams[secondTeam.id].driveChart).toEqual(chart);
    expect(loaded.data.preferences).toEqual({
      storageMode: 'cloud',
      cloudCsvUrl: 'https://example.com/plays.csv',
    });
    expect(JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY))).toEqual(loaded.data);
    expect(await AsyncStorage.getItem('gridiron-scout.dataset.v1')).toBeNull();
    expect(await AsyncStorage.getItem(getTeamDatasetKey(secondTeam.id))).toBeNull();
    expect(await AsyncStorage.getItem(TEAM_SCHEDULE_KEY)).toBeNull();
  });
});
