import {
  buildDriveChartCsv,
  buildHalftimeReport,
  createEmptyDriveChart,
  getDriveChartSummary,
  isStoredDriveChart,
} from './driveChartData';

const today = new Date('2026-10-14T12:00:00.000Z');
const todayStamp = today.toISOString();
const yesterdayStamp = '2026-10-13T12:00:00.000Z';

function createTestChart() {
  return {
    version: 1,
    drives: [
      {
        id: 'drive-1',
        number: 1,
        quarter: '1st Quarter',
        startedAt: todayStamp,
        endedAt: todayStamp,
        result: 'Touchdown',
        snaps: [
          {
            id: 'snap-1',
            quarter: '1st Quarter',
            down: 3,
            yardsToGo: 8,
            fieldPosition: 'Left Hash',
            formation: 'Trips Right',
            backSet: 'Gun Far',
            playType: 'RUN',
            playFamily: 'Counter',
            gain: 4,
            defensiveCall: 'Cover 3',
            createdAt: todayStamp,
          },
          {
            id: 'snap-2',
            quarter: '1st Quarter',
            down: 1,
            yardsToGo: 10,
            fieldPosition: 'Right Hash',
            formation: 'Bunch',
            backSet: 'Gun',
            playType: 'PASS',
            playFamily: 'Mesh, "Drive"',
            gain: 12,
            defensiveCall: 'Blitz',
            createdAt: todayStamp,
          },
          {
            id: 'snap-old',
            quarter: '3rd Quarter',
            down: 3,
            yardsToGo: 5,
            fieldPosition: 'Middle',
            formation: 'Empty',
            backSet: 'Gun',
            playType: 'PASS',
            playFamily: 'Four Verts',
            gain: 7,
            defensiveCall: '',
            createdAt: yesterdayStamp,
          },
        ],
      },
      {
        id: 'drive-2',
        number: 2,
        quarter: '2nd Quarter',
        startedAt: todayStamp,
        endedAt: todayStamp,
        result: 'Field Goal',
        snaps: [],
      },
    ],
    notes: [
      {
        id: 'note-1',
        quarter: '1st Quarter',
        category: 'Alignment / Tell',
        text: 'Tight end motion, check "Under" front',
        createdAt: todayStamp,
      },
      {
        id: 'note-2',
        quarter: '4th Quarter',
        category: 'Other',
        text: 'Late-game note',
        createdAt: todayStamp,
      },
    ],
  };
}

describe('drive chart data', () => {
  it('validates stored charts and calculates today’s run/pass and defensive summaries', () => {
    const chart = createTestChart();
    expect(isStoredDriveChart(createEmptyDriveChart())).toBe(true);
    expect(isStoredDriveChart({ ...chart, version: 2 })).toBe(false);
    expect(isStoredDriveChart({
      ...chart,
      drives: [{ ...chart.drives[0], snaps: [{ ...chart.drives[0].snaps[0], down: 5 }] }],
    })).toBe(false);
    expect(getDriveChartSummary(chart, today)).toMatchObject({
      drives: 2,
      snaps: 3,
      todaysSnaps: 2,
      runs: 1,
      passes: 1,
      topFamily: 'Counter',
      thirdDownStops: 1,
      thirdDownAttempts: 2,
      pointsAllowed: 10,
    });
  });

  it('limits the halftime report to first-half snaps and notes', () => {
    const report = buildHalftimeReport(createTestChart(), 'Northside · Week 2');
    expect(report).toContain('Northside · Week 2 — Halftime Defensive Report');
    expect(report).toContain('Snaps charted: 2');
    expect(report).toContain('Run / pass: 1 / 1 (50% run)');
    expect(report).toContain('Leading play family: Counter');
    expect(report).toContain('Tight end motion, check "Under" front');
    expect(report).not.toContain('Late-game note');
    expect(report).not.toContain('Four Verts');
  });

  it('exports snaps and notes to escaped CSV rows', () => {
    const csv = buildDriveChartCsv(createTestChart());
    expect(csv).toContain('Drive,Quarter,Entry Type,Down,Distance');
    expect(csv).toContain('"Mesh, ""Drive"""');
    expect(csv).toContain('"Tight end motion, check ""Under"" front"');
    expect(csv).toContain('Sideline Note');
    expect(csv.split('\r\n')).toHaveLength(6);
  });
});
