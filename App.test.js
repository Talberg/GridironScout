import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as DocumentPicker from 'expo-document-picker';
import App from './App';
import { APP_DATA_KEY, createEmptyAppData, serializeAppData } from './appDataStore';
import { createEmptyDriveChart } from './driveChartData';
import { TEAM_SCHEDULE_KEY } from './teamSchedule';

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        gridironCloudApiUrl: 'https://gridiron-proxy.run.app',
        googleWebClientId: 'web-client-id',
        googleIosClientId: 'ios-client-id',
        googleAndroidClientId: 'android-client-id',
      },
    },
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

const openSection = async (section) => {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Open team menu' }).props.disabled).toBeFalsy();
  });
  fireEvent.press(screen.getByRole('button', { name: 'Open team menu' }));
  fireEvent.press(screen.getByRole('button', { name: section }));
};

const setWindowWidth = (width) => {
  const metrics = { width, height: 800, scale: 1, fontScale: 1 };
  Dimensions.set({ window: metrics, screen: metrics });
};

beforeEach(() => {
  setWindowWidth(1024);
});

describe('Record Data', () => {
  beforeEach(async () => {
    Google.useIdTokenAuthRequest.mockReturnValue([null, null, jest.fn()]);
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('adds a new play to the dashboard and saves it locally', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Saved locally on this device')).toBeTruthy();
    });

    await openSection('Record Data');

    fireEvent.changeText(screen.getByPlaceholderText('e.g. 10 or G'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. OWN 25'), 'OWN 40');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Trips Right'), 'Trips Left');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Inside Zone'), 'Test Counter');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 5'), '3');
    fireEvent.press(screen.getByText('Save play'));

    expect(await screen.findByText('Play #55 recorded. It is saved locally with your playbook.'))
      .toBeTruthy();
    expect(screen.getByText('#55 · Test Counter')).toBeTruthy();
    expect(screen.getByText('50 valid plays in Updated playbook')).toBeTruthy();

    await openSection('Dashboard');
    expect(screen.getByText('Displaying 50 matching plays')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Saved locally on this device')).toBeTruthy();
    });

    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      const stored = storedApp.teams['team-default'].playbook;
      expect(stored.plays).toHaveLength(50);
      expect(stored.plays[49]).toMatchObject({
        clip: '55',
        formation: 'Trips Left',
        playFamily: 'Test Counter',
        playType: 'RUN',
        gain: 3,
      });
    });
  });

  it('starts in Local mode when a legacy preference has Cloud selected', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    const fetchMock = jest.spyOn(global, 'fetch');

    render(<App />);
    await openSection('Settings');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
      expect(screen.getByRole('button', { name: 'Cloud (Temporarily disabled)' }).props.accessibilityState.disabled).toBe(true);
    });
    expect(screen.queryByText('Cloud URL required')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(async () => {
      const savedData = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      expect(savedData.preferences.storageMode).toBe('local');
    });
  });

});

