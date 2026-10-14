const { OAuth2Client, GoogleAuth } = require('google-auth-library');
const { createProxyServer } = require('./api');

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const driveFileId = requiredEnvironmentValue('DRIVE_FILE_ID');
if (!/^[A-Za-z0-9_-]+$/.test(driveFileId)) {
  throw new Error('DRIVE_FILE_ID must be a Google Drive file ID.');
}

const googleClientIds = requiredEnvironmentValue('GOOGLE_OAUTH_CLIENT_IDS')
  .split(',')
  .map((clientId) => clientId.trim())
  .filter(Boolean);
if (googleClientIds.length === 0) {
  throw new Error('GOOGLE_OAUTH_CLIENT_IDS must contain at least one OAuth client ID.');
}

const allowedGoogleEmails = requiredEnvironmentValue('ALLOWED_GOOGLE_EMAILS')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
if (allowedGoogleEmails.length === 0) {
  throw new Error('ALLOWED_GOOGLE_EMAILS must contain at least one account.');
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS
  || 'https://talberg.github.io,http://localhost:8081,http://localhost:8082,http://localhost:8083')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const oauthClient = new OAuth2Client();
const driveAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

async function readCsvResponse(response) {
  const maxBytes = 5 * 1024 * 1024;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Google Drive returned an empty CSV response.');

  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      throw new Error('Drive CSV exceeds the 5 MB size limit.');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return new TextDecoder().decode(bytes);
}

async function verifyGoogleIdToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: googleClientIds,
  });
  return ticket.getPayload();
}

async function downloadDriveCsv(fileId) {
  const authClient = await driveAuth.getClient();
  const accessTokenResult = await authClient.getAccessToken();
  const accessToken = typeof accessTokenResult === 'string'
    ? accessTokenResult
    : accessTokenResult.token;
  if (!accessToken) throw new Error('Cloud Run did not provide a Drive API access token.');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) {
    throw new Error(`Google Drive API returned HTTP ${response.status}.`);
  }
  return readCsvResponse(response);
}

const server = createProxyServer({
  allowedGoogleEmails,
  allowedOrigins,
  driveFileId,
  verifyGoogleIdToken,
  downloadCsv,
});
const port = Number(process.env.PORT || 8080);

server.listen(port, '0.0.0.0', () => {
  console.log(`Gridiron Scout Drive proxy listening on port ${port}.`);
});
