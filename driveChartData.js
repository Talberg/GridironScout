export const DRIVE_CHART_VERSION = 1;
export const DRIVE_QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter', 'Overtime'];
export const DRIVE_RESULTS = ['Punt', 'Turnover', 'Turnover on Downs', 'Field Goal', 'Touchdown'];
export const DRIVE_NOTE_CATEGORIES = [
  'Alignment / Tell',
  'Tendency Shift',
  'Sideline Adjustment',
  'Personnel',
  'Other',
];

export function createEmptyDriveChart() {
  return { version: DRIVE_CHART_VERSION, drives: [], notes: [] };
}

export function isStoredDriveChart(value) {
  return value?.version === DRIVE_CHART_VERSION
    && Array.isArray(value.drives)
    && value.drives.every((drive) => (
      drive
      && typeof drive.id === 'string'
      && Number.isInteger(drive.number)
      && typeof drive.quarter === 'string'
      && typeof drive.startedAt === 'string'
      && (drive.endedAt === null || typeof drive.endedAt === 'string')
      && typeof drive.result === 'string'
      && Array.isArray(drive.snaps)
      && drive.snaps.every((snap) => (
        snap
        && typeof snap.id === 'string'
        && Number.isInteger(snap.down)
        && snap.down >= 1
        && snap.down <= 4
        && Number.isFinite(snap.yardsToGo)
        && snap.yardsToGo >= 0
        && Number.isFinite(snap.gain)
        && (snap.playType === 'RUN' || snap.playType === 'PASS')
        && typeof snap.quarter === 'string'
        && typeof snap.createdAt === 'string'
      ))
    ))
    && Array.isArray(value.notes)
    && value.notes.every((note) => (
      note
      && typeof note.id === 'string'
      && typeof note.quarter === 'string'
      && typeof note.category === 'string'
      && typeof note.text === 'string'
      && typeof note.createdAt === 'string'
    ));
}

export function getDriveChartSummary(chart, now = new Date()) {
  const today = now.toDateString();
  const snaps = chart.drives.flatMap((drive) => drive.snaps);
  const todaysSnaps = snaps.filter((snap) => new Date(snap.createdAt).toDateString() === today);
  const runs = todaysSnaps.filter((snap) => snap.playType === 'RUN').length;
  const passes = todaysSnaps.length - runs;
  const familyCounts = snaps.reduce((counts, snap) => {
    if (snap.playFamily) counts[snap.playFamily] = (counts[snap.playFamily] || 0) + 1;
    return counts;
  }, {});
  const topFamily = Object.entries(familyCounts).sort((first, second) => (
    second[1] - first[1] || first[0].localeCompare(second[0])
  ))[0]?.[0] || 'None';
  const thirdDownStops = snaps.filter((snap) => (
    snap.down === 3 && snap.gain < snap.yardsToGo
  )).length;
  const pointsByResult = { 'Field Goal': 3, Touchdown: 7 };
  const pointsAllowed = chart.drives.reduce((total, drive) => (
    total + (pointsByResult[drive.result] || 0)
  ), 0);

  return {
    drives: chart.drives.length,
    snaps: snaps.length,
    todaysSnaps: todaysSnaps.length,
    runs,
    passes,
    topFamily,
    thirdDownStops,
    thirdDownAttempts: snaps.filter((snap) => snap.down === 3).length,
    pointsAllowed,
  };
}

export function buildHalftimeReport(chart, teamName) {
  const firstHalfSnaps = chart.drives
    .flatMap((drive) => drive.snaps)
    .filter((snap) => snap.quarter === '1st Quarter' || snap.quarter === '2nd Quarter');
  const runs = firstHalfSnaps.filter((snap) => snap.playType === 'RUN').length;
  const passes = firstHalfSnaps.length - runs;
  const stops = firstHalfSnaps.filter((snap) => (
    snap.down === 3 && snap.gain < snap.yardsToGo
  )).length;
  const familyCounts = firstHalfSnaps.reduce((counts, snap) => {
    if (snap.playFamily) counts[snap.playFamily] = (counts[snap.playFamily] || 0) + 1;
    return counts;
  }, {});
  const leadingFamily = Object.entries(familyCounts).sort((first, second) => (
    second[1] - first[1] || first[0].localeCompare(second[0])
  ))[0]?.[0] || 'No clear tendency';
  const notes = chart.notes.filter((note) => (
    note.quarter === '1st Quarter' || note.quarter === '2nd Quarter'
  ));
  const noteLines = notes.length
    ? notes.map((note) => `- ${note.quarter} · ${note.category}: ${note.text}`).join('\n')
    : '- No halftime notes recorded.';

  return [
    `${teamName} — Halftime Defensive Report`,
    `Snaps charted: ${firstHalfSnaps.length}`,
    `Run / pass: ${runs} / ${passes}${firstHalfSnaps.length ? ` (${Math.round((runs / firstHalfSnaps.length) * 100)}% run)` : ''}`,
    `Third-down stops: ${stops}`,
    `Leading play family: ${leadingFamily}`,
    '',
    'SIDELINE NOTES',
    noteLines,
  ].join('\n');
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildDriveChartCsv(chart) {
  const columns = [
    'Drive',
    'Quarter',
    'Entry Type',
    'Down',
    'Distance',
    'Hash / Field Position',
    'Formation',
    'Back Set',
    'Play Type',
    'Play Family',
    'Gain',
    'Defensive Call',
    'Category',
    'Observation',
    'Drive Result',
    'Timestamp',
  ];
  const rows = chart.drives.flatMap((drive) => (
    drive.snaps.map((snap) => [
      drive.number,
      snap.quarter,
      'Snap',
      snap.down,
      snap.yardsToGo,
      snap.fieldPosition,
      snap.formation,
      snap.backSet,
      snap.playType,
      snap.playFamily,
      snap.gain,
      snap.defensiveCall,
      '',
      '',
      drive.result,
      snap.createdAt,
    ])
  ));
  chart.notes.forEach((note) => rows.push([
    '',
    note.quarter,
    'Sideline Note',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    note.category,
    note.text,
    '',
    note.createdAt,
  ]));

  return [columns, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}