describe('Scouting tabs', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('switches between the tendency, quiz, call sheet, and snap log tabs', () => {
    render(<App />);

    fireEvent.press(screen.getByRole('tab', { name: 'Down & Distance' }));
    expect(screen.getByText('Down & Distance Tendencies & Alignment Keys')).toBeTruthy();
    expect(screen.getAllByText('2nd & Medium (M)').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByRole('tab', { name: 'Formations' }));
    expect(screen.getByText('Formations Tendencies & Alignment Keys')).toBeTruthy();
    expect(screen.getByText('Trips Right')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'DC Quiz Engine' }));
    expect(screen.getByText('Was the recorded call a run or pass?')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Beebe Call Sheet' }));
    expect(screen.getByText('Down-and-distance tendencies, grouped into a quick sideline reference.')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Snap Log' }));
    expect(screen.getByText('All imported and recorded scouting snaps.')).toBeTruthy();
  });

  it('uses a compact selector on small screens and switches the active view', () => {
    setWindowWidth(390);
    render(<App />);

    expect(screen.queryByRole('tab')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Choose scouting view, currently Formations' }));
    expect(screen.getByText('Choose a scouting view')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Show Down & Distance' }));

    expect(screen.getByText('Down & Distance Tendencies & Alignment Keys')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose scouting view, currently Down & Distance' })).toBeTruthy();
    expect(screen.queryByText('Choose a scouting view')).toBeNull();
  });

  it('keeps horizontal tabs on larger screens', () => {
    setWindowWidth(1024);
    render(<App />);

    expect(screen.getByRole('tab', { name: 'Formations' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Choose scouting view, currently Formations' })).toBeNull();
  });
});

describe('Drive Chart & Notes', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('charts a drive, records a note, calculates defensive results, and persists by schedule entry', async () => {
    render(<App />);

    await openSection('Drive Chart & Notes');
    expect(await screen.findByText('Drive-by-Drive Chart & Tactical Notes')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '＋ New Drive' }));
    fireEvent.press(screen.getByRole('button', { name: 'Select DOWN, currently Down 1' }));
    fireEvent.press(screen.getByRole('button', { name: 'Down 3' }));
    fireEvent.changeText(screen.getByLabelText('GAIN / RESULT (YDS)'), '2');
    fireEvent.press(screen.getByRole('button', { name: '＋ Save Snap' }));
    expect(screen.getByText('1 / 1 (100%)')).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText('Sideline note observation'),
      'Tight end motions before outside zone',
    );
    fireEvent.press(screen.getByRole('button', { name: '▣ Record Sideline Note' }));
    expect(screen.getByText('Tight end motions before outside zone')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Select DRIVE RESULT, currently Punt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Touchdown' }));
    fireEvent.press(screen.getByRole('button', { name: 'Finish Drive' }));
    expect(screen.getByText('7 PTS')).toBeTruthy();

    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await waitFor(async () => {
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      const saved = storedApp.teams['team-default'].driveChart;
      expect(saved.drives).toHaveLength(1);
      expect(saved.drives[0].result).toBe('Touchdown');
      expect(saved.drives[0].snaps[0]).toMatchObject({
        down: 3,
        gain: 2,
        playType: 'RUN',
      });
      expect(saved.notes[0].text).toBe('Tight end motions before outside zone');
    });

    await openSection('Dashboard');
    await openSection('Drive Chart & Notes');
    expect(await screen.findByText('Tight end motions before outside zone')).toBeTruthy();
    expect(screen.getByText('7 PTS')).toBeTruthy();
  });
});

describe('Team schedule', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    DocumentPicker.getDocumentAsync.mockReset();
  });

  it('imports a CSV into the selected week and keeps it locally when Cloud mode was active', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const selectedTeam = { id: 'schedule-week-4', name: 'River City', week: '4' };
    const otherWeek = { id: 'schedule-week-5', name: 'Lakeview', week: '5' };
    const initialAppData = createEmptyAppData();
    initialAppData.schedule = {
      teams: [selectedTeam, otherWeek],
      selectedTeamId: selectedTeam.id,
    };
    initialAppData.teams = Object.fromEntries(
      [selectedTeam, otherWeek].map((team) => [team.id, {
        playbook: null,
        driveChart: createEmptyDriveChart(),
      }]),
    );
    initialAppData.preferences = {
      cloudCsvUrl: 'https://example.com/shared.csv',
      storageMode: 'cloud',
    };
    await AsyncStorage.setItem(APP_DATA_KEY, serializeAppData(initialAppData));
    const fetchMock = jest.spyOn(global, 'fetch');

    const { unmount } = render(<App />);
    await waitFor(async () => {
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      expect(storedApp.preferences.storageMode).toBe('local');
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getAllByText('River City · Week 4').length).toBeGreaterThan(0);

    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        name: 'week-4-scouting.csv',
        uri: 'blob:week-4-scouting',
        file: {
          text: async () => [
            'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
            'week-4-1,2,6,OPP 35,Trips Left,Week Four Counter,RUN,8',
          ].join('\n'),
        },
      }],
    });
    fireEvent.press(screen.getByText('Import CSV'));
    fireEvent.press(screen.getByRole('button', {
      name: 'Select upload week, currently Week 4, River City',
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Choose Week 5, Lakeview' }));
    expect(screen.getByText('Week 5 · Lakeview')).toBeTruthy();
    fireEvent.press(screen.getByText('Choose CSV file'));

    await waitFor(() => {
      expect(screen.getByText('The CSV replaces this schedule entry’s playbook and is saved locally. Importing selects this week and Local mode.')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Import to this week'));

    await waitFor(async () => {
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      expect(storedApp.preferences.storageMode).toBe('local');
      const imported = storedApp.teams[otherWeek.id].playbook;
      expect(imported.name).toBe('week-4-scouting.csv');
      expect(imported.plays).toHaveLength(1);
      expect(imported.plays[0].playFamily).toBe('Week Four Counter');
      expect(storedApp.schedule.selectedTeamId).toBe(otherWeek.id);
    });
    expect(
      JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY)).teams[selectedTeam.id].playbook.plays,
    ).toHaveLength(0);
    expect(screen.getByText('Displaying 1 matching plays')).toBeTruthy();

    await openSection('Settings');
    expect(screen.getByText('Imported 1 plays to Lakeview (Week 5). Local mode selected.')).toBeTruthy();

    unmount();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Displaying 1 matching plays')).toBeTruthy();
      expect(screen.getAllByText('Week Four Counter').length).toBeGreaterThan(0);
    });
  });

  it('keeps a separate locally saved playbook for each schedule entry across restarts', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { unmount } = render(<App />);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(APP_DATA_KEY)).not.toBeNull();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open team menu' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add schedule entry' }));
    fireEvent.changeText(screen.getByLabelText('Team or opponent name'), 'Northside Hawks');
    fireEvent.changeText(screen.getByLabelText('Schedule week (optional)'), '3');
    fireEvent.press(screen.getByRole('button', { name: 'Save schedule entry' }));

    await waitFor(() => {
      expect(screen.getByText('Northside Hawks')).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Record Data' }));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 10 or G'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. OWN 25'), 'OWN 40');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Trips Right'), 'Trips Left');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Inside Zone'), 'Hawks Counter');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 5'), '4');
    fireEvent.press(screen.getByText('Save play'));

    let storedApp;
    await waitFor(async () => {
      storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      const hawks = storedApp.schedule.teams.find((team) => team.name === 'Northside Hawks');
      expect(hawks).toBeTruthy();
      const hawksPlaybook = storedApp.teams[hawks.id].playbook;
      expect(hawksPlaybook.plays).toHaveLength(1);
      expect(hawksPlaybook.plays[0].playFamily).toBe('Hawks Counter');
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open team menu' }));
    fireEvent.press(screen.getByRole('button', { name: 'Select schedule entry My Team' }));
    await openSection('Dashboard');
    await waitFor(() => {
      expect(screen.getByText('Displaying 49 matching plays')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open team menu' }));
    fireEvent.press(screen.getByRole('button', { name: 'Select schedule entry Northside Hawks' }));
    await waitFor(() => {
      expect(screen.getByText('Displaying 1 matching plays')).toBeTruthy();
    });

    unmount();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Displaying 1 matching plays')).toBeTruthy();
      expect(screen.getAllByText('Hawks Counter').length).toBeGreaterThan(0);
    });
    expect(storedApp.schedule.selectedTeamId).toBe(
      storedApp.schedule.teams.find((team) => team.name === 'Northside Hawks').id,
    );
  });
});

