export function getGoogleDriveFileId(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== 'drive.google.com') return null;
    return url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1]
      || (['/open', '/uc', '/file'].includes(url.pathname) ? url.searchParams.get('id') : null);
  } catch {
    return null;
  }
}

export async function fetchDriveCsvThroughProxy({
  apiUrl,
  fileUrl,
  idToken,
  fetchImpl = globalThis.fetch,
}) {
  const fileId = getGoogleDriveFileId(fileUrl);
  if (!fileId) {
    throw new Error('Enter a valid Google Drive file URL.');
  }
  if (!apiUrl) {
    throw new Error('The authenticated Drive proxy is not configured in this app build.');
  }
  if (!idToken) {
    throw new Error('Sign in with Google to load the private Drive CSV.');
  }

  let endpoint;
  try {
    const base = new URL(apiUrl);
    if (base.protocol !== 'https:' && base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') {
      throw new Error('The Drive proxy URL must use HTTPS.');
    }
    endpoint = new URL('/api/csv', base);
    endpoint.searchParams.set('fileId', fileId);
  } catch (error) {
    if (error.message === 'The Drive proxy URL must use HTTPS.') throw error;
    throw new Error('Enter a valid Cloud Run proxy URL.');
  }

  const response = await fetchImpl(endpoint.toString(), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (response.status === 401) {
    throw new Error('Google sign-in expired or is missing. Sign in again and reload the CSV.');
  }
  if (response.status === 403) {
    throw new Error('This Google account is not authorized for the private Drive CSV.');
  }
  if (!response.ok) {
    let detail = '';
    try {
      const result = await response.json();
      detail = result.error || '';
    } catch {
      detail = '';
    }
    throw new Error(detail || `The authenticated Drive proxy returned HTTP ${response.status}.`);
  }
  return response.text();
}
