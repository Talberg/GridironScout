export function isGoogleSheetsUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname === 'docs.google.com'
      && /^\/spreadsheets\/d\/(?:e\/)?[^/]+(?:\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}

export function getCsvDownloadUrl(value) {
  const url = new URL(value);
  if (url.hostname === 'docs.google.com') {
    const publishedPath = url.pathname.match(/^\/spreadsheets\/d\/e\/([^/]+)\/(pub|pubhtml)(?:\/|$)/);
    if (publishedPath) {
      const gid = url.searchParams.get('gid') || url.hash.match(/gid=(\d+)/)?.[1];
      url.pathname = `/spreadsheets/d/e/${publishedPath[1]}/pub`;
      url.search = '';
      if (gid) url.searchParams.set('gid', gid);
      url.searchParams.set('output', 'csv');
      url.hash = '';
    } else {
      const sheetPath = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)(?:\/([^/]+))?/);
      if (sheetPath) {
        const gid = url.searchParams.get('gid') || url.hash.match(/gid=(\d+)/)?.[1];
        const view = sheetPath[2];
        if (view === 'pub' || view === 'pubhtml') {
          url.pathname = `/spreadsheets/d/${sheetPath[1]}/pub`;
          url.search = '';
          url.searchParams.set('output', 'csv');
        } else if (view !== 'export') {
          url.pathname = `/spreadsheets/d/${sheetPath[1]}/export`;
          url.search = '';
          url.searchParams.set('format', 'csv');
        }
        if (gid) url.searchParams.set('gid', gid);
        url.hash = '';
      }
    }
  }
  if (url.hostname === 'drive.google.com') {
    const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1]
      || (url.pathname === '/open' ? url.searchParams.get('id') : null);
    if (fileId) {
      url.pathname = '/uc';
      url.search = '';
      url.searchParams.set('export', 'download');
      url.searchParams.set('id', fileId);
    }
  }
  return url.toString();
}

export function getGoogleSheetsQueryUrl(value, callbackName) {
  const url = new URL(value);
  const publishedPath = url.pathname.match(/^\/spreadsheets\/d\/e\/([^/]+)(?:\/|$)/);
  const sheetPath = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)(?:\/|$)/);
  const sheetId = publishedPath?.[1] || sheetPath?.[1];
  if (url.hostname !== 'docs.google.com' || !sheetId) {
    throw new Error('Enter a valid Google Sheets URL.');
  }

  const gid = url.searchParams.get('gid') || url.hash.match(/gid=(\d+)/)?.[1];
  url.pathname = publishedPath
    ? `/spreadsheets/d/e/${sheetId}/gviz/tq`
    : `/spreadsheets/d/${sheetId}/gviz/tq`;
  url.search = '';
  url.searchParams.set('tqx', `out:json;responseHandler:${callbackName}`);
  if (gid) url.searchParams.set('gid', gid);
  url.hash = '';
  return url.toString();
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function googleSheetsResponseToCsv(response) {
  if (response?.status && response.status !== 'ok') {
    const detail = response.errors?.map((error) => error.detailed_message || error.message).filter(Boolean).join('; ');
    throw new Error(detail || 'Google Sheets could not return this spreadsheet.');
  }

  const table = response?.table;
  if (!Array.isArray(table?.cols) || !Array.isArray(table?.rows)) {
    throw new Error('Google Sheets returned an invalid response. Publish the sheet to the web and try again.');
  }

  const lines = [
    table.cols.map((column) => escapeCsvCell(column.label || column.id || '')).join(','),
    ...table.rows.map((row) => (row.c || [])
      .map((cell) => escapeCsvCell(cell?.f ?? cell?.v ?? ''))
      .join(',')),
  ];
  return lines.join('\n');
}

export function loadGoogleSheetsCsvWithJsonp(value) {
  return new Promise((resolve, reject) => {
    const root = globalThis;
    const documentRef = root.document;
    if (!documentRef?.createElement || !documentRef.head?.appendChild) {
      reject(new Error('Google Sheets loading is unavailable in this browser.'));
      return;
    }

    const callbackName = `gridironScoutSheets_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = documentRef.createElement('script');
    let timeout;
    let settled = false;
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      delete root[callbackName];
      script.onerror = null;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const finish = (callback, result) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(result);
    };

    root[callbackName] = (response) => {
      try {
        finish(resolve, googleSheetsResponseToCsv(response));
      } catch (error) {
        finish(reject, error);
      }
    };
    script.async = true;
    script.onerror = () => finish(
      reject,
      new Error('Google Sheets could not be reached. Publish the spreadsheet to the web and confirm its sharing settings.'),
    );
    script.src = getGoogleSheetsQueryUrl(value, callbackName);
    timeout = setTimeout(() => finish(
      reject,
      new Error('Google Sheets did not respond. Publish the spreadsheet to the web and try again.'),
    ), 15000);
    documentRef.head.appendChild(script);
  });
}
