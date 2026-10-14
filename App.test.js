import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as DocumentPicker from 'expo-document-picker';
import App from './App';
import { getTeamDatasetKey, TEAM_SCHEDULE_KEY } from './teamSchedule';

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

const openSection = (section) => {
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

    openSection('Record Data');

    fireEvent.changeText(screen.getByPlaceholderText('e.g. 10 or G'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. OWN 25'), 'OWN 40');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Trips Right'), 'Trips Left');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Inside Zone'), 'Test Counter');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 5'), '3');
    fireEvent.press(screen.getByText('Save play'));

    expect(screen.getByText('Play #55 recorded. It is saved locally with your playbook.')).toBeTruthy();
    expect(screen.getByText('#55 · Test Counter')).toBeTruthy();
    expect(screen.getByText('50 valid plays in Updated playbook')).toBeTruthy();

    openSection('Dashboard');
    expect(screen.getByText('Displaying 50 matching plays')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Saved locally on this device')).toBeTruthy();
    });

    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const stored = JSON.parse(await AsyncStorage.getItem('gridiron-scout.dataset.v1'));
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

  it('shows the URL prompt on startup when Cloud is saved without a URL', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Cloud URL required')).toBeTruthy();
      expect(screen.getByText(/No cloud CSV URL is saved/)).toBeTruthy();
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
    await AsyncStorage.setItem(TEAM_SCHEDULE_KEY, JSON.stringify({
      teams: [selectedTeam, otherWeek],
      selectedTeamId: selectedTeam.id,
    }));
    await AsyncStorage.setItem('gridiron-scout.cloud-csv-url.v1', 'https://example.com/shared.csv');
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => [
        'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
        'cloud-1,1,10,OWN 30,Trips Right,Cloud Play,RUN,5',
      ].join('\n'),
    });

    const { unmount } = render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Loaded 1 valid plays from the cloud CSV.')).toBeTruthy();
    });
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
      expect(await AsyncStorage.getItem('gridiron-scout.storage-mode.v1')).toBe('local');
      const imported = JSON.parse(await AsyncStorage.getItem(getTeamDatasetKey(otherWeek.id)));
      expect(imported.name).toBe('week-4-scouting.csv');
      expect(imported.plays).toHaveLength(1);
      expect(imported.plays[0].playFamily).toBe('Week Four Counter');
      const schedule = JSON.parse(await AsyncStorage.getItem(TEAM_SCHEDULE_KEY));
      expect(schedule.selectedTeamId).toBe(otherWeek.id);
    });
    expect(await AsyncStorage.getItem(getTeamDatasetKey(selectedTeam.id))).toBeNull();
    expect(screen.getByText('Displaying 1 matching plays')).toBeTruthy();

    openSection('Settings');
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
      expect(await AsyncStorage.getItem(TEAM_SCHEDULE_KEY)).not.toBeNull();
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

    let schedule;
    await waitFor(async () => {
      schedule = JSON.parse(await AsyncStorage.getItem(TEAM_SCHEDULE_KEY));
      const hawks = schedule.teams.find((team) => team.name === 'Northside Hawks');
      expect(hawks).toBeTruthy();
      const hawksPlaybook = JSON.parse(await AsyncStorage.getItem(getTeamDatasetKey(hawks.id)));
      expect(hawksPlaybook.plays).toHaveLength(1);
      expect(hawksPlaybook.plays[0].playFamily).toBe('Hawks Counter');
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open team menu' }));
    fireEvent.press(screen.getByRole('button', { name: 'Select schedule entry My Team' }));
    openSection('Dashboard');
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
    expect(schedule.selectedTeamId).toBe(
      schedule.teams.find((team) => team.name === 'Northside Hawks').id,
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

  it('saves and restores the cloud CSV URL locally', async () => {
    const { unmount } = render(<App />);
    openSection('Settings');
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
      expect(await AsyncStorage.getItem('gridiron-scout.cloud-csv-url.v1'))
        .toBe('https://drive.google.com/file/d/example/view');
    });
    expect(screen.getByText('Cloud CSV URL saved on this device. Select Cloud to load it.')).toBeTruthy();

    unmount();
    render(<App />);
    openSection('Settings');
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
    openSection('Dashboard');
    fireEvent.press(screen.getByRole('tab', { name: 'Down & Distance' }));

    await waitFor(() => {
      expect(screen.getAllByText('2nd & Medium (M)').length).toBeGreaterThan(0);
    });
    await waitFor(async () => {
      const saved = JSON.parse(await AsyncStorage.getItem('gridiron-scout.dataset.v1'));
      expect(saved.plays[0].downDistBucket).toBe('2nd & Medium (M)');
      const schedule = JSON.parse(await AsyncStorage.getItem(TEAM_SCHEDULE_KEY));
      expect(schedule.teams[0].name).toBe('My Team');
      const migrated = JSON.parse(await AsyncStorage.getItem(
        getTeamDatasetKey(schedule.selectedTeamId),
      ));
      expect(migrated.plays[0].downDistBucket).toBe('2nd & Medium (M)');
    });
  });

  it('clears the cloud URL and returns to the saved local playbook', async () => {
    const csv = [
      'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
      'cloud-only,1,10,OWN 30,Trips Left,Cloud Only,RUN,7',
    ].join('\n');
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => csv,
    });
    render(<App />);
    openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Local mode selected. Play data saves on this device.')).toBeTruthy();
    });
    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(await AsyncStorage.getItem('gridiron-scout.dataset.v1')).not.toBeNull();
    });

    fireEvent.changeText(
      screen.getByLabelText('Google Drive file or Sheets URL'),
      'https://example.com/plays.csv',
    );
    fireEvent.press(screen.getByText('Save cloud URL'));
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV URL saved on this device. Select Cloud to load it.')).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Cloud' }));
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV loaded: 1 valid plays.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Clear URL'));
    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(await AsyncStorage.getItem('gridiron-scout.cloud-csv-url.v1')).toBeNull();
      expect(await AsyncStorage.getItem('gridiron-scout.storage-mode.v1')).toBe('local');
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    });
    expect(screen.getByText('Cloud CSV URL cleared.')).toBeTruthy();
    expect(screen.queryByText('Cloud URL required')).toBeNull();
  });

  it('asks for a CSV URL before switching to Cloud when none is saved', async () => {
    render(<App />);
    openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Local mode selected. Play data saves on this device.')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Cloud' }));
    expect(screen.getByText('Cloud URL required')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Local' }).props.accessibilityState.selected).toBe(true);
    });
  });

  it('saves the URL entered in the prompt and loads the remote CSV', async () => {
    const csv = [
      'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
      'prompt-1,2,6,OPP 40,Trips Left,Prompt Counter,PASS,9',
    ].join('\n');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => csv,
    });
    render(<App />);
    openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Local mode selected. Play data saves on this device.')).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Cloud' }));
    fireEvent.changeText(
      screen.getByLabelText('Cloud CSV URL to load'),
      'https://example.com/prompt.csv',
    );
    fireEvent.press(screen.getByText('Save & load CSV'));

    await waitFor(() => {
      expect(screen.getByText('Cloud CSV loaded: 1 valid plays.')).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/prompt.csv');
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(await AsyncStorage.getItem('gridiron-scout.cloud-csv-url.v1'))
      .toBe('https://example.com/prompt.csv');
  });

  it('loads the CSV URL when Cloud is selected and restores local data when switched back', async () => {
    const csv = [
      'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
      'cloud-1,1,10,OWN 30,Trips Left,Test Draw,RUN,7',
    ].join('\n');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => csv,
    });
    render(<App />);
    openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Local mode selected. Play data saves on this device.')).toBeTruthy();
    });
    await waitFor(async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(await AsyncStorage.getItem('gridiron-scout.dataset.v1')).not.toBeNull();
    });
    fireEvent.changeText(
      screen.getByLabelText('Google Drive file or Sheets URL'),
      'https://example.com/cloud-playbook.csv',
    );
    fireEvent.press(screen.getByText('Save cloud URL'));
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV URL saved on this device. Select Cloud to load it.')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Cloud' }));
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV loaded: 1 valid plays.')).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/cloud-playbook.csv');
    expect(screen.getByText('Loaded 1 valid plays from the cloud CSV.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Local' }));
    await waitFor(() => {
      expect(screen.getByText('Local mode selected. Saved play data loaded from this device.')).toBeTruthy();
    });
    openSection('Dashboard');
    expect(screen.getByText('Displaying 49 matching plays')).toBeTruthy();
  });

  it('loads the configured cloud CSV when the app starts in Cloud mode', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('gridiron-scout.cloud-csv-url.v1', 'https://example.com/plays.csv');
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => [
        'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
        'remote-1,1,10,OWN 30,Trips Left,Cloud Counter,RUN,6',
      ].join('\n'),
    });

    render(<App />);
    openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV loaded: 1 valid plays.')).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/plays.csv');
    expect(screen.getByText('Loaded 1 valid plays from the cloud CSV.')).toBeTruthy();
  });

  it('converts a Google Sheets sharing URL to a CSV export URL', async () => {
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
    openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV loaded: 1 valid plays.')).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/sheet-id/export?format=csv&gid=17',
    );
  });

  it('keeps the published Google Sheets ID when converting a Publish to web URL', async () => {
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
    openSection('Settings');
    await waitFor(() => {
      expect(screen.getByText('Cloud CSV loaded: 1 valid plays.')).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/e/published-sheet-id/pub?gid=17&output=csv',
    );
  });

  it('explains likely CORS causes when a raw CSV request fails', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(
      'gridiron-scout.cloud-csv-url.v1',
      'https://example.com/plays.csv',
    );
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);
    openSection('Settings');

    await waitFor(() => {
      expect(screen.getAllByText(
        /Connection failed\. This CSV host may block browser access \(CORS\)/,
      ).length).toBeGreaterThan(0);
    });
  });

  it('loads a private Drive CSV through Cloud Run after Google sign-in', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(
      'gridiron-scout.cloud-csv-url.v1',
      'https://drive.google.com/file/d/private-file-id/view',
    );
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');
    Google.useIdTokenAuthRequest.mockReturnValue([
      {},
      { type: 'success', params: { id_token: 'signed-google-id-token' } },
      jest.fn(),
    ]);
    const csv = [
      'Clip,Down,Distance,Yardline,Formation,Play_Family,Play_Type,Gain',
      'private-1,1,10,OWN 35,Trips Left,Private Counter,RUN,6',
    ].join('\n');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => csv,
    });

    render(<App />);
    openSection('Settings');

    await waitFor(() => {
      expect(screen.getByText('Cloud CSV loaded: 1 valid plays.')).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gridiron-proxy.run.app/api/csv?fileId=private-file-id',
      { headers: { Authorization: 'Bearer signed-google-id-token' } },
    );
    expect(screen.getByText('Google account connected for this session.')).toBeTruthy();
  });

  it('requires sign-in before loading a private Drive CSV', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(
      'gridiron-scout.cloud-csv-url.v1',
      'https://drive.google.com/file/d/private-file-id/view',
    );
    await AsyncStorage.setItem('gridiron-scout.storage-mode.v1', 'cloud');

    render(<App />);
    openSection('Settings');

    await waitFor(() => {
      expect(screen.getAllByText('Sign in with Google to load the private Drive CSV.').length)
        .toBeGreaterThan(0);
    });
  });
});
