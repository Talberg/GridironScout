const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { createProxyServer } = require('./api');

const csv = 'Clip,Down,Play_Family\n1,1,Inside Zone';
const appOrigin = 'https://talberg.github.io';
let server;
let baseUrl;
let downloadCount = 0;

before(async () => {
  server = createProxyServer({
    allowedGoogleEmails: ['scout@example.com'],
    allowedOrigins: [appOrigin],
    driveFileId: 'configured-file-id',
    verifyGoogleIdToken: async (token) => {
      if (token === 'expired') throw new Error('Invalid token');
      return {
        email: token === 'different-user' ? 'other@example.com' : 'scout@example.com',
        email_verified: true,
      };
    },
    downloadCsv: async () => {
      downloadCount += 1;
      return csv;
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('allows the app origin to make authenticated CORS requests', async () => {
  const response = await fetch(`${baseUrl}/api/csv?fileId=configured-file-id`, {
    method: 'OPTIONS',
    headers: {
      Origin: appOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), appOrigin);
  assert.equal(response.headers.get('access-control-allow-headers'), 'Authorization, Content-Type');
});

test('rejects requests without a Google ID token', async () => {
  const response = await fetch(`${baseUrl}/api/csv?fileId=configured-file-id`, {
    headers: { Origin: appOrigin },
  });

  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /Sign in with Google/);
});

test('rejects invalid tokens and accounts outside the allowlist', async () => {
  const invalid = await fetch(`${baseUrl}/api/csv?fileId=configured-file-id`, {
    headers: { Authorization: 'Bearer expired', Origin: appOrigin },
  });
  const unauthorized = await fetch(`${baseUrl}/api/csv?fileId=configured-file-id`, {
    headers: { Authorization: 'Bearer different-user', Origin: appOrigin },
  });

  assert.equal(invalid.status, 401);
  assert.equal(unauthorized.status, 403);
});

test('serves only the configured CSV to an allowlisted verified account', async () => {
  const countBefore = downloadCount;
  const response = await fetch(`${baseUrl}/api/csv?fileId=configured-file-id`, {
    headers: {
      Authorization: 'Bearer valid-token',
      Origin: appOrigin,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), appOrigin);
  assert.equal(await response.text(), csv);
  assert.equal(downloadCount, countBefore + 1);
});

test('does not proxy an arbitrary Drive file ID or unapproved origin', async () => {
  const countBefore = downloadCount;
  const wrongFile = await fetch(`${baseUrl}/api/csv?fileId=other-file-id`, {
    headers: { Authorization: 'Bearer valid-token', Origin: appOrigin },
  });
  const wrongOrigin = await fetch(`${baseUrl}/api/csv?fileId=configured-file-id`, {
    headers: {
      Authorization: 'Bearer valid-token',
      Origin: 'https://attacker.example',
    },
  });

  assert.equal(wrongFile.status, 404);
  assert.equal(wrongOrigin.status, 403);
  assert.equal(downloadCount, countBefore);
});

test('rejects CSV responses that exceed the size limit', async () => {
  const largeServer = createProxyServer({
    allowedGoogleEmails: ['scout@example.com'],
    allowedOrigins: [appOrigin],
    driveFileId: 'large-file',
    verifyGoogleIdToken: async () => ({ email: 'scout@example.com', email_verified: true }),
    downloadCsv: async () => 'x'.repeat(5 * 1024 * 1024 + 1),
  });
  await new Promise((resolve) => largeServer.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${largeServer.address().port}/api/csv?fileId=large-file`,
      { headers: { Authorization: 'Bearer valid-token' } },
    );
    assert.equal(response.status, 413);
  } finally {
    await new Promise((resolve, reject) => {
      largeServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
