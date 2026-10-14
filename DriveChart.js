import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { loadAppData, updateAppData, updateTeamDriveChart } from './appDataStore';
import {
  buildDriveChartCsv,
  buildHalftimeReport,
  createEmptyDriveChart,
  DRIVE_NOTE_CATEGORIES,
  DRIVE_QUARTERS,
  DRIVE_RESULTS,
  getDriveChartSummary,
  isStoredDriveChart,
} from './driveChartData';

const colors = {
  bg: '#020817',
  panel: '#0f172a',
  panelDark: '#0a101c',
  border: '#263448',
  text: '#e2e8f0',
  muted: '#94a3b8',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  emerald: '#34d399',
  rose: '#fb7185',
  blue: '#0ea5e9',
};

const initialSnapForm = {
  quarter: DRIVE_QUARTERS[0],
  down: '1',
  yardsToGo: '10',
  fieldPosition: 'Left Hash (Field)',
  formation: 'Spread (2x2)',
  backSet: 'Gun Far',
  playType: 'RUN',
  playFamily: 'GAP (Counter / Power)',
  gain: '',
  defensiveCall: '',
};

function ChartField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  accessibilityLabel,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="sentences"
        autoCorrect={false}
        accessibilityLabel={accessibilityLabel || label}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function ChartSelect({ label, value, options, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}, currently ${value}`}
        accessibilityState={{ expanded: visible }}
      >
        <Text style={styles.selectText} numberOfLines={1}>{value}</Text>
        <Text style={styles.selectChevron}>⌄</Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.selectOverlay}>
          <Pressable
            style={styles.selectBackdrop}
            onPress={() => setVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={`Close ${label} options`}
          />
          <View style={styles.selectPanel}>
            <Text style={styles.selectTitle}>{label}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.selectOption, option === value && styles.selectOptionActive]}
                  onPress={() => {
                    onChange(option);
                    setVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option === value }}
                >
                  <Text style={[styles.selectOptionText, option === value && styles.selectOptionTextActive]}>
                    {option}
                  </Text>
                  {option === value && <Text style={styles.selectCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ label, value, color }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    </View>
  );
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function displayTime(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function DriveChart({ teamId, teamName }) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const [chart, setChart] = useState(createEmptyDriveChart);
  const [loadedTeamId, setLoadedTeamId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('Loading drive chart…');
  const [feedback, setFeedback] = useState('');
  const [snapForm, setSnapForm] = useState(initialSnapForm);
  const [noteQuarter, setNoteQuarter] = useState(DRIVE_QUARTERS[0]);
  const [noteCategory, setNoteCategory] = useState(DRIVE_NOTE_CATEGORIES[0]);
  const [noteText, setNoteText] = useState('');
  const [notesQuarterFilter, setNotesQuarterFilter] = useState('All Quarters');
  const [driveResult, setDriveResult] = useState(DRIVE_RESULTS[0]);
  const [resetVisible, setResetVisible] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  const activeDrive = chart.drives.find((drive) => !drive.endedAt) || null;
  const summary = useMemo(() => getDriveChartSummary(chart), [chart]);
  const notes = useMemo(() => (
    notesQuarterFilter === 'All Quarters'
      ? chart.notes
      : chart.notes.filter((note) => note.quarter === notesQuarterFilter)
  ), [chart.notes, notesQuarterFilter]);

  useEffect(() => {
    let active = true;
    setLoadedTeamId('');
    setLoadError('');
    setSaveMessage('Loading drive chart…');
    const loadChart = async () => {
      try {
        const saved = await loadAppData();
        const parsed = saved.data.teams[teamId]?.driveChart || createEmptyDriveChart();
        if (!isStoredDriveChart(parsed)) {
          throw new Error('Saved drive chart has an invalid format.');
        }
        if (active) {
          setChart(parsed);
          setLoadedTeamId(teamId);
          setSaveMessage('Drive chart saved locally on this device.');
        }
      } catch (error) {
        if (active) {
          setLoadError(`Could not load this team’s drive chart: ${error.message}`);
          setSaveMessage('');
        }
      }
    };
    loadChart();
    return () => {
      active = false;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId || loadedTeamId !== teamId || loadError) return undefined;
    let active = true;
    setSaveMessage('Saving drive chart…');
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => updateAppData((current) => updateTeamDriveChart(current, teamId, chart)))
      .then(() => {
        if (active) setSaveMessage('Drive chart saved locally on this device.');
      })
      .catch((error) => {
        if (active) setSaveMessage(`Could not save drive chart: ${error.message}`);
      });
    return () => {
      active = false;
    };
  }, [chart, loadError, loadedTeamId, teamId]);

  const updateChart = (updater) => {
    setChart((current) => updater(current));
    setFeedback('');
  };

  const startDrive = () => {
    if (activeDrive) {
      setFeedback(`Finish Drive ${activeDrive.number} before starting another drive.`);
      return;
    }
    const now = new Date().toISOString();
    const drive = {
      id: makeId(),
      number: chart.drives.length + 1,
      quarter: snapForm.quarter,
      startedAt: now,
      endedAt: null,
      result: '',
      snaps: [],
    };
    updateChart((current) => ({ ...current, drives: [...current.drives, drive] }));
    setFeedback(`Drive ${drive.number} started.`);
  };

  const saveSnap = () => {
    if (!activeDrive) {
      setFeedback('Start a drive before logging a snap.');
      return;
    }
    const yardsToGo = Number(snapForm.yardsToGo);
    const gain = Number(snapForm.gain);
    const down = Number(snapForm.down);
    if (
      !Number.isInteger(down) || down < 1 || down > 4
      || !snapForm.yardsToGo.trim()
      || !Number.isFinite(yardsToGo) || yardsToGo < 0
      || !snapForm.gain.trim()
      || !Number.isFinite(gain)
    ) {
      setFeedback('Enter a valid down, distance to go, and gain before saving the snap.');
      return;
    }
    const snap = {
      id: makeId(),
      quarter: snapForm.quarter,
      down,
      yardsToGo,
      fieldPosition: snapForm.fieldPosition.trim(),
      formation: snapForm.formation.trim(),
      backSet: snapForm.backSet.trim(),
      playType: snapForm.playType,
      playFamily: snapForm.playFamily.trim(),
      gain,
      defensiveCall: snapForm.defensiveCall.trim(),
      createdAt: new Date().toISOString(),
    };
    updateChart((current) => ({
      ...current,
      drives: current.drives.map((drive) => (
        drive.id === activeDrive.id
          ? { ...drive, quarter: snap.quarter, snaps: [...drive.snaps, snap] }
          : drive
      )),
    }));
    setSnapForm((current) => ({ ...current, gain: '' }));
    setFeedback(`Snap ${activeDrive.snaps.length + 1} saved to Drive ${activeDrive.number}.`);
  };

  const finishDrive = () => {
    if (!activeDrive) return;
    const endedAt = new Date().toISOString();
    updateChart((current) => ({
      ...current,
      drives: current.drives.map((drive) => (
        drive.id === activeDrive.id
          ? { ...drive, endedAt, result: driveResult }
          : drive
      )),
    }));
    setFeedback(`Drive ${activeDrive.number} finished: ${driveResult}.`);
  };

  const saveNote = () => {
    const trimmed = noteText.trim();
    if (!trimmed) {
      setFeedback('Add an observation before recording the sideline note.');
      return;
    }
    const note = {
      id: makeId(),
      quarter: noteQuarter,
      category: noteCategory,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    updateChart((current) => ({ ...current, notes: [note, ...current.notes] }));
    setNoteText('');
    setFeedback('Sideline note recorded.');
  };

  const copyHalftimeReport = async () => {
    const report = buildHalftimeReport(chart, teamName);
    try {
      if (Platform.OS === 'web') {
        if (globalThis.navigator?.clipboard?.writeText) {
          try {
            await globalThis.navigator.clipboard.writeText(report);
          } catch (clipboardError) {
            if (!globalThis.document?.execCommand) throw clipboardError;
            const input = globalThis.document.createElement('textarea');
            input.value = report;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            globalThis.document.body.appendChild(input);
            input.select();
            const copied = globalThis.document.execCommand('copy');
            globalThis.document.body.removeChild(input);
            if (!copied) throw clipboardError;
          }
        } else if (globalThis.document?.execCommand) {
          const input = globalThis.document.createElement('textarea');
          input.value = report;
          input.style.position = 'fixed';
          input.style.opacity = '0';
          globalThis.document.body.appendChild(input);
          input.select();
          const copied = globalThis.document.execCommand('copy');
          globalThis.document.body.removeChild(input);
          if (!copied) throw new Error('Clipboard access is not available in this browser.');
        } else {
          throw new Error('Clipboard access is not available in this browser.');
        }
        setFeedback('Halftime report copied to clipboard.');
      } else {
        await Share.share({ title: 'Halftime report', message: report });
        setFeedback('Halftime report opened in the share sheet. Choose Copy to copy it.');
      }
    } catch (error) {
      setFeedback(`Could not copy the halftime report: ${error.message}`);
    }
  };

  const exportChart = async () => {
    const csv = buildDriveChartCsv(chart);
    try {
      if (Platform.OS === 'web') {
        if (!globalThis.document || !globalThis.URL?.createObjectURL) {
          throw new Error('CSV download is not available in this browser.');
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = globalThis.URL.createObjectURL(blob);
        const link = globalThis.document.createElement('a');
        const fileTeam = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
        link.href = url;
        link.download = `${fileTeam}-drive-chart.csv`;
        globalThis.document.body.appendChild(link);
        link.click();
        globalThis.document.body.removeChild(link);
        globalThis.URL.revokeObjectURL(url);
        setFeedback('Drive chart exported as a CSV file.');
      } else {
        await Share.share({ title: `${teamName} drive chart CSV`, message: csv });
        setFeedback('Drive chart CSV opened in the share sheet.');
      }
    } catch (error) {
      setFeedback(`Could not export the drive chart: ${error.message}`);
    }
  };

  const resetChart = () => {
    updateChart(createEmptyDriveChart);
    setResetVisible(false);
    setFeedback('Drive chart and sideline notes cleared.');
  };

  if (loadError) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <Text style={styles.title}>Drive-by-Drive Chart & Tactical Notes</Text>
          <Text style={styles.errorText} accessibilityLiveRegion="polite">{loadError}</Text>
        </View>
      </ScrollView>
    );
  }

  if (loadedTeamId !== teamId) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading {teamName} drive chart…</Text>
      </View>
    );
  }

  const teamSubtitle = teamName;
  const columnStyle = isNarrow ? styles.columnNarrow : styles.columnWide;

  return (
    <ScrollView contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]} keyboardShouldPersistTaps="handled">
      <View style={styles.activeSubject}>
        <View style={styles.activeSubjectTitle}>
          <View style={styles.statusDot} />
          <Text style={styles.subjectLabel}>ACTIVE SUBJECT:</Text>
          <Text style={styles.subjectName}>{teamSubtitle}</Text>
        </View>
        <View style={styles.subjectStats}>
          <Text style={styles.subjectMeta}>Snaps: <Text style={styles.cyan}>{summary.snaps}</Text></Text>
          <Text style={styles.subjectMeta}>Run %: <Text style={styles.amber}>{summary.todaysSnaps ? Math.round((summary.runs / summary.todaysSnaps) * 100) : 0}%</Text></Text>
          <Text style={styles.subjectMeta}>Pass %: <Text style={styles.amber}>{summary.todaysSnaps ? Math.round((summary.passes / summary.todaysSnaps) * 100) : 0}%</Text></Text>
          <Text style={styles.subjectMeta}>Personnel: <Text style={styles.textStrong}>Standard 4-2-5 Base</Text></Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={[styles.heroHeader, isNarrow && styles.heroHeaderNarrow]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.commandBadge}>● LIVE SIDELINE COMMAND</Text>
              <Text style={styles.eyebrowText}>In-Game Tracking</Text>
            </View>
            <Text style={styles.title}>Drive-by-Drive Chart & Tactical Notes</Text>
            <Text style={styles.description}>
              Chart each opponent possession in real time. Log snaps, identify mid-game tendency shifts, and record sideline adjustments.
            </Text>
          </View>
          <View style={[styles.actionGroup, isNarrow && styles.actionGroupNarrow]}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, activeDrive && styles.disabledButton]}
              onPress={startDrive}
              disabled={Boolean(activeDrive)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>＋ New Drive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={copyHalftimeReport} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>▣ Copy Halftime Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={exportChart} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>⇩ Export Chart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={() => setResetVisible(true)}
              accessibilityRole="button"
            >
              <Text style={styles.dangerButtonText}>▤ Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.metricsGrid}>
          <Metric label="DRIVES" value={summary.drives} />
          <Metric label="SNAPS CHARTED" value={summary.snaps} color={colors.cyan} />
          <Metric
            label="TODAY’S RUN/PASS"
            value={`${summary.todaysSnaps ? Math.round((summary.runs / summary.todaysSnaps) * 100) : 0}% R / ${summary.todaysSnaps ? Math.round((summary.passes / summary.todaysSnaps) * 100) : 0}% P`}
          />
          <Metric label="TOP IN-GAME SCHEME" value={summary.topFamily} color={colors.amber} />
          <Metric label="3RD DOWN STOPS" value={`${summary.thirdDownStops} / ${summary.thirdDownAttempts} (${summary.thirdDownAttempts ? Math.round((summary.thirdDownStops / summary.thirdDownAttempts) * 100) : 0}%)`} color={colors.emerald} />
          <Metric label="POINTS ALLOWED" value={`${summary.pointsAllowed} PTS`} color={colors.rose} />
        </View>
        <Text style={styles.saveStatus} accessibilityLiveRegion="polite">{saveMessage}</Text>
        {feedback ? <Text style={styles.feedback} accessibilityLiveRegion="polite">{feedback}</Text> : null}
      </View>

      <View style={[styles.mainGrid, isNarrow && styles.mainGridNarrow]}>
        <View style={columnStyle}>
          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}><Text style={styles.amber}>ϟ</Text> LOG NEXT SNAP</Text>
              <View style={styles.activeDriveMeta}>
                <Text style={styles.metaText}>Target Drive:</Text>
                <Text style={[styles.targetDrive, !activeDrive && styles.targetDriveEmpty]}>
                  {activeDrive ? `#${activeDrive.number}` : 'Start a drive'}
                </Text>
              </View>
            </View>
            {activeDrive ? (
              <View style={styles.formGrid}>
                <ChartSelect
                  label="QUARTER"
                  value={snapForm.quarter}
                  options={DRIVE_QUARTERS}
                  onChange={(quarter) => setSnapForm((current) => ({ ...current, quarter }))}
                />
                <ChartSelect
                  label="DOWN"
                  value={`Down ${snapForm.down}`}
                  options={['Down 1', 'Down 2', 'Down 3', 'Down 4']}
                  onChange={(down) => setSnapForm((current) => ({ ...current, down: down.slice(-1) }))}
                />
                <ChartField
                  label="DISTANCE TO GO"
                  value={snapForm.yardsToGo}
                  onChangeText={(yardsToGo) => setSnapForm((current) => ({ ...current, yardsToGo }))}
                  placeholder="10"
                  keyboardType="decimal-pad"
                />
                <ChartField
                  label="HASH / FIELD POS"
                  value={snapForm.fieldPosition}
                  onChangeText={(fieldPosition) => setSnapForm((current) => ({ ...current, fieldPosition }))}
                  placeholder="Left Hash (Field)"
                />
                <ChartField
                  label="FORMATION"
                  value={snapForm.formation}
                  onChangeText={(formation) => setSnapForm((current) => ({ ...current, formation }))}
                  placeholder="Spread (2x2)"
                />
                <ChartField
                  label="BACK SET"
                  value={snapForm.backSet}
                  onChangeText={(backSet) => setSnapForm((current) => ({ ...current, backSet }))}
                  placeholder="Gun Far"
                />
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PLAY TYPE</Text>
                  <View style={styles.typeSwitch}>
                    {['RUN', 'PASS'].map((playType) => (
                      <TouchableOpacity
                        key={playType}
                        style={[styles.typeButton, snapForm.playType === playType && styles.typeButtonActive]}
                        onPress={() => setSnapForm((current) => ({ ...current, playType }))}
                        accessibilityRole="button"
                        accessibilityState={{ selected: snapForm.playType === playType }}
                      >
                        <Text style={[styles.typeButtonText, snapForm.playType === playType && styles.typeButtonTextActive]}>
                          {playType}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <ChartField
                  label="PLAY FAMILY"
                  value={snapForm.playFamily}
                  onChangeText={(playFamily) => setSnapForm((current) => ({ ...current, playFamily }))}
                  placeholder="Counter / Power"
                />
                <ChartField
                  label="GAIN / RESULT (YDS)"
                  value={snapForm.gain}
                  onChangeText={(gain) => setSnapForm((current) => ({ ...current, gain }))}
                  placeholder="+4 yds, Inc, Sack -6"
                  keyboardType="decimal-pad"
                />
                <ChartField
                  label="DEFENSIVE CALL"
                  value={snapForm.defensiveCall}
                  onChangeText={(defensiveCall) => setSnapForm((current) => ({ ...current, defensiveCall }))}
                  placeholder="Base 4-2 Cover 3, etc."
                />
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, styles.saveSnapButton]}
                  onPress={saveSnap}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>＋ Save Snap</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noActiveDrive}>
                <Text style={styles.noActiveDriveText}>Start a drive to begin charting opponent snaps.</Text>
                <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={startDrive} accessibilityRole="button">
                  <Text style={styles.primaryButtonText}>＋ Start Drive {chart.drives.length + 1}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}>DRIVE CHART</Text>
              <Text style={styles.metaText}>{chart.drives.length} drives</Text>
            </View>
            {chart.drives.length === 0 ? (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartIcon}>▤</Text>
                <Text style={styles.emptyChartText}>No drives charted yet for this game.</Text>
                <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={startDrive} accessibilityRole="button">
                  <Text style={styles.primaryButtonText}>＋ Start Drive 1</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.driveList}>
                {chart.drives.map((drive) => (
                  <View key={drive.id} style={styles.driveCard}>
                    <View style={styles.driveCardHeading}>
                      <View style={styles.driveCardTitleGroup}>
                        <Text style={styles.driveNumber}>DRIVE {drive.number}</Text>
                        <Text style={drive.endedAt ? styles.driveClosed : styles.driveLive}>
                          {drive.endedAt ? drive.result : 'IN PROGRESS'}
                        </Text>
                      </View>
                      <Text style={styles.metaText}>{drive.quarter} · {drive.snaps.length} snaps</Text>
                    </View>
                    {drive.snaps.length ? (
                      drive.snaps.map((snap, index) => (
                        <View key={snap.id} style={styles.snapRow}>
                          <Text style={styles.snapIndex}>{index + 1}</Text>
                          <View style={styles.snapDetails}>
                            <Text style={styles.snapMain}>
                              {snap.down}&{snap.yardsToGo} · {snap.playType} · {snap.playFamily || 'Unspecified family'}
                            </Text>
                            <Text style={styles.snapMeta}>
                              {snap.formation || 'Formation not recorded'} · {snap.backSet || 'Back set not recorded'} · {snap.fieldPosition || 'Field position not recorded'}
                            </Text>
                            {snap.defensiveCall ? <Text style={styles.snapMeta}>DEF: {snap.defensiveCall}</Text> : null}
                          </View>
                          <Text style={styles.snapGain}>{snap.gain > 0 ? '+' : ''}{snap.gain} yds</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noSnapsText}>No snaps logged on this drive yet.</Text>
                    )}
                    {!drive.endedAt && (
                      <View style={[styles.finishDriveRow, isNarrow && styles.finishDriveRowNarrow]}>
                        <View style={styles.finishDriveSelect}>
                          <ChartSelect
                            label="DRIVE RESULT"
                            value={driveResult}
                            options={DRIVE_RESULTS}
                            onChange={setDriveResult}
                          />
                        </View>
                        <TouchableOpacity
                          style={[styles.button, styles.finishButton]}
                          onPress={finishDrive}
                          accessibilityRole="button"
                        >
                          <Text style={styles.finishButtonText}>Finish Drive</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={columnStyle}>
          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}><Text style={styles.amber}>●</Text> SIDELINE COACHING NOTES</Text>
              <Text style={styles.noteCount}>{chart.notes.length} Notes</Text>
            </View>
            <View style={styles.formGrid}>
              <ChartSelect
                label="QUARTER"
                value={noteQuarter}
                options={DRIVE_QUARTERS}
                onChange={setNoteQuarter}
              />
              <ChartSelect
                label="CATEGORY"
                value={noteCategory}
                options={DRIVE_NOTE_CATEGORIES}
                onChange={setNoteCategory}
              />
              <View style={styles.fullWidthField}>
                <ChartField
                  label="OBSERVATION / ADJUSTMENT"
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="e.g. When RB is Gun Far, OT sets high for pass pro. Check to Under front on 2nd & Short..."
                  multiline
                  accessibilityLabel="Sideline note observation"
                />
              </View>
              <TouchableOpacity
                style={[styles.button, styles.noteButton]}
                onPress={saveNote}
                accessibilityRole="button"
              >
                <Text style={styles.noteButtonText}>▣ Record Sideline Note</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}>GAME NOTES STREAM</Text>
              <View style={styles.quarterFilter}>
                <ChartSelect
                  label="NOTE FILTER"
                  value={notesQuarterFilter}
                  options={['All Quarters', ...DRIVE_QUARTERS]}
                  onChange={setNotesQuarterFilter}
                />
              </View>
            </View>
            {notes.length ? (
              <View style={styles.notesList}>
                {notes.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <View style={styles.noteItemHeader}>
                      <Text style={styles.noteCategory}>{note.category}</Text>
                      <Text style={styles.noteTime}>{note.quarter} · {displayTime(note.createdAt)}</Text>
                    </View>
                    <Text style={styles.noteBody}>{note.text}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyNotes}>
                <Text style={styles.emptyNotesText}>
                  {chart.notes.length ? 'No notes for this quarter.' : 'No notes logged for this game.'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={resetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetVisible(false)}
      >
        <Pressable style={styles.resetOverlay} onPress={() => setResetVisible(false)}>
          <Pressable style={styles.resetCard} onPress={() => {}}>
            <Text style={styles.resetTitle}>Reset drive chart?</Text>
            <Text style={styles.resetDescription}>
              This will permanently clear all drives, snap records, and sideline notes for {teamName}.
            </Text>
            <View style={styles.resetActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setResetVisible(false)} accessibilityRole="button">
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmResetButton} onPress={resetChart} accessibilityRole="button">
                <Text style={styles.confirmResetText}>Reset Chart</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1500, alignSelf: 'center', padding: 18, gap: 16 },
  contentNarrow: { padding: 10, gap: 10 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  muted: { color: colors.muted, fontSize: 13 },
  panel: { padding: 16, gap: 14, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 13 },
  activeSubject: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#111a27',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
  },
  activeSubjectTitle: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.emerald },
  subjectLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  subjectName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  subjectStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  subjectMeta: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  cyan: { color: colors.cyan, fontWeight: '900' },
  amber: { color: colors.amber, fontWeight: '900' },
  textStrong: { color: colors.text, fontWeight: '800' },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  heroHeaderNarrow: { flexDirection: 'column' },
  heroCopy: { flex: 1, gap: 7 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  commandBadge: { color: colors.amber, fontSize: 8, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4, backgroundColor: 'rgba(251,191,36,0.1)' },
  eyebrowText: { color: colors.muted, fontSize: 9 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  description: { maxWidth: 620, color: colors.muted, fontSize: 10, lineHeight: 15 },
  actionGroup: { maxWidth: 460, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7 },
  actionGroupNarrow: { maxWidth: '100%', justifyContent: 'flex-start' },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 34, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  primaryButton: { backgroundColor: '#f59e0b' },
  primaryButtonText: { color: '#1c1404', fontSize: 10, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
  secondaryButton: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#3b4a60' },
  secondaryButtonText: { color: '#d7e1ee', fontSize: 9, fontWeight: '800' },
  dangerButton: { backgroundColor: 'rgba(244,63,94,0.1)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.55)' },
  dangerButtonText: { color: '#fda4af', fontSize: 9, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metric: { flexGrow: 1, flexBasis: 105, minHeight: 56, justifyContent: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.panelDark, borderRadius: 9 },
  metricLabel: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.35 },
  metricValue: { color: colors.text, fontSize: 12, fontWeight: '900' },
  saveStatus: { color: colors.muted, fontSize: 9 },
  mainGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 },
  mainGridNarrow: { flexDirection: 'column' },
  columnWide: { flexGrow: 1, flexBasis: '48%', gap: 14 },
  columnNarrow: { width: '100%', gap: 10 },
  panelHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  activeDriveMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: colors.muted, fontSize: 9 },
  targetDrive: { minWidth: 70, textAlign: 'center', color: colors.cyan, fontSize: 10, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  targetDriveEmpty: { color: colors.muted },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 9 },
  field: { flexGrow: 1, flexBasis: 130, minWidth: 0, gap: 5 },
  fieldLabel: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.3 },
  input: { width: '100%', minHeight: 37, paddingHorizontal: 9, paddingVertical: 8, color: colors.text, fontSize: 10, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: '#2c3a50', borderRadius: 8 },
  multilineInput: { minHeight: 84, textAlignVertical: 'top', lineHeight: 15 },
  selectButton: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, paddingHorizontal: 9, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: '#2c3a50', borderRadius: 8 },
  selectText: { flex: 1, color: colors.text, fontSize: 9, fontWeight: '700' },
  selectChevron: { color: colors.muted, fontSize: 16 },
  selectOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(2,8,23,0.75)' },
  selectBackdrop: { ...StyleSheet.absoluteFillObject },
  selectPanel: { width: '100%', maxWidth: 390, maxHeight: '78%', padding: 13, backgroundColor: colors.panel, borderWidth: 1, borderColor: '#3b4a60', borderRadius: 12 },
  selectTitle: { color: colors.text, fontSize: 13, fontWeight: '900', paddingHorizontal: 5, paddingBottom: 9 },
  selectOption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: 'transparent', borderRadius: 8, marginVertical: 3 },
  selectOptionActive: { backgroundColor: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.55)' },
  selectOptionText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  selectOptionTextActive: { color: colors.amber },
  selectCheck: { color: colors.amber, fontSize: 14, fontWeight: '900' },
  typeSwitch: { minHeight: 37, flexDirection: 'row', gap: 5 },
  typeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelDark, borderWidth: 1, borderColor: '#2c3a50', borderRadius: 8 },
  typeButtonActive: { backgroundColor: 'rgba(14,165,233,0.15)', borderColor: colors.blue },
  typeButtonText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  typeButtonTextActive: { color: colors.cyan },
  saveSnapButton: { minWidth: 110, marginLeft: 'auto' },
  noActiveDrive: { minHeight: 115, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  noActiveDriveText: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  feedback: { color: colors.cyan, fontSize: 9, lineHeight: 14 },
  noteButton: { width: '100%', backgroundColor: '#0284c7' },
  noteButtonText: { color: '#f0f9ff', fontSize: 10, fontWeight: '900' },
  fullWidthField: { width: '100%' },
  noteCount: { color: colors.muted, fontSize: 8, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: colors.border, borderRadius: 5 },
  quarterFilter: { width: 132 },
  emptyChart: { minHeight: 136, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, backgroundColor: colors.panelDark, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.blue, borderRadius: 11 },
  emptyChartIcon: { color: '#52647e', fontSize: 21, fontWeight: '900' },
  emptyChartText: { color: '#cbd5e1', fontSize: 11, textAlign: 'center' },
  driveList: { gap: 9 },
  driveCard: { gap: 10, padding: 11, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  driveCardHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 7 },
  driveCardTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  driveNumber: { color: colors.text, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  driveLive: { color: colors.emerald, fontSize: 8, fontWeight: '900' },
  driveClosed: { color: colors.amber, fontSize: 8, fontWeight: '900' },
  snapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#202b3d' },
  snapIndex: { width: 19, height: 19, textAlign: 'center', textAlignVertical: 'center', color: colors.cyan, fontSize: 8, fontWeight: '900', backgroundColor: '#102036', borderRadius: 5 },
  snapDetails: { flex: 1, gap: 3 },
  snapMain: { color: colors.text, fontSize: 9, fontWeight: '800' },
  snapMeta: { color: colors.muted, fontSize: 8, lineHeight: 12 },
  snapGain: { color: colors.emerald, fontSize: 9, fontWeight: '900' },
  noSnapsText: { color: colors.muted, fontSize: 9 },
  finishDriveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#202b3d' },
  finishDriveRowNarrow: { alignItems: 'stretch', flexDirection: 'column' },
  finishDriveSelect: { flex: 1 },
  finishButton: { backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.5)' },
  finishButtonText: { color: colors.emerald, fontSize: 9, fontWeight: '900' },
  notesList: { gap: 8 },
  noteItem: { gap: 6, padding: 10, backgroundColor: colors.panelDark, borderWidth: 1, borderColor: colors.border, borderRadius: 9 },
  noteItemHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 5 },
  noteCategory: { color: colors.amber, fontSize: 8, fontWeight: '900' },
  noteTime: { color: colors.muted, fontSize: 8 },
  noteBody: { color: colors.text, fontSize: 10, lineHeight: 15 },
  emptyNotes: { minHeight: 76, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderColor: colors.border },
  emptyNotesText: { color: '#64748b', fontSize: 9, textAlign: 'center' },
  errorText: { color: colors.rose, fontSize: 11, lineHeight: 16 },
  resetOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(2,8,23,0.75)' },
  resetCard: { width: '100%', maxWidth: 420, padding: 18, gap: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  resetTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  resetDescription: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  resetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 3 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: 13, backgroundColor: '#1e293b', borderRadius: 8 },
  cancelButtonText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  confirmResetButton: { alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: 13, backgroundColor: '#be123c', borderRadius: 8 },
  confirmResetText: { color: '#fff1f2', fontSize: 10, fontWeight: '900' },
});
