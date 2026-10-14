import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { fetchDriveCsvThroughProxy, getGoogleDriveFileId } from './cloudProxy';
import {
  getCsvDownloadUrl,
  isGoogleSheetsUrl,
  loadGoogleSheetsCsvWithJsonp,
} from './cloudCsv';
import {
  compareDownDistanceBuckets,
  getDownDistanceBucket,
  refreshDownDistanceBuckets,
} from './downDistance';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_FOOTBALL_DATA = `Clip,Down,Distance,Yardline,Field_Zone,Formation,Back_Set,Play_Family,Play_Type,Gain,Penalty
1,1,10,OWN 25,Backed Up,Trips Right,Gun Pistol,Inside Zone,RUN,4,NO
2,1,10,OWN 29,Backed Up,Trips Right,Gun Pistol,Duo,RUN,6,NO
3,2,4,OWN 35,Own Territory,2x2 Spread,Gun Offset Weak,Mesh Pass,PASS,8,NO
4,1,10,OWN 43,Own Territory,Bunch Right,Gun Pistol,Outside Zone,RUN,12,NO
5,1,10,OPP 45,Opp Territory,2x2 Spread,Gun Offset Strong,Four Verts,PASS,0,NO
6,2,10,OPP 45,Opp Territory,Trips Right,Gun Offset Weak,Quick Screen,PASS,5,NO
7,3,5,OPP 40,Opp Territory,Empty,Gun Empty,Levels Pass,PASS,9,NO
8,1,10,OPP 31,Opp Territory,Bunch Right,Gun Pistol,Power O,RUN,7,NO
9,2,3,OPP 24,Red Zone,I-Form,Under Center,Counter,RUN,4,NO
10,1,10,OPP 20,Red Zone,I-Form,Under Center,Power O,RUN,-1,NO
11,2,11,OPP 21,Red Zone,Trips Right,Gun Offset Weak,Sail Flood,PASS,14,NO
12,1,G,OPP 7,Goal to Go,Heavy Jumbo,Under Center,QB Sneak,RUN,1,NO
13,2,G,OPP 6,Goal to Go,Heavy Jumbo,Under Center,Inside Zone,RUN,6,NO
14,1,10,OWN 20,Backed Up,Trips Right,Gun Pistol,False Start,-,0,YES
15,1,15,OWN 15,Backed Up,2x2 Spread,Gun Offset Strong,Dagger Pass,PASS,16,NO
16,1,10,OWN 31,Own Territory,2x2 Spread,Gun Offset Weak,Inside Zone,RUN,3,NO
17,2,7,OWN 34,Own Territory,Bunch Right,Gun Pistol,Outside Zone,RUN,-2,NO
18,3,9,OWN 32,Own Territory,Empty,Gun Empty,Drive Concept,PASS,11,NO
19,1,10,OWN 43,Own Territory,Trips Right,Gun Pistol,Power O,RUN,2,NO
20,2,8,OWN 45,Own Territory,Trips Right,Gun Offset Weak,Mesh Pass,PASS,7,NO
21,3,1,OPP 48,Opp Territory,I-Form,Under Center,FB Dive,RUN,3,NO
22,1,10,OPP 45,Opp Territory,Bunch Right,Gun Pistol,Bootleg Action,PASS,18,NO
23,1,10,OPP 27,Red Zone,2x2 Spread,Gun Offset Strong,Inside Zone,RUN,5,NO
24,2,5,OPP 22,Red Zone,Trips Right,Gun Offset Weak,Holding,-,0,YES
25,2,15,OPP 32,Opp Territory,2x2 Spread,Gun Empty,Four Verts,PASS,0,NO
26,3,15,OPP 32,Opp Territory,Empty,Gun Empty,Screens,PASS,8,NO
27,1,10,OWN 10,Backed Up,Heavy Jumbo,Under Center,Inside Zone,RUN,2,NO
28,2,8,OWN 12,Backed Up,Trips Right,Gun Offset Strong,Outside Zone,RUN,5,NO
29,3,3,OWN 17,Backed Up,2x2 Spread,Gun Pistol,Stick Concept,PASS,6,NO
30,1,10,OWN 23,Backed Up,Bunch Right,Gun Offset Weak,Duo,RUN,3,NO
31,2,7,OWN 26,Backed Up,Bunch Right,Gun Offset Weak,Pass Interference Def,PASS,15,YES
32,2,7,OWN 26,Backed Up,Bunch Right,Gun Offset Weak,Inside Zone,RUN,4,NO
33,3,3,OWN 30,Backed Up,2x2 Spread,Gun Offset Strong,Quick Slants,PASS,5,NO
34,1,10,OWN 35,Own Territory,Trips Right,Gun Pistol,Inside Zone,RUN,3,NO
35,2,7,OWN 38,Own Territory,Trips Right,Gun Pistol,Counter,RUN,11,NO
36,1,10,OWN 49,Own Territory,2x2 Spread,Gun Offset Strong,Shallow Cross,PASS,7,NO
37,2,3,OPP 44,Opp Territory,Bunch Right,Gun Offset Weak,Power O,RUN,8,NO
38,1,10,OPP 36,Opp Territory,I-Form,Under Center,Play Action Post,PASS,22,NO
39,1,10,OPP 14,Red Zone,Trips Right,Gun Pistol,Inside Zone,RUN,5,NO
40,2,5,OPP 9,Red Zone,I-Form,Under Center,Power O,RUN,9,NO
41,1,10,OWN 20,Backed Up,2x2 Spread,Gun Pistol,Outside Zone,RUN,3,NO
42,2,7,OWN 23,Backed Up,2x2 Spread,Gun Offset Strong,Dagger Pass,PASS,0,NO
43,3,7,OWN 23,Backed Up,Empty,Gun Empty,Four Verts,PASS,12,NO
44,1,10,OWN 35,Own Territory,Trips Right,Gun Pistol,Duo,RUN,4,NO
45,2,6,OWN 39,Own Territory,Bunch Right,Gun Offset Weak,Mesh Pass,PASS,9,NO
46,1,10,OWN 48,Own Territory,2x2 Spread,Gun Offset Strong,Inside Zone,RUN,2,NO
47,2,8,50,Opp Territory,Bunch Right,Gun Pistol,Bootleg Action,PASS,15,NO
48,1,10,OPP 35,Opp Territory,Trips Right,Gun Pistol,Inside Zone,RUN,8,NO
49,2,2,OPP 27,Red Zone,I-Form,Under Center,Duo,RUN,3,NO
50,1,10,OPP 24,Red Zone,Trips Right,Gun Offset Weak,Sail Flood,PASS,12,NO
51,1,10,OPP 12,Red Zone,Heavy Jumbo,Under Center,Power O,RUN,7,NO
52,2,3,OPP 5,Goal to Go,Heavy Jumbo,Under Center,Inside Zone,RUN,5,NO
53,,,,,,,,,
54,1,10,OWN 25,Backed Up,Trips Right,Gun Pistol,Roughing Passer,PASS,15,YES`;

const theme = {
  bg: '#020817',
  panel: '#0f172a',
  panel2: '#111827',
  border: '#1e293b',
  text: '#e2e8f0',
  muted: '#94a3b8',
  emerald: '#34d399',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  rose: '#fb7185',
  indigo: '#818cf8',
  purple: '#a78bfa',
  red: '#f87171',
  green: '#4ade80',
  white: '#ffffff',
};
const LOCAL_DATA_KEY = 'gridiron-scout.dataset.v1';
const LOCAL_CSV_URL_KEY = 'gridiron-scout.cloud-csv-url.v1';
const STORAGE_MODE_KEY = 'gridiron-scout.storage-mode.v1';

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = content.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV must include a header row and at least one play.');

  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error('Every column needs a header.');
  return rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
}

