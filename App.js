import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    downDistBucket: `${down}${distance.toUpperCase() === 'G' ? 'G' : distance}`,
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
        .sort()
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
  const sampleData = useMemo(() => buildDataset(DEFAULT_FOOTBALL_DATA), []);
  const [dataset, setDataset] = useState(sampleData.plays);
  const [rawRowCount, setRawRowCount] = useState(sampleData.rowCount);
  const [datasetName, setDatasetName] = useState('Sample dataset');
  const [storageReady, setStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const uniqueDownDist = ['ALL', ...Array.from(new Set(dataset.map((p) => p.downDistBucket))).sort()];
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

  useEffect(() => {
    let active = true;
    const restoreLocalData = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(LOCAL_DATA_KEY);
        if (!active) return;
        if (savedValue) {
          const saved = JSON.parse(savedValue);
          if (Array.isArray(saved.plays) && saved.plays.every((play) => (
            play &&
            typeof play.clip === 'string' &&
            typeof play.downDistBucket === 'string' &&
            typeof play.gain === 'number'
          ))) {
            setDataset(saved.plays);
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
    if (!storageReady) return undefined;
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
  }, [dataset, datasetName, rawRowCount, storageReady]);

  const chooseCsvFile = async () => {
    setUploadError('');
    setUploadPreview(null);
    setUploadBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const csvText = file.file && typeof file.file.text === 'function'
        ? await file.file.text()
        : await FileSystem.readAsStringAsync(file.uri);
      const parsed = buildDataset(csvText);
      if (!parsed.plays.length) {
        throw new Error('No valid plays were found. Check the required columns and row values below.');
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
          <Text style={styles.storageMessage}>{storageMessage || 'Saving data locally…'}</Text>
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
  content: { padding: 16, gap: 18 },
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
