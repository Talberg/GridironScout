const { createServer } = require('node:http');

const MAX_CSV_BYTES = 5 * 1024 * 1024;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function createProxyServer({
  allowedGoogleEmails,
  allowedOrigins,
  driveFileId,
  verifyGoogleIdToken,
  downloadCsv,
}) {
  const emailAllowlist = new Set(allowedGoogleEmails.map((email) => email.toLowerCase()));
  const originAllowlist = new Set(allowedOrigins);

  return createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    const origin = request.headers.origin;

    if (origin && !originAllowlist.has(origin)) {
      sendJson(response, 403, { error: 'This app origin is not allowed.' });
      return;
    }

    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.setHeader('Access-Control-Max-Age', '600');
      response.setHeader('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/healthz') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }

    if (request.method !== 'GET' || requestUrl.pathname !== '/api/csv') {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }

    const requestedFileId = requestUrl.searchParams.get('fileId');
    if (!requestedFileId || requestedFileId !== driveFileId) {
      sendJson(response, 404, { error: 'The requested CSV is not configured.' });
      return;
    }

    const authorization = request.headers.authorization || '';
    const token = authorization.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token) {
      sendJson(response, 401, { error: 'Sign in with Google to access this CSV.' });
      return;
    }

    let identity;
    try {
      identity = await verifyGoogleIdToken(token);
    } catch {
      sendJson(response, 401, { error: 'Google sign-in is invalid or expired. Sign in again.' });
      return;
    }

    const email = typeof identity?.email === 'string' ? identity.email.toLowerCase() : '';
    const emailVerified = identity?.email_verified === true || identity?.email_verified === 'true';
    if (!emailVerified || !emailAllowlist.has(email)) {
      sendJson(response, 403, { error: 'This Google account is not authorized for the private Drive CSV.' });
      return;
    }

    try {
      const csv = await downloadCsv(driveFileId);
      if (typeof csv !== 'string' || Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
        sendJson(response, 413, { error: 'The Drive CSV is invalid or exceeds the 5 MB limit.' });
        return;
      }
      response.writeHead(200, {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(csv);
    } catch (error) {
      console.error('Drive CSV proxy could not read the configured file:', error.message);
      sendJson(response, 502, {
        error: 'The proxy could not read the Drive CSV. Check Drive API access and the Cloud Run service account file permission.',
      });
    }
  });
}

module.exports = { createProxyServer };