function parseGain(gain) {
  const cleaned = String(gain ?? '')
    .trim()
    .replace(/,/g, '')
    .replace(/^\$/, '')
    .replace(/(?:yds?|yards?)$/i, '')
    .trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function normalizePlayRecord(record) {
  const normalizedColumns = Object.keys(record).reduce((columns, key) => {
    columns[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = record[key];
    return columns;
  }, {});

  const getValue = (...keys) => {
    for (const key of keys) {
      const direct = normalizedColumns[key.toLowerCase().replace(/[^a-z0-9]/g, '')];
      if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
        return String(direct).trim();
      }
    }
    return '';
  };

  const clip = getValue('clip', 'play #', 'play number', 'playno', 'snap', 'id', 'num');
  const down = getValue('down', 'dn', 'dwn');
  const distance = getValue('distance', 'dist', 'yards to go', 'togo', 'ydstogo');
  const yardline = getValue('yardline', 'los', 'field position', 'ball on', 'field pos');
  let fieldZone = getValue('field zone', 'zone', 'field area');
  const formation = getValue('formation', 'form', 'offensive formation');
  const backSet = getValue('back set', 'backfield', 'rb set', 'set') || 'Unknown';
  const playFamily = getValue('play family', 'family', 'concept', 'scheme', 'play call', 'play');
  const playType = getValue('play type', 'type', 'run pass');
  const gain = getValue('gain', 'yards gained', 'yards', 'gain loss');
  const penalty = getValue('penalty', 'pen', 'is penalty', 'pen flag').toUpperCase();
  const resultCall = getValue('result', 'play name', 'call', 'description', 'notes');

  if (!down || !distance || !yardline || !formation || !playFamily) {
    return null;
  }

  const downNumber = Number(down);
  const distanceNumber = distance.toUpperCase() === 'G' ? 1 : Number(distance);
  const gainValue = gain ? parseGain(gain) : 0;
  const penaltyFlag = ['YES', 'TRUE', '1'].includes(penalty);
  const normalizedPlayType = playType.toUpperCase();

  if (
    !Number.isInteger(downNumber) ||
    downNumber < 1 ||
    downNumber > 4 ||
    !Number.isFinite(distanceNumber) ||
    distanceNumber <= 0 ||
    gainValue === null ||
    !['RUN', 'PASS'].includes(normalizedPlayType) ||
    penaltyFlag
  ) {
    return null;
  }

  if (!fieldZone) {
    const yardlineMatch = yardline.toUpperCase().match(/^(OWN|OPP)\s*(\d{1,2})$/);
    if (yardlineMatch) {
      const side = yardlineMatch[1];
      const yards = Number(yardlineMatch[2]);
      fieldZone = side === 'OWN' && yards <= 20
        ? 'Backed Up'
        : side === 'OPP' && yards <= 10
          ? 'Goal to Go'
          : side === 'OPP' && yards <= 20
            ? 'Red Zone'
            : side === 'OPP' || (side === 'OWN' && yards >= 50)
              ? 'Opp Territory'
              : 'Own Territory';
    } else if (/^(50|50\.0)$/.test(yardline)) {
      fieldZone = 'Opp Territory';
    } else {
      fieldZone = 'Unknown';
    }
  }

  return {
    clip: clip || 'n/a',
    down,
    distance,
    yardline,
    fieldZone,
    formation,
    backSet,
    playFamily,
    playType: normalizedPlayType,
    gain: gainValue,
    resultCall: resultCall || playFamily,
    downDistBucket: getDownDistanceBucket(down, distance),
  };
}

function buildDataset(text) {
  const parsed = parseCsv(text);
  const cleaned = [];
  let penalties = 0;
  parsed.forEach((record) => {
    const normalized = normalizePlayRecord(record);
    if (normalized) {
      cleaned.push(normalized);
    } else if (['penalty', 'pen', 'ispenalty', 'penflag'].some((key) => (
      ['YES', 'TRUE', '1'].includes(
        String(Object.entries(record).find(([column]) => column.toLowerCase().replace(/[^a-z0-9]/g, '') === key)?.[1] ?? '').toUpperCase(),
      )
    ))) {
      penalties += 1;
    }
  });
  return { plays: cleaned, rowCount: parsed.length, penalties, rejected: parsed.length - cleaned.length };
}

function cloudCsvLoadError(error, sourceUrl) {
  const detail = error.message || 'The CSV could not be read.';
  if (/^(The authenticated Drive proxy|Sign in with Google|Google sign-in|This Google account|Enter a valid Cloud Run)/i.test(detail)) {
    return detail;
  }
  if (/failed to fetch|network request failed|load failed/i.test(detail)) {
    if (/drive\.google\.com/i.test(sourceUrl)) {
      return 'Could not reach the authenticated Drive proxy. Confirm its Cloud Run URL and allowed app origin.';
    }
    return 'Connection failed. This CSV host may block browser access (CORS). Use a publicly published Google Sheets URL or a CSV host that allows cross-origin requests.';
  }
  return `Could not load cloud CSV: ${detail} Confirm the link serves a CSV and that the file is shared for access.`;
}

function isStoredPlaybook(value) {
  return Array.isArray(value?.plays) && value.plays.every((play) => (
    play &&
    typeof play.clip === 'string' &&
    typeof play.downDistBucket === 'string' &&
    typeof play.gain === 'number'
  ));
}

function compactNumber(value) {
  return Number(value).toLocaleString();
}

function formatPct(part, total) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function StatCard({ label, value, sublabel, accent = '#fff' }) {
  return (
    <View style={[styles.statCard, { borderColor: theme.border }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statSub}>{sublabel}</Text>
    </View>
  );
}

function RecordField({ label, value, onChangeText, placeholder, keyboardType = 'default', style }) {
  return (
    <View style={[styles.recordField, style]}>
      <Text style={styles.recordFieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType}
        style={styles.recordInput}
      />
    </View>
  );
}

function FilterSelect({ label, value, options, onPress }) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity style={styles.filterButton} onPress={onPress}>
        <Text style={styles.filterValue}>{value}</Text>
        <Text style={styles.filterChevron}>▾</Text>
      </TouchableOpacity>
    </View>
  );
}

