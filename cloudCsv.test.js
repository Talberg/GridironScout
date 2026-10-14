import {
  getGoogleSheetsQueryUrl,
  googleSheetsResponseToCsv,
  loadGoogleSheetsCsvWithJsonp,
} from './cloudCsv';

describe('Google Sheets CSV loading', () => {
  it('builds a Visualization API URL for a published sheet and preserves its tab', () => {
    const queryUrl = new URL(getGoogleSheetsQueryUrl(
      'https://docs.google.com/spreadsheets/d/e/published-id/pubhtml?gid=17&single=true',
      'sheetCallback',
    ));

    expect(queryUrl.pathname).toBe('/spreadsheets/d/e/published-id/gviz/tq');
    expect(queryUrl.searchParams.get('gid')).toBe('17');
    expect(queryUrl.searchParams.get('tqx')).toBe('out:json;responseHandler:sheetCallback');
  });

  it('converts the Visualization API response into escaped CSV', () => {
    expect(googleSheetsResponseToCsv({
      status: 'ok',
      table: {
        cols: [{ label: 'Play, Family' }, { label: 'Gain' }],
        rows: [{ c: [{ v: 'Power "Right"' }, { v: 8 }] }],
      },
    })).toBe('"Play, Family",Gain\n"Power ""Right""",8');
  });

  it('loads a published sheet using a script callback', async () => {
    const previousDocument = globalThis.document;
    const appendedScripts = [];
    const head = {
      appendChild: jest.fn((script) => {
        script.parentNode = head;
        appendedScripts.push(script);
        const queryUrl = new URL(script.src);
        const callbackName = queryUrl.searchParams.get('tqx').split('responseHandler:')[1];
        globalThis[callbackName]({
          status: 'ok',
          table: {
            cols: [{ label: 'Down' }, { label: 'Play_Family' }],
            rows: [{ c: [{ v: 1 }, { v: 'Inside Zone' }] }],
          },
        });
      }),
      removeChild: jest.fn((script) => {
        script.parentNode = null;
      }),
    };
    globalThis.document = {
      createElement: jest.fn(() => ({})),
      head,
    };

    try {
      await expect(loadGoogleSheetsCsvWithJsonp(
        'https://docs.google.com/spreadsheets/d/published-id/edit#gid=8',
      )).resolves.toBe('Down,Play_Family\n1,Inside Zone');
      expect(appendedScripts).toHaveLength(1);
      expect(head.removeChild).toHaveBeenCalledWith(appendedScripts[0]);
    } finally {
      if (previousDocument === undefined) {
        delete globalThis.document;
      } else {
        globalThis.document = previousDocument;
      }
    }
  });
});