describe('Settings', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    Google.useIdTokenAuthRequest.mockReturnValue([null, null, jest.fn()]);
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('validates a JSON backup before replacing all locally stored app data', async () => {
    const backup = createEmptyAppData();
    backup.teams['team-default'].playbook = {
      plays: [{
        clip: 'backup-1',
        down: '1',
        distance: 10,
        yardline: 'OWN 35',
        fieldZone: 'Own Territory',
        formation: 'Trips Right',
        backSet: 'Gun',
        playFamily: 'Backup Counter',
        playType: 'RUN',
        gain: 6,
        resultCall: 'Backup Counter',
        downDistBucket: '1st & Long (L)',
      }],
      rowCount: 1,
      name: 'Backup playbook',
    };
    backup.teams['team-default'].driveChart.notes.push({
      id: 'backup-note',
      quarter: '1st Quarter',
      category: 'Other',
      text: 'Restored note',
      createdAt: '2026-10-14T12:00:00.000Z',
    });
    backup.preferences.cloudCsvUrl = 'https://example.com/backup.csv';
    backup.preferences.storageMode = 'cloud';
    const expectedBackup = {
      ...backup,
      preferences: { ...backup.preferences, storageMode: 'local' },
    };
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        name: 'backup.json',
        uri: 'blob:backup',
        file: { text: jest.fn().mockResolvedValue(serializeAppData(backup)) },
      }],
    });

    render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('No cloud CSV URL configured.')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Import JSON backup' }));
    expect(await screen.findByText('Replace app data?')).toBeTruthy();
    expect(screen.getByText(/replaces the current schedule, playbooks, drive charts/)).toBeTruthy();
    fireEvent.press(screen.getByText('Replace & restore'));

    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY))).toEqual(expectedBackup);
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
      expect(screen.getByText(
        'Restored backup.json. Schedule, playbooks, drive charts, notes, and preferences were imported with storage mode set to Local.',
      )).toBeTruthy();
    });
    expect(screen.getByDisplayValue('https://example.com/backup.csv')).toBeTruthy();
  });

  it('saves and restores the cloud CSV URL locally', async () => {
    const { unmount } = render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('No cloud CSV URL configured.')).toBeTruthy();
    });
    fireEvent.changeText(
      screen.getByLabelText('Google Drive file or Sheets URL'),
      'https://drive.google.com/file/d/example/view',
    );
    fireEvent.press(screen.getByText('Save cloud URL'));

    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      expect(storedApp.preferences.cloudCsvUrl)
        .toBe('https://drive.google.com/file/d/example/view');
      expect(storedApp.preferences.storageMode).toBe('local');
    });
    expect(screen.getByText(
      'Cloud CSV URL saved on this device. Cloud mode is temporarily disabled.',
    )).toBeTruthy();

    unmount();
    render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://drive.google.com/file/d/example/view')).toBeTruthy();
    });
  });

  it('recalculates down-and-distance buckets for saved playbooks', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('gridiron-scout.dataset.v1', JSON.stringify({
      plays: [{
        clip: 'legacy-1',
        down: '2',
        distance: '6',
        yardline: 'OWN 35',
        fieldZone: 'Own Territory',
        formation: 'Trips Right',
        backSet: 'Gun Pistol',
        playFamily: 'Legacy Play',
        playType: 'RUN',
        gain: 4,
        resultCall: 'Legacy Play',
        downDistBucket: '26',
      }],
      rowCount: 1,
      name: 'Legacy playbook',
    }));

    render(<App />);
    await openSection('Dashboard');
    fireEvent.press(screen.getByRole('tab', { name: 'Down & Distance' }));

    await waitFor(() => {
      expect(screen.getAllByText('2nd & Medium (M)').length).toBeGreaterThan(0);
    });
    await waitFor(async () => {
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      const saved = storedApp.teams['team-default'].playbook;
      expect(saved.plays[0].downDistBucket).toBe('2nd & Medium (M)');
      const schedule = storedApp.schedule;
      expect(schedule.teams[0].name).toBe('My Team');
      expect(schedule.selectedTeamId).toBe('team-default');
      expect(await AsyncStorage.getItem('gridiron-scout.dataset.v1')).toBeNull();
    });
  });

  it('keeps Cloud disabled while saving or clearing its URL', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Local mode selected. Play data saves on this device.')).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByLabelText('Google Drive file or Sheets URL'),
      'https://example.com/plays.csv',
    );
    fireEvent.press(screen.getByText('Save cloud URL'));
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV URL saved on this device. Cloud mode is temporarily disabled.')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Cloud (Temporarily disabled)' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Clear URL'));
    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      expect(storedApp.preferences.cloudCsvUrl).toBe('');
      expect(storedApp.preferences.storageMode).toBe('local');
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not open the Cloud URL prompt when the disabled option is pressed', async () => {
    render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Local mode selected. Play data saves on this device.')).toBeTruthy();
    });

    const cloudButton = screen.getByRole('button', { name: 'Cloud (Temporarily disabled)' });
    expect(cloudButton.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(cloudButton);
    expect(screen.queryByText('Cloud URL required')).toBeNull();
    expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
  });

  it('normalizes legacy Cloud preferences to Local and keeps the saved URL', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const cloudUrl = 'https://example.com/plays.csv';
    await AsyncStorage.setItem('gridiron-scout.cloud-csv-url.v1', cloudUrl);
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    const fetchMock = jest.spyOn(global, 'fetch');

    render(<App />);
    await openSection('Settings');
    await waitFor(async () => {
      const storedApp = JSON.parse(await AsyncStorage.getItem(APP_DATA_KEY));
      expect(storedApp.preferences).toMatchObject({
        cloudCsvUrl: cloudUrl,
        storageMode: 'local',
      });
    });
    expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not request a saved Sheets URL while Cloud mode is disabled', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(
      'gridiron-scout.cloud-csv-url.v1',
      'https://docs.google.com/spreadsheets/d/sheet-id/edit#gid=17',
    );
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => [
        'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
        'sheet-1,1,10,OWN 30,Trips Left,Sheet Counter,RUN,5',
      ].join('\n'),
    });

    render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not request a published Sheets URL while Cloud mode is disabled', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(
      'gridiron-scout.cloud-csv-url.v1',
      'https://docs.google.com/spreadsheets/d/e/published-sheet-id/pubhtml?gid=17&single=true',
    );
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => [
        'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
        'published-1,1,10,OWN 30,Trips Left,Published Counter,RUN,5',
      ].join('\n'),
    });

    render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not make a raw CSV request while Cloud mode is disabled', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(
      'gridiron-scout.cloud-csv-url.v1',
      'https://example.com/plays.csv',
    );
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);
    await openSection('Settings');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not request a private Drive URL while Cloud mode is disabled', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(
      'gridiron-scout.cloud-csv-url.v1',
      'https://drive.google.com/file/d/private-file-id/view',
    );
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    const fetchMock = jest.spyOn(global, 'fetch');

    render(<App />);
    await openSection('Settings');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