function DropdownModal({ visible, title, options, selectedValue, onClose, onSelect }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            <TouchableOpacity
              style={[styles.modalItem, selectedValue === 'ALL' && styles.modalItemActive]}
              onPress={() => { onSelect('ALL'); onClose(); }}
            >
              <Text style={styles.modalItemText}>All</Text>
            </TouchableOpacity>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.modalItem, selectedValue === option && styles.modalItemActive]}
                onPress={() => { onSelect(option); onClose(); }}
              >
                <Text style={styles.modalItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildHierarchy(plays) {
  const hierarchy = {};

  plays.forEach((play) => {
    const d = play.downDistBucket;
    const z = play.fieldZone;
    const f = play.formation;
    const b = play.backSet;
    const fam = play.playFamily;

    if (!hierarchy[d]) hierarchy[d] = { count: 0, runs: 0, passes: 0, totalGain: 0, zones: {} };
    hierarchy[d].count += 1;
    hierarchy[d].totalGain += play.gain;
    if (play.playType === 'RUN') hierarchy[d].runs += 1; else hierarchy[d].passes += 1;

    if (!hierarchy[d].zones[z]) hierarchy[d].zones[z] = { count: 0, runs: 0, passes: 0, totalGain: 0, formations: {} };
    hierarchy[d].zones[z].count += 1;
    hierarchy[d].zones[z].totalGain += play.gain;
    if (play.playType === 'RUN') hierarchy[d].zones[z].runs += 1; else hierarchy[d].zones[z].passes += 1;

    if (!hierarchy[d].zones[z].formations[f]) hierarchy[d].zones[z].formations[f] = { count: 0, runs: 0, passes: 0, totalGain: 0, backSets: {} };
    hierarchy[d].zones[z].formations[f].count += 1;
    hierarchy[d].zones[z].formations[f].totalGain += play.gain;
    if (play.playType === 'RUN') hierarchy[d].zones[z].formations[f].runs += 1; else hierarchy[d].zones[z].formations[f].passes += 1;

    if (!hierarchy[d].zones[z].formations[f].backSets[b]) hierarchy[d].zones[z].formations[f].backSets[b] = { count: 0, runs: 0, passes: 0, totalGain: 0, families: {} };
    hierarchy[d].zones[z].formations[f].backSets[b].count += 1;
    hierarchy[d].zones[z].formations[f].backSets[b].totalGain += play.gain;
    if (play.playType === 'RUN') hierarchy[d].zones[z].formations[f].backSets[b].runs += 1; else hierarchy[d].zones[z].formations[f].backSets[b].passes += 1;

    if (!hierarchy[d].zones[z].formations[f].backSets[b].families[fam]) hierarchy[d].zones[z].formations[f].backSets[b].families[fam] = { count: 0, runs: 0, passes: 0, totalGain: 0, clips: [] };
    hierarchy[d].zones[z].formations[f].backSets[b].families[fam].count += 1;
    hierarchy[d].zones[z].formations[f].backSets[b].families[fam].totalGain += play.gain;
    hierarchy[d].zones[z].formations[f].backSets[b].families[fam].clips.push(play);
    if (play.playType === 'RUN') hierarchy[d].zones[z].formations[f].backSets[b].families[fam].runs += 1; else hierarchy[d].zones[z].formations[f].backSets[b].families[fam].passes += 1;
  });

  return hierarchy;
}

function HierarchyTree({ plays }) {
  const hierarchy = useMemo(() => buildHierarchy(plays), [plays]);
  const totalFiltered = plays.length;

  if (!plays.length) {
    return <Text style={styles.emptyText}>No matching plays</Text>;
  }

  return (
    <View style={styles.hierarchyList}>
      {Object.keys(hierarchy)
        .sort(compareDownDistanceBuckets)
        .map((downLabel) => {
          const level = hierarchy[downLabel];
          const avgGain = (level.totalGain / level.count).toFixed(1);
          return (
            <View key={downLabel} style={styles.hierarchyCard}>
              <View style={styles.hierarchyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.levelBadge}><Text style={styles.levelBadgeText}>1</Text></View>
                  <Text style={styles.hierarchyTitle}>{downLabel}</Text>
                  <View style={styles.pill}><Text style={styles.pillText}>{level.count} plays ({formatPct(level.count, totalFiltered)})</Text></View>
                </View>
                <Text style={styles.metaText}>Avg {avgGain} yds</Text>
              </View>

              <View style={styles.nestedList}>
                {Object.keys(level.zones)
                  .sort()
                  .map((zone) => {
                    const zoneData = level.zones[zone];
                    return (
                      <View key={`${downLabel}-${zone}`} style={styles.zoneBlock}>
                        <Text style={styles.zoneTitle}>↳ Zone: {zone} ({zoneData.count} plays • {formatPct(zoneData.count, level.count)})</Text>
                        <View style={styles.formationsGrid}>
                          {Object.keys(zoneData.formations)
                            .sort()
                            .map((formation) => {
                              const formationData = zoneData.formations[formation];
                              return (
                                <View key={`${downLabel}-${zone}-${formation}`} style={styles.formationCard}>
                                  <Text style={styles.formationTitle}>{formation}</Text>
                                  <Text style={styles.formationMeta}>{formationData.count} plays • {formatPct(formationData.count, zoneData.count)}</Text>
                                  {Object.keys(formationData.backSets).map((backSet) => {
                                    const backSetData = formationData.backSets[backSet];
                                    return (
                                      <View key={`${downLabel}-${zone}-${formation}-${backSet}`} style={styles.backSetBlock}>
                                        <Text style={styles.backSetTitle}>{backSet}</Text>
                                        {Object.keys(backSetData.families).map((family) => {
                                          const familyData = backSetData.families[family];
                                          return (
                                            <View key={`${downLabel}-${zone}-${formation}-${backSet}-${family}`} style={styles.familyRow}>
                                              <Text style={styles.familyName}>{family}</Text>
                                              <Text style={styles.familyMeta}>{familyData.count} clips</Text>
                                            </View>
                                          );
                                        })}
                                      </View>
                                    );
                                  })}
                                </View>
                              );
                            })}
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          );
        })}
    </View>
  );
}

export default function App() {
  const appConfig = Constants.expoConfig?.extra || {};
  const googleWebClientId = appConfig.googleWebClientId || '';
  const googleIosClientId = appConfig.googleIosClientId || '';
  const googleAndroidClientId = appConfig.googleAndroidClientId || '';
  const gridironCloudApiUrl = appConfig.gridironCloudApiUrl || '';
  const platformGoogleClientId = Platform.OS === 'ios'
    ? googleIosClientId
    : Platform.OS === 'android'
      ? googleAndroidClientId
      : googleWebClientId;
  const googleClientIdConfigured = Boolean(platformGoogleClientId);
  const [googleRequest, googleAuthResponse, promptGoogleSignIn] = Google.useIdTokenAuthRequest({
    clientId: platformGoogleClientId || 'google-client-id-not-configured',
    webClientId: googleWebClientId || undefined,
    iosClientId: googleIosClientId || undefined,
    androidClientId: googleAndroidClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });
  const sampleData = useMemo(() => buildDataset(DEFAULT_FOOTBALL_DATA), []);
  const [dataset, setDataset] = useState(sampleData.plays);
  const [rawRowCount, setRawRowCount] = useState(sampleData.rowCount);
  const [datasetName, setDatasetName] = useState('Sample dataset');
  const [storageReady, setStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const [storageMode, setStorageMode] = useState('local');
  const [storageModeMessage, setStorageModeMessage] = useState('Loading storage preference…');
  const [cloudCsvUrl, setCloudCsvUrl] = useState('');
  const [cloudCsvUrlInput, setCloudCsvUrlInput] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('Loading settings…');
  const [cloudLoadMessage, setCloudLoadMessage] = useState('Cloud CSV has not been loaded.');
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudRefreshKey, setCloudRefreshKey] = useState(0);
  const [cloudUrlPromptVisible, setCloudUrlPromptVisible] = useState(false);
  const [cloudUrlDraft, setCloudUrlDraft] = useState('');
  const [cloudUrlPromptError, setCloudUrlPromptError] = useState('');
  const [cloudUrlSaving, setCloudUrlSaving] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState('');
  const [googleAuthMessage, setGoogleAuthMessage] = useState('');
  const uniqueDownDist = [
    'ALL',
    ...Array.from(new Set(dataset.map((p) => p.downDistBucket))).sort(compareDownDistanceBuckets),
  ];
  const uniqueZones = ['ALL', ...Array.from(new Set(dataset.map((p) => p.fieldZone))).sort()];
  const uniqueFormations = ['ALL', ...Array.from(new Set(dataset.map((p) => p.formation))).sort()];
  const uniqueBackSets = ['ALL', ...Array.from(new Set(dataset.map((p) => p.backSet))).sort()];
  const uniqueFamilies = ['ALL', ...Array.from(new Set(dataset.map((p) => p.playFamily))).sort()];

  const [filters, setFilters] = useState({
    downDist: 'ALL',
    fieldZone: 'ALL',
    formation: 'ALL',
    backSet: 'ALL',
    playFamily: 'ALL',
    query: '',
  });

  const [modalConfig, setModalConfig] = useState(null);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadPreview, setUploadPreview] = useState(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [recordForm, setRecordForm] = useState({
    clip: '',
    down: '1',
    distance: '',
    yardline: '',
    fieldZone: '',
    formation: '',
    backSet: '',
    playFamily: '',
    playType: 'RUN',
    gain: '',
    resultCall: '',
  });
  const [recordMessage, setRecordMessage] = useState('');

  useEffect(() => {
    if (!googleAuthResponse) return;
    if (googleAuthResponse.type === 'success') {
      const idToken = googleAuthResponse.params?.id_token
        || googleAuthResponse.authentication?.idToken;
      if (idToken) {
        setGoogleIdToken(idToken);
        setGoogleAuthMessage('Google account connected for this session.');
      } else {
        setGoogleAuthMessage('Google sign-in did not return an ID token. Check the OAuth client configuration.');
      }
    } else if (googleAuthResponse.type === 'error') {
      setGoogleAuthMessage(
        googleAuthResponse.error?.message || 'Google sign-in failed. Check the OAuth client configuration.',
      );
    }
  }, [googleAuthResponse]);

  useEffect(() => {
    let active = true;
    const restoreCloudCsvUrl = async () => {
      try {
        const [savedUrl, savedMode] = await Promise.all([
          AsyncStorage.getItem(LOCAL_CSV_URL_KEY),
          AsyncStorage.getItem(STORAGE_MODE_KEY),
        ]);
        if (!active) return;
        setCloudCsvUrl(savedUrl || '');
        setCloudCsvUrlInput(savedUrl || '');
        setSettingsMessage(savedUrl ? 'Cloud CSV URL saved on this device.' : 'No cloud CSV URL configured.');
        const mode = savedMode === 'cloud' ? 'cloud' : 'local';
        setStorageMode(mode);
        setStorageModeMessage(mode === 'cloud'
          ? 'Cloud mode selected. Loading the saved CSV…'
          : 'Local mode selected. Play data saves on this device.');
      } catch (error) {
        if (active) setSettingsMessage(`Could not load settings: ${error.message}`);
        if (active) setStorageModeMessage(`Could not load storage preference: ${error.message}`);
      } finally {
        if (active) setSettingsReady(true);
      }
    };
    restoreCloudCsvUrl();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const restoreLocalData = async () => {
      try {
        const [savedValue, savedMode] = await Promise.all([
          AsyncStorage.getItem(LOCAL_DATA_KEY),
          AsyncStorage.getItem(STORAGE_MODE_KEY),
        ]);
        if (!active) return;
        if (savedMode === 'cloud') {
          setStorageMessage('Cloud mode is active. Fetching the configured CSV…');
          return;
        }
        if (savedValue) {
          const saved = JSON.parse(savedValue);
          if (isStoredPlaybook(saved)) {
            setDataset(refreshDownDistanceBuckets(saved.plays));
            setRawRowCount(Number.isInteger(saved.rowCount) ? saved.rowCount : saved.plays.length);
            setDatasetName(typeof saved.name === 'string' ? saved.name : 'Saved dataset');
          } else {
            setStorageMessage('Saved data could not be read. The sample dataset is loaded.');
          }
        }
      } catch (error) {
        if (active) setStorageMessage(`Could not load saved data: ${error.message}`);
      } finally {
        if (active) setStorageReady(true);
      }
    };
    restoreLocalData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsReady || !storageReady || storageMode !== 'cloud') return undefined;
    if (!cloudCsvUrl.trim()) {
      setCloudUrlDraft('');
      setCloudUrlPromptError('');
      setCloudUrlPromptVisible(true);
      return undefined;
    }

    let active = true;
    const loadCloudCsv = async () => {
      setCloudLoading(true);
      const sourceUrl = cloudCsvUrl.trim();
      const driveFileId = getGoogleDriveFileId(sourceUrl);
      setCloudLoadMessage(driveFileId
        ? 'Loading private CSV through the authenticated proxy…'
        : isGoogleSheetsUrl(sourceUrl)
          ? 'Loading CSV from Google Sheets…'
          : 'Loading cloud CSV…');
      setStorageModeMessage('Cloud mode selected. Loading CSV from the saved URL…');
      try {
        let csvText;
        if (driveFileId) {
          csvText = await fetchDriveCsvThroughProxy({
            apiUrl: gridironCloudApiUrl,
            fileUrl: sourceUrl,
            idToken: googleIdToken,
          });
        } else if (Platform.OS === 'web' && isGoogleSheetsUrl(sourceUrl)) {
          csvText = await loadGoogleSheetsCsvWithJsonp(sourceUrl);
        } else {
          const response = await fetch(getCsvDownloadUrl(sourceUrl));
          if (!response.ok) {
            throw new Error(`The CSV request failed with HTTP ${response.status}.`);
          }
          csvText = await response.text();
        }
        const parsed = buildDataset(csvText);
        if (parsed.plays.length === 0) {
          throw new Error('No valid plays were found. Check that the link serves a CSV with the required play columns.');
        }
        if (!active) return;
        setDataset(parsed.plays);
        setRawRowCount(parsed.rowCount);
        setDatasetName('Cloud CSV');
        setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });
        setCloudLoadMessage(`Loaded ${compactNumber(parsed.plays.length)} valid plays from the cloud CSV.`);
        setStorageModeMessage(`Cloud CSV loaded: ${compactNumber(parsed.plays.length)} valid plays.`);
        setSettingsMessage('Cloud CSV loaded successfully.');
      } catch (error) {
        if (!active) return;
        const message = cloudCsvLoadError(error, cloudCsvUrl.trim());
        setCloudLoadMessage(message);
        setStorageModeMessage('Cloud CSV could not be loaded. Your current play data has been left unchanged.');
        setSettingsMessage(message);
      } finally {
        if (active) setCloudLoading(false);
      }
    };
    loadCloudCsv();
    return () => {
      active = false;
    };
  }, [cloudCsvUrl, cloudRefreshKey, gridironCloudApiUrl, googleIdToken, settingsReady, storageMode]);

  useEffect(() => {
    if (!storageReady || storageMode !== 'local') return undefined;
    let active = true;
    const persistLocalData = async () => {
      try {
        await AsyncStorage.setItem(LOCAL_DATA_KEY, JSON.stringify({
          plays: dataset,
          rowCount: rawRowCount,
          name: datasetName,
        }));
        if (active) setStorageMessage('Saved locally on this device');
      } catch (error) {
        if (active) setStorageMessage(`Could not save data locally: ${error.message}`);
      }
    };
    persistLocalData();
    return () => {
      active = false;
    };
  }, [dataset, datasetName, rawRowCount, storageMode, storageReady]);

  const chooseCsvFile = async () => {
    setUploadError('');
    setUploadPreview(null);
    setUploadBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) {
        throw new Error('The selected file could not be accessed. Please choose the CSV again.');
      }

      let csvText;
      if (file.file && typeof file.file.text === 'function') {
        csvText = await file.file.text();
      } else if (/^(blob:|https?:)/i.test(file.uri)) {
        const response = await fetch(file.uri);
        if (!response.ok) {
          throw new Error(`Could not read the selected file (HTTP ${response.status}).`);
        }
        csvText = await response.text();
      } else {
        csvText = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const parsed = buildDataset(csvText);
      if (!parsed.plays.length) {
        throw new Error(
          'No valid plays were found in this file. Choose a CSV with Down, Distance, Yardline, Formation, Play_Family, and Play_Type columns.',
        );
      }
      setUploadPreview({ ...parsed, name: file.name || 'Imported CSV' });
    } catch (error) {
      setUploadError(error.message || 'Could not read this CSV file.');
    } finally {
      setUploadBusy(false);
    }
  };

  const useImportedDataset = () => {
    if (!uploadPreview?.plays.length) return;
    setDataset(uploadPreview.plays);
    setRawRowCount(uploadPreview.rowCount);
    setDatasetName(uploadPreview.name);
    setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });
    setUploadVisible(false);
    setUploadPreview(null);
    setUploadError('');
  };

  const loadSampleDataset = () => {
    setDataset(sampleData.plays);
    setRawRowCount(sampleData.rowCount);
    setDatasetName('Sample dataset');
    setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });
  };

  const clearDataset = () => {
    setDataset([]);
    setRawRowCount(0);
    setDatasetName('No dataset');
    setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });
    setClearConfirmVisible(false);
  };

  const addRecordedPlay = () => {
    const play = normalizePlayRecord({
      Clip: recordForm.clip.trim() || String(rawRowCount + 1),
      Down: recordForm.down,
      Distance: recordForm.distance.trim(),
      Yardline: recordForm.yardline.trim(),
      Field_Zone: recordForm.fieldZone.trim(),
      Formation: recordForm.formation.trim(),
      Back_Set: recordForm.backSet.trim(),
      Play_Family: recordForm.playFamily.trim(),
      Play_Type: recordForm.playType,
      Gain: recordForm.gain.trim(),
      Result: recordForm.resultCall.trim(),
      Penalty: 'NO',
    });

    if (!play) {
      setRecordMessage('Check the required fields and values. Down must be 1–4, distance must be a number or G, and play type must be RUN or PASS.');
      return;
    }

    setDataset((current) => [...current, play]);
    setRawRowCount((count) => count + 1);
    setDatasetName('Updated playbook');
    setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });
    setRecordForm({
      clip: '',
      down: '1',
      distance: '',
      yardline: '',
      fieldZone: '',
      formation: '',
      backSet: '',
      playFamily: '',
      playType: 'RUN',
      gain: '',
      resultCall: '',
    });
    setRecordMessage(storageMode === 'cloud'
      ? `Play #${play.clip} added as a temporary local edit. It is not saved or written to the cloud CSV.`
      : `Play #${play.clip} recorded. It is saved locally with your playbook.`);
  };

  const filteredPlays = useMemo(() => {
    return dataset.filter((play) => {
      if (filters.downDist !== 'ALL' && play.downDistBucket !== filters.downDist) return false;
      if (filters.fieldZone !== 'ALL' && play.fieldZone !== filters.fieldZone) return false;
      if (filters.formation !== 'ALL' && play.formation !== filters.formation) return false;
      if (filters.backSet !== 'ALL' && play.backSet !== filters.backSet) return false;
      if (filters.playFamily !== 'ALL' && play.playFamily !== filters.playFamily) return false;
      if (filters.query) {
        const haystack = `${play.clip} ${play.downDistBucket} ${play.fieldZone} ${play.formation} ${play.backSet} ${play.playFamily} ${play.resultCall}`.toLowerCase();
        if (!haystack.includes(filters.query.toLowerCase())) return false;
      }
      return true;
    });
  }, [dataset, filters]);

  const totalPlays = filteredPlays.length;
  const runCount = filteredPlays.filter((p) => p.playType === 'RUN').length;
  const passCount = filteredPlays.filter((p) => p.playType === 'PASS').length;
  const avgGain = totalPlays ? (filteredPlays.reduce((sum, p) => sum + p.gain, 0) / totalPlays).toFixed(1) : '0.0';

  const formationCounts = filteredPlays.reduce((map, play) => {
    map[play.formation] = (map[play.formation] || 0) + 1;
    return map;
  }, {});

  const topFormation = Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0];

  const familyCounts = filteredPlays.reduce((map, play) => {
    map[play.playFamily] = (map[play.playFamily] || 0) + 1;
    return map;
  }, {});

  const topFamily = Object.entries(familyCounts).sort((a, b) => b[1] - a[1])[0];

  const resetFilters = () => setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });

  const selectStorageMode = async (mode) => {
    if (mode === 'cloud' && !cloudCsvUrl.trim()) {
      setCloudUrlDraft('');
      setCloudUrlPromptError('');
      setCloudUrlPromptVisible(true);
      return;
    }

    try {
      let localPlaybook = null;
      if (mode === 'local') {
        const savedValue = await AsyncStorage.getItem(LOCAL_DATA_KEY);
        if (savedValue) {
          const saved = JSON.parse(savedValue);
          if (isStoredPlaybook(saved)) {
            localPlaybook = saved;
          } else {
            throw new Error('Saved local play data is invalid.');
          }
        }
      }
      await AsyncStorage.setItem(STORAGE_MODE_KEY, mode);
      setStorageMode(mode);
      if (mode === 'cloud') {
        setStorageModeMessage('Cloud mode selected. Loading CSV from the saved URL…');
      } else if (localPlaybook) {
        setDataset(refreshDownDistanceBuckets(localPlaybook.plays));
        setRawRowCount(Number.isInteger(localPlaybook.rowCount) ? localPlaybook.rowCount : localPlaybook.plays.length);
        setDatasetName(typeof localPlaybook.name === 'string' ? localPlaybook.name : 'Saved dataset');
        setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });
        setStorageModeMessage('Local mode selected. Saved play data loaded from this device.');
      } else {
        setDataset(sampleData.plays);
        setRawRowCount(sampleData.rowCount);
        setDatasetName('Sample dataset');
        setFilters({ downDist: 'ALL', fieldZone: 'ALL', formation: 'ALL', backSet: 'ALL', playFamily: 'ALL', query: '' });
        setStorageModeMessage('Local mode selected. Sample play data loaded; no local playbook was saved yet.');
      }
      if (mode === 'local') setCloudLoading(false);
    } catch (error) {
      setStorageModeMessage(`Could not save storage preference: ${error.message}`);
    }
  };

  const validateCloudCsvUrl = (value) => {
    try {
      const parsedUrl = new URL(value.trim());
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return 'Enter a valid Google Drive, Sheets or CSV URL beginning with http:// or https://.';
      }
      return '';
    } catch {
      return 'Enter a valid Google Drive, Sheets or CSV URL beginning with http:// or https://.';
    }
  };

  const saveCloudCsvUrl = async () => {
    const trimmedUrl = cloudCsvUrlInput.trim();
    const validationError = trimmedUrl ? validateCloudCsvUrl(trimmedUrl) : '';
    if (validationError) {
      setSettingsMessage(validationError);
      return;
    }

    try {
      if (trimmedUrl) {
        await AsyncStorage.setItem(LOCAL_CSV_URL_KEY, trimmedUrl);
        setCloudCsvUrl(trimmedUrl);
        setCloudCsvUrlInput(trimmedUrl);
        setSettingsMessage(storageMode === 'cloud'
          ? 'Cloud CSV URL saved. Loading the latest data…'
          : 'Cloud CSV URL saved on this device. Select Cloud to load it.');
          if (storageMode === 'cloud') setCloudRefreshKey((key) => key + 1);
      } else {
        await AsyncStorage.removeItem(LOCAL_CSV_URL_KEY);
        setSettingsMessage('Cloud CSV URL removed.');
        setCloudCsvUrl('');
        setCloudCsvUrlInput('');
      }
    } catch (error) {
      setSettingsMessage(`Could not save the cloud CSV URL: ${error.message}`);
    }
  };

  const clearCloudCsvUrl = async () => {
    try {
      await AsyncStorage.removeItem(LOCAL_CSV_URL_KEY);
      setCloudCsvUrl('');
      setCloudCsvUrlInput('');
      if (storageMode === 'cloud') {
        await selectStorageMode('local');
      }
      setSettingsMessage('Cloud CSV URL cleared.');
    } catch (error) {
      setSettingsMessage(`Could not clear the cloud CSV URL: ${error.message}`);
    }
  };

  const saveCloudUrlAndLoad = async () => {
    const trimmedUrl = cloudUrlDraft.trim();
    const validationError = validateCloudCsvUrl(trimmedUrl);
    if (validationError) {
      setCloudUrlPromptError(validationError);
      return;
    }

    setCloudUrlSaving(true);
    setCloudUrlPromptError('');
    try {
      await Promise.all([
        AsyncStorage.setItem(LOCAL_CSV_URL_KEY, trimmedUrl),
        AsyncStorage.setItem(STORAGE_MODE_KEY, 'cloud'),
      ]);
      setCloudCsvUrl(trimmedUrl);
      setCloudCsvUrlInput(trimmedUrl);
      setStorageMode('cloud');
      setCloudUrlPromptVisible(false);
      setSettingsMessage('Cloud CSV URL saved. Loading the latest data…');
    } catch (error) {
      setCloudUrlPromptError(`Could not save the cloud URL: ${error.message}`);
    } finally {
      setCloudUrlSaving(false);
    }
  };

  const startGoogleSignIn = async () => {
    setGoogleAuthMessage('');
    try {
      await promptGoogleSignIn();
    } catch (error) {
      setGoogleAuthMessage(`Google sign-in failed: ${error.message}`);
    }
  };

  const signOutOfCloud = () => {
    setGoogleIdToken('');
    setGoogleAuthMessage('Signed out of private Cloud access.');
  };

  const cancelCloudUrlPrompt = () => {
    setCloudUrlPromptVisible(false);
    if (storageMode === 'cloud') {
      selectStorageMode('local');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}><Text style={styles.logoText}>◎</Text></View>
          <View>
            <Text style={styles.headerTitle}>Gridiron Scout</Text>
            <Text style={styles.headerSubtitle}>Tendency Engine</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => { setUploadError(''); setUploadVisible(true); }}>
            <Text style={styles.actionText}>Import CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={loadSampleDataset}>
            <Text style={styles.primaryText}>Load Sample</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.clearDataButton, dataset.length === 0 && styles.clearDataButtonDisabled]}
            onPress={() => setClearConfirmVisible(true)}
            disabled={dataset.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Clear all play data"
          >
            <Text style={[styles.clearDataText, dataset.length === 0 && styles.clearDataTextDisabled]}>Clear Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navItem, activeSection === 'dashboard' && styles.navItemActive]}
          onPress={() => setActiveSection('dashboard')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeSection === 'dashboard' }}
        >
          <Text style={[styles.navItemText, activeSection === 'dashboard' && styles.navItemTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeSection === 'record' && styles.navItemActive]}
          onPress={() => { setActiveSection('record'); setRecordMessage(''); }}
          accessibilityRole="button"
          accessibilityState={{ selected: activeSection === 'record' }}
        >
          <Text style={[styles.navItemText, activeSection === 'record' && styles.navItemTextActive]}>Record Data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeSection === 'settings' && styles.navItemActive]}
          onPress={() => setActiveSection('settings')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeSection === 'settings' }}
        >
          <Text style={[styles.navItemText, activeSection === 'settings' && styles.navItemTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'dashboard' ? (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Clips Ingested" value={compactNumber(rawRowCount)} sublabel={datasetName} accent={theme.text} />
          <StatCard label="Valid Scout Snaps" value={compactNumber(dataset.length)} sublabel="Penalties & blanks excluded" accent={theme.emerald} />
          <StatCard label="Run / Pass Ratio" value={`${runCount} / ${passCount}`} sublabel="Overall balance" accent={theme.cyan} />
          <StatCard label="Avg Gain / Play" value={`${avgGain} yds`} sublabel="Filtered clips" accent={theme.amber} />
          <StatCard label="Top Formation" value={topFormation ? topFormation[0] : '-'} sublabel={topFormation ? `${formatPct(topFormation[1], totalPlays)} frequency` : '0% frequency'} accent={theme.indigo} />
          <StatCard label="Top Play Family" value={topFamily ? topFamily[0] : '-'} sublabel={topFamily ? `${formatPct(topFamily[1], totalPlays)} frequency` : '0% frequency'} accent={theme.rose} />
        </View>

        <View style={styles.filterPanel}>
          <Text style={styles.storageMessage}>
            {storageMode === 'cloud' ? cloudLoadMessage : storageMessage || 'Saving data locally…'}
          </Text>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Hierarchical Drilldown Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchPlaceholder}>⌕</Text>
              <TextInput
                value={filters.query}
                onChangeText={(text) => setFilters((prev) => ({ ...prev, query: text }))}
                placeholder="Search play, tag, call..."
                placeholderTextColor={theme.muted}
                style={styles.searchInput}
              />
            </View>
          </View>

          <Text style={styles.downDistanceHint}>
            Short (S): 1–3 yds · Medium (M): 4–6 yds · Long (L): 7+ yds
          </Text>
          <View style={styles.filtersGrid}>
            <FilterSelect label="1. Down & Distance" value={filters.downDist === 'ALL' ? 'All Downs & Distances' : filters.downDist} options={uniqueDownDist} onPress={() => setModalConfig({ title: 'Down & Distance', options: uniqueDownDist, selectedValue: filters.downDist, keyName: 'downDist', onSelect: (value) => setFilters((prev) => ({ ...prev, downDist: value })) })} />
            <FilterSelect label="2. Field Zone" value={filters.fieldZone === 'ALL' ? 'All Field Zones' : filters.fieldZone} options={uniqueZones} onPress={() => setModalConfig({ title: 'Field Zone', options: uniqueZones, selectedValue: filters.fieldZone, keyName: 'fieldZone', onSelect: (value) => setFilters((prev) => ({ ...prev, fieldZone: value })) })} />
            <FilterSelect label="3. Formation" value={filters.formation === 'ALL' ? 'All Formations' : filters.formation} options={uniqueFormations} onPress={() => setModalConfig({ title: 'Formation', options: uniqueFormations, selectedValue: filters.formation, keyName: 'formation', onSelect: (value) => setFilters((prev) => ({ ...prev, formation: value })) })} />
            <FilterSelect label="4. Back Set" value={filters.backSet === 'ALL' ? 'All Back Sets' : filters.backSet} options={uniqueBackSets} onPress={() => setModalConfig({ title: 'Back Set', options: uniqueBackSets, selectedValue: filters.backSet, keyName: 'backSet', onSelect: (value) => setFilters((prev) => ({ ...prev, backSet: value })) })} />
            <FilterSelect label="5. Play Family" value={filters.playFamily === 'ALL' ? 'All Play Families' : filters.playFamily} options={uniqueFamilies} onPress={() => setModalConfig({ title: 'Play Family', options: uniqueFamilies, selectedValue: filters.playFamily, keyName: 'playFamily', onSelect: (value) => setFilters((prev) => ({ ...prev, playFamily: value })) })} />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Tendency Tree</Text>
            <Text style={styles.panelMeta}>Displaying {compactNumber(totalPlays)} matching plays</Text>
          </View>
          <HierarchyTree plays={filteredPlays} />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Flat Analytics View</Text>
            <Text style={styles.panelMeta}>Filtered results</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableWrap}>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                {['Clip #', 'Down & Dist', 'Field Zone / Yardline', 'Formation', 'Back Set', 'Play Family', 'Result / Type', 'Gain'].map((head) => (
                  <Text key={head} style={styles.tableHeader}>{head}</Text>
                ))}
              </View>
              {filteredPlays.map((play) => (
                <View key={`${play.clip}-${play.resultCall}`} style={styles.tableRow}>
                  <Text style={styles.cell}>{play.clip}</Text>
                  <Text style={styles.cell}>{play.downDistBucket}</Text>
                  <Text style={styles.cell}>{play.fieldZone} / {play.yardline}</Text>
                  <Text style={styles.cell}>{play.formation}</Text>
                  <Text style={styles.cell}>{play.backSet}</Text>
                  <Text style={styles.cell}>{play.playFamily}</Text>
                  <Text style={styles.cell}>{play.resultCall} / {play.playType}</Text>
                  <Text style={[styles.cell, styles.gainCell]}>{play.gain}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
      ) : activeSection === 'record' ? (
        <ScrollView contentContainerStyle={styles.recordScreenContent} keyboardShouldPersistTaps="handled">
          <View style={styles.recordIntro}>
            <Text style={styles.recordTitle}>Record a play</Text>
            <Text style={styles.recordDescription}>
              Enter a scout snap below. Saved entries are added to the dashboard and stored locally on this device.
            </Text>
            <Text style={styles.recordCount}>{compactNumber(dataset.length)} valid plays in {datasetName}</Text>
          </View>

          <View style={styles.recordCard}>
            <Text style={styles.recordSectionTitle}>Play situation</Text>
            <View style={styles.recordFieldsRow}>
              <RecordField
                label="Clip # (optional)"
                value={recordForm.clip}
                onChangeText={(clip) => setRecordForm((form) => ({ ...form, clip }))}
                placeholder={`Auto: ${rawRowCount + 1}`}
                style={styles.recordHalfField}
              />
              <View style={styles.recordHalfField}>
                <Text style={styles.recordFieldLabel}>Down</Text>
                <View style={styles.segmentRow}>
                  {['1', '2', '3', '4'].map((down) => (
                    <TouchableOpacity
                      key={down}
                      style={[styles.segmentButton, recordForm.down === down && styles.segmentButtonActive]}
                      onPress={() => setRecordForm((form) => ({ ...form, down }))}
                    >
                      <Text style={[styles.segmentText, recordForm.down === down && styles.segmentTextActive]}>{down}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.recordFieldsRow}>
              <RecordField
                label="Distance *"
                value={recordForm.distance}
                onChangeText={(distance) => setRecordForm((form) => ({ ...form, distance }))}
                placeholder="e.g. 10 or G"
                style={styles.recordHalfField}
              />
              <RecordField
                label="Yardline *"
                value={recordForm.yardline}
                onChangeText={(yardline) => setRecordForm((form) => ({ ...form, yardline }))}
                placeholder="e.g. OWN 25"
                style={styles.recordHalfField}
              />
            </View>
            <RecordField
              label="Field zone (optional)"
              value={recordForm.fieldZone}
              onChangeText={(fieldZone) => setRecordForm((form) => ({ ...form, fieldZone }))}
              placeholder="Auto-detected from yardline if blank"
            />
          </View>

          <View style={styles.recordCard}>
            <Text style={styles.recordSectionTitle}>Play call</Text>
            <RecordField
              label="Formation *"
              value={recordForm.formation}
              onChangeText={(formation) => setRecordForm((form) => ({ ...form, formation }))}
              placeholder="e.g. Trips Right"
            />
            <RecordField
              label="Back set (optional)"
              value={recordForm.backSet}
              onChangeText={(backSet) => setRecordForm((form) => ({ ...form, backSet }))}
              placeholder="e.g. Gun Pistol"
            />
            <RecordField
              label="Play family *"
              value={recordForm.playFamily}
              onChangeText={(playFamily) => setRecordForm((form) => ({ ...form, playFamily }))}
              placeholder="e.g. Inside Zone"
            />
            <View style={styles.recordFieldsRow}>
              <View style={styles.recordHalfField}>
                <Text style={styles.recordFieldLabel}>Play type *</Text>
                <View style={styles.segmentRow}>
                  {['RUN', 'PASS'].map((playType) => (
                    <TouchableOpacity
                      key={playType}
                      style={[styles.segmentButton, recordForm.playType === playType && styles.segmentButtonActive]}
                      onPress={() => setRecordForm((form) => ({ ...form, playType }))}
                    >
                      <Text style={[styles.segmentText, recordForm.playType === playType && styles.segmentTextActive]}>{playType}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <RecordField
                label="Gain in yards"
                value={recordForm.gain}
                onChangeText={(gain) => setRecordForm((form) => ({ ...form, gain }))}
                placeholder="e.g. 5"
                keyboardType="numeric"
                style={styles.recordHalfField}
              />
            </View>
            <RecordField
              label="Result / call (optional)"
              value={recordForm.resultCall}
              onChangeText={(resultCall) => setRecordForm((form) => ({ ...form, resultCall }))}
              placeholder="Defaults to play family"
            />
            {recordMessage ? (
              <Text style={recordMessage.startsWith('Play #') ? styles.recordSuccess : styles.recordError}>
                {recordMessage}
              </Text>
            ) : null}
            <TouchableOpacity style={styles.recordSubmitButton} onPress={addRecordedPlay}>
              <Text style={styles.recordSubmitText}>Save play</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recordCard}>
            <View style={styles.recordListHeader}>
              <Text style={styles.recordSectionTitle}>Recent plays</Text>
              <Text style={styles.recordCount}>{dataset.length}</Text>
            </View>
            {dataset.length === 0 ? (
              <Text style={styles.recordDescription}>No plays yet. Add one above or import a CSV.</Text>
            ) : (
              dataset.slice(-5).reverse().map((play, index) => (
                <View key={`${play.clip}-${index}`} style={styles.recentPlayRow}>
                  <View style={styles.recentPlayMain}>
                    <Text style={styles.recentPlayTitle}>#{play.clip} · {play.playFamily}</Text>
                    <Text style={styles.recentPlayMeta}>{play.downDistBucket} · {play.formation} · {play.yardline}</Text>
                  </View>
                  <Text style={styles.recentPlayGain}>{play.gain} yds</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.settingsContent} keyboardShouldPersistTaps="handled">
          <View style={styles.recordIntro}>
            <Text style={styles.recordTitle}>Settings</Text>
            <Text style={styles.recordDescription}>
              Choose a playbook source. Cloud mode loads the CSV from your saved URL.
            </Text>
          </View>

          <View style={styles.recordCard}>
            <Text style={styles.recordSectionTitle}>Data storage</Text>
            <Text style={styles.recordDescription}>
              Choose where you intend to keep your playbook.
            </Text>
            <View style={styles.storageModeOptions}>
              {[
                { value: 'local', label: 'Local' },
                { value: 'cloud', label: 'Cloud' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.storageModeButton,
                    storageMode === option.value && styles.storageModeButtonActive,
                  ]}
                  onPress={() => selectStorageMode(option.value)}
                  disabled={!settingsReady || !storageReady}
                  accessibilityRole="button"
                  accessibilityState={{ selected: storageMode === option.value, disabled: !settingsReady || !storageReady }}
                >
                  <Text style={[
                    styles.storageModeText,
                    storageMode === option.value && styles.storageModeTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingsStatus} accessibilityLiveRegion="polite">
              {storageModeMessage}
            </Text>
            {storageMode === 'cloud' && (
              <TouchableOpacity
                style={[styles.actionButton, cloudLoading && styles.settingsButtonDisabled]}
                onPress={() => setCloudRefreshKey((key) => key + 1)}
                disabled={cloudLoading || !cloudCsvUrl.trim()}
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>{cloudLoading ? 'Loading cloud CSV…' : 'Reload cloud CSV'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.recordCard}>
            <Text style={styles.recordSectionTitle}>Cloud CSV</Text>
            <Text style={styles.recordDescription}>
              Drive CSV files load through the authenticated Cloud Run proxy. Published Google Sheets can still be loaded publicly without the proxy.
            </Text>
            <View style={styles.recordField}>
              <Text style={styles.recordFieldLabel}>GOOGLE DRIVE FILE OR SHEETS URL</Text>
              <TextInput
                value={cloudCsvUrlInput}
                onChangeText={setCloudCsvUrlInput}
                placeholder="https://drive.google.com/file/d/..."
                placeholderTextColor={theme.muted}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.recordInput}
                accessibilityLabel="Google Drive file or Sheets URL"
              />
            </View>
            <Text style={styles.settingsNote}>
              Private Drive access requires an authenticated Cloud Run proxy configured for this build and a Google account on its allowlist. Published Sheets remain public. Cloud mode is read-only; app changes are not uploaded.
            </Text>
            <Text style={styles.recordFieldLabel}>PRIVATE DRIVE ACCESS</Text>
            {!googleIdToken ? (
              <TouchableOpacity
                style={[
                  styles.recordSubmitButton,
                  (!googleClientIdConfigured || !googleRequest) && styles.settingsButtonDisabled,
                ]}
                onPress={startGoogleSignIn}
                disabled={!googleClientIdConfigured || !googleRequest}
                accessibilityRole="button"
              >
                <Text style={styles.recordSubmitText}>Sign in with Google</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.clearUrlButton}
                onPress={signOutOfCloud}
                accessibilityRole="button"
              >
                <Text style={styles.clearUrlButtonText}>Sign out of Google</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.settingsStatus} accessibilityLiveRegion="polite">
              {googleAuthMessage || (googleClientIdConfigured
                ? 'Google sign-in is required to load a private Drive CSV.'
                : 'Google sign-in is not configured in this app build.')}
            </Text>
            <Text style={styles.settingsStatus} accessibilityLiveRegion="polite">
              {settingsMessage}
            </Text>
            {storageMode === 'cloud' && (
              <Text style={styles.settingsStatus} accessibilityLiveRegion="polite">
                {cloudLoadMessage}
              </Text>
            )}
            <View style={styles.settingsUrlActions}>
              <TouchableOpacity
                style={[styles.recordSubmitButton, styles.settingsUrlAction, !settingsReady && styles.settingsButtonDisabled]}
                onPress={saveCloudCsvUrl}
                disabled={!settingsReady}
                accessibilityRole="button"
              >
                <Text style={styles.recordSubmitText}>Save cloud URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.clearUrlButton, styles.settingsUrlAction, !settingsReady && styles.settingsButtonDisabled]}
                onPress={clearCloudCsvUrl}
                disabled={!settingsReady}
                accessibilityRole="button"
              >
                <Text style={styles.clearUrlButtonText}>Clear URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      <DropdownModal
        visible={Boolean(modalConfig)}
        title={modalConfig?.title ?? ''}
        options={modalConfig?.options ?? []}
        selectedValue={modalConfig?.selectedValue ?? 'ALL'}
        onClose={() => setModalConfig(null)}
        onSelect={(value) => {
          modalConfig?.onSelect(value);
          setModalConfig(null);
        }}
      />
      <Modal
        visible={clearConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClearConfirmVisible(false)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setClearConfirmVisible(false)}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Clear all play data?</Text>
            <Text style={styles.confirmDescription}>
              This removes the current dataset from the dashboard and local storage. This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setClearConfirmVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmClearButton} onPress={clearDataset}>
                <Text style={styles.confirmClearText}>Clear Data</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={cloudUrlPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelCloudUrlPrompt}
      >
        <Pressable style={styles.confirmOverlay} onPress={cancelCloudUrlPrompt}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Cloud URL required</Text>
            <Text style={styles.confirmDescription}>
              No cloud CSV URL is saved. Paste a Drive CSV file URL to load it through the authenticated proxy, or a published Google Sheets URL for public access.
            </Text>
            <TextInput
              value={cloudUrlDraft}
              onChangeText={setCloudUrlDraft}
              placeholder="https://drive.google.com/file/d/..."
              placeholderTextColor={theme.muted}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.recordInput, styles.cloudUrlPromptInput]}
              accessibilityLabel="Cloud CSV URL to load"
            />
            {!!cloudUrlPromptError && <Text style={styles.recordError}>{cloudUrlPromptError}</Text>}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelCloudUrlPrompt}
                disabled={cloudUrlSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordSubmitButton, styles.cloudUrlSaveButton, cloudUrlSaving && styles.settingsButtonDisabled]}
                onPress={saveCloudUrlAndLoad}
                disabled={cloudUrlSaving}
              >
                <Text style={styles.recordSubmitText}>{cloudUrlSaving ? 'Saving…' : 'Save & load CSV'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={uploadVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUploadVisible(false)}
      >
        <SafeAreaView style={styles.uploadScreen}>
          <View style={styles.uploadHeader}>
            <TouchableOpacity onPress={() => setUploadVisible(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.uploadTitle}>Import player data</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.uploadContent}>
            <View style={styles.uploadHero}>
              <View style={styles.uploadIcon}><Text style={styles.uploadIconText}>↑</Text></View>
              <Text style={styles.uploadHeading}>Bring your scouting data</Text>
              <Text style={styles.uploadDescription}>
                Choose a CSV from your device. Your imported playbook replaces the current view and is saved locally on this device.
              </Text>
              <TouchableOpacity style={styles.pickFileButton} onPress={chooseCsvFile} disabled={uploadBusy}>
                <Text style={styles.pickFileText}>{uploadBusy ? 'Reading CSV…' : 'Choose CSV file'}</Text>
              </TouchableOpacity>
              {!!uploadError && <Text style={styles.uploadError}>{uploadError}</Text>}
            </View>

            <View style={styles.uploadCard}>
              <Text style={styles.uploadSectionTitle}>CSV format</Text>
              <Text style={styles.uploadDescription}>
                Include these columns. Header names are flexible: spaces, underscores, and capitalization are accepted.
              </Text>
              <View style={styles.requiredColumns}>
                {['Down', 'Distance', 'Yardline', 'Formation', 'Play_Family', 'Play_Type'].map((column) => (
                  <View key={column} style={styles.columnChip}><Text style={styles.columnChipText}>{column}</Text></View>
                ))}
              </View>
              <Text style={styles.optionalColumns}>
                Optional: Clip, Field_Zone, Back_Set, Gain, Penalty, Result. Missing field zones are inferred from the yardline; missing back sets are marked Unknown. Penalty plays are excluded.
              </Text>
            </View>

            {uploadPreview && (
              <View style={styles.uploadCard}>
                <Text style={styles.uploadSectionTitle}>Import preview</Text>
                <Text style={styles.previewFilename}>{uploadPreview.name}</Text>
                <Text style={styles.previewSummary}>
                  {uploadPreview.plays.length} valid plays from {uploadPreview.rowCount} rows
                </Text>
                {uploadPreview.rejected > 0 && (
                  <Text style={styles.previewWarning}>
                    {uploadPreview.rejected} rows excluded ({uploadPreview.penalties} penalties; remaining rows missing or containing invalid values).
                  </Text>
                )}
                <View style={styles.previewList}>
                  {uploadPreview.plays.slice(0, 4).map((play, index) => (
                    <Text key={`${play.clip}-${index}`} style={styles.previewItem}>
                      #{play.clip}  ·  {play.downDistBucket}  ·  {play.formation}  ·  {play.playFamily}  ·  {play.playType}
                    </Text>
                  ))}
                  {uploadPreview.plays.length > 4 && (
                    <Text style={styles.previewMore}>and {uploadPreview.plays.length - 4} more plays</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.pickFileButton} onPress={useImportedDataset}>
                  <Text style={styles.pickFileText}>Use this dataset</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cloudUrlPromptInput: { marginTop: 14 },
  cloudUrlSaveButton: { flex: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { color: theme.emerald, fontSize: 18 },
  headerTitle: { color: theme.white, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: theme.muted, fontSize: 11 },
  headerButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, alignItems: 'center' },
  actionButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: { color: theme.text, fontSize: 12, fontWeight: '600' },
  primaryButton: {
    backgroundColor: theme.emerald,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryText: { color: '#03150f', fontSize: 12, fontWeight: '700' },
  clearDataButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearDataButtonDisabled: { opacity: 0.45 },
  clearDataText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  clearDataTextDisabled: { color: '#94a3b8' },
  navigation: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#0b1220',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  navItem: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  navItemActive: { backgroundColor: 'rgba(52, 211, 153, 0.14)' },
  navItemText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  navItemTextActive: { color: theme.emerald },
  content: { padding: 16, gap: 18 },
  recordScreenContent: { padding: 16, gap: 14 },
  settingsContent: { padding: 16, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  storageModeOptions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  storageModeButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
  },
  storageModeButtonActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: theme.emerald,
  },
  storageModeText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  storageModeTextActive: { color: theme.emerald },
  recordIntro: { paddingVertical: 4 },
  recordTitle: { color: theme.white, fontSize: 22, fontWeight: '800' },
  recordDescription: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  recordCount: { color: theme.emerald, fontSize: 11, fontWeight: '700', marginTop: 8 },
  recordCard: {
    padding: 16,
    gap: 13,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
  },
  recordSectionTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  recordFieldsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  recordHalfField: { flex: 1, minWidth: 170 },
  recordField: { gap: 6 },
  recordFieldLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  recordInput: {
    color: theme.text,
    fontSize: 13,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    minHeight: 40,
  },
  settingsNote: { color: theme.muted, fontSize: 11, lineHeight: 17 },
  settingsStatus: { color: theme.cyan, fontSize: 12, lineHeight: 18 },
  settingsButtonDisabled: { opacity: 0.55 },
  settingsUrlActions: { flexDirection: 'row', gap: 10 },
  settingsUrlAction: { flex: 1 },
  clearUrlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    borderRadius: 10,
  },
  clearUrlButtonText: { color: '#fca5a5', fontSize: 13, fontWeight: '800' },
  segmentRow: { flexDirection: 'row', gap: 7 },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 10,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 9,
  },
  segmentButtonActive: { backgroundColor: 'rgba(52, 211, 153, 0.14)', borderColor: theme.emerald },
  segmentText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: theme.emerald },
  recordSuccess: { color: theme.emerald, fontSize: 12, lineHeight: 18 },
  recordError: { color: theme.red, fontSize: 12, lineHeight: 18 },
  recordSubmitButton: { alignItems: 'center', paddingVertical: 13, backgroundColor: theme.emerald, borderRadius: 10 },
  recordSubmitText: { color: '#03150f', fontSize: 13, fontWeight: '800' },
  recordListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentPlayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  recentPlayMain: { flex: 1, gap: 4 },
  recentPlayTitle: { color: theme.text, fontSize: 12, fontWeight: '700' },
  recentPlayMeta: { color: theme.muted, fontSize: 10 },
  recentPlayGain: { color: theme.amber, fontSize: 11, fontWeight: '700', marginLeft: 10 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderRadius: 14,
    minWidth: '30%',
    flex: 1,
    minHeight: 98,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  statValue: { marginTop: 8, fontSize: 25, fontWeight: '900' },
  statSub: { color: '#64748b', fontSize: 10, marginTop: 4 },
  filterPanel: {
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  filterTitle: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  resetText: { color: '#94a3b8', fontSize: 12 },
  searchRow: { marginTop: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#020817',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchPlaceholder: { color: '#94a3b8', fontSize: 18 },
  searchInput: { flex: 1, color: theme.text, fontSize: 13, marginLeft: 8 },
  filtersGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  filterBlock: { minWidth: '18%', flex: 1 },
  filterLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  filterButton: {
    backgroundColor: '#020817',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterValue: { color: theme.text, fontSize: 12 },
  filterChevron: { color: '#94a3b8', fontSize: 14 },
  downDistanceHint: { color: theme.muted, fontSize: 10, marginTop: 12 },
  panel: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 18, backgroundColor: '#0b1220', overflow: 'hidden' },
  panelHeader: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#1e293b' },
  panelTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 14 },
  panelMeta: { color: '#94a3b8', fontSize: 11 },
  storageMessage: { color: '#64748b', fontSize: 10, marginBottom: 10 },
  hierarchyList: { padding: 16, gap: 14 },
  hierarchyCard: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, overflow: 'hidden', backgroundColor: '#0f172a' },
  hierarchyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', borderBottomWidth: 1, borderColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 10 },
  levelBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeText: { color: theme.emerald, fontSize: 10, fontWeight: '900' },
  hierarchyTitle: { color: theme.white, fontSize: 14, fontWeight: '700' },
  pill: { backgroundColor: 'rgba(52, 211, 153, 0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { color: theme.emerald, fontSize: 10, fontWeight: '700' },
  metaText: { color: '#fbbf24', fontSize: 11 },
  nestedList: { padding: 12, gap: 10 },
  zoneBlock: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: 'rgba(52, 211, 153, 0.35)', gap: 8 },
  zoneTitle: { color: '#dbeafe', fontSize: 12, fontWeight: '700' },
  formationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  formationCard: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1e293b', borderRadius: 10, padding: 10, minWidth: 150, flex: 1 },
  formationTitle: { color: '#f1f5f9', fontSize: 12, fontWeight: '700' },
  formationMeta: { color: '#94a3b8', fontSize: 10, marginTop: 4 },
  backSetBlock: { marginTop: 8, gap: 4 },
  backSetTitle: { color: '#d1d5db', fontSize: 11, fontWeight: '700' },
  familyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  familyName: { color: '#e2e8f0', fontSize: 11 },
  familyMeta: { color: '#94a3b8', fontSize: 10 },
  emptyText: { color: '#94a3b8', fontSize: 12, padding: 20, textAlign: 'center' },
  tableWrap: { padding: 12 },
  table: { minWidth: 1000 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#020817', borderBottomWidth: 1, borderColor: '#1e293b' },
  tableHeader: { flex: 1, minWidth: 110, color: '#94a3b8', fontSize: 10, fontWeight: '700', padding: 12, textTransform: 'uppercase', letterSpacing: 0.7 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a' },
  cell: { flex: 1, minWidth: 110, color: '#e2e8f0', fontSize: 11, padding: 12 },
  gainCell: { textAlign: 'right', color: '#fbbf24', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 8, 23, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', maxHeight: '70%', backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#1e293b' },
  modalTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 14 },
  closeText: { color: '#22d3ee', fontSize: 12 },
  modalList: { maxHeight: 340, paddingHorizontal: 10 },
  modalItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalItemActive: { backgroundColor: '#111827' },
  modalItemText: { color: '#e2e8f0', fontSize: 13 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(2, 8, 23, 0.76)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmCard: { width: '100%', maxWidth: 420, padding: 20, backgroundColor: theme.panel, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  confirmTitle: { color: theme.white, fontSize: 17, fontWeight: '800' },
  confirmDescription: { color: theme.muted, fontSize: 13, lineHeight: 19, marginTop: 10 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9, borderWidth: 1, borderColor: '#334155' },
  cancelButtonText: { color: theme.text, fontSize: 12, fontWeight: '600' },
  confirmClearButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9, backgroundColor: '#b91c1c' },
  confirmClearText: { color: theme.white, fontSize: 12, fontWeight: '700' },
  uploadScreen: { flex: 1, backgroundColor: theme.bg },
  uploadHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.panel,
  },
  uploadTitle: { color: theme.text, fontSize: 15, fontWeight: '700' },
  headerSpacer: { width: 44 },
  uploadContent: { padding: 18, gap: 14 },
  uploadHero: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  uploadIconText: { color: theme.emerald, fontSize: 28, fontWeight: '700' },
  uploadHeading: { color: theme.white, fontSize: 20, fontWeight: '800', marginTop: 14 },
  uploadDescription: { color: theme.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  pickFileButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: theme.emerald,
  },
  pickFileText: { color: '#03150f', fontWeight: '800', fontSize: 13 },
  uploadError: { color: theme.red, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
  uploadCard: {
    padding: 16,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
  },
  uploadSectionTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  requiredColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  columnChip: {
    backgroundColor: '#052e24',
    borderWidth: 1,
    borderColor: '#065f46',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  columnChipText: { color: '#a7f3d0', fontSize: 11, fontWeight: '600' },
  optionalColumns: { color: '#64748b', fontSize: 11, lineHeight: 17, marginTop: 13 },
  previewFilename: { color: theme.cyan, fontSize: 12, marginTop: 8 },
  previewSummary: { color: theme.emerald, fontSize: 13, fontWeight: '700', marginTop: 8 },
  previewWarning: { color: theme.amber, fontSize: 11, lineHeight: 17, marginTop: 5 },
  previewList: { marginTop: 10, gap: 7 },
  previewItem: { color: theme.text, fontSize: 11, lineHeight: 17 },
  previewMore: { color: theme.muted, fontSize: 11 },
});
