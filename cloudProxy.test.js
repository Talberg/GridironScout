import { fetchDriveCsvThroughProxy, getGoogleDriveFileId } from './cloudProxy';

describe('Authenticated Drive CSV proxy client', () => {
  it('extracts file IDs from supported Drive URL formats', () => {
    expect(getGoogleDriveFileId('https://drive.google.com/file/d/file-123/view?usp=sharing'))
      .toBe('file-123');
    expect(getGoogleDriveFileId('https://drive.google.com/open?id=file-456'))
      .toBe('file-456');
    expect(getGoogleDriveFileId('https://docs.google.com/document/d/not-a-csv/edit'))
      .toBeNull();
  });

  it('calls the proxy with a verified-session bearer token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'Down,Play_Family\n1,Inside Zone',
    });

    await expect(fetchDriveCsvThroughProxy({
      apiUrl: 'https://gridiron-proxy.run.app',
      fileUrl: 'https://drive.google.com/file/d/file-123/view',
      idToken: 'google-id-token',
      fetchImpl,
    })).resolves.toBe('Down,Play_Family\n1,Inside Zone');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://gridiron-proxy.run.app/api/csv?fileId=file-123',
      { headers: { Authorization: 'Bearer google-id-token' } },
    );
  });

  it('reports missing proxy setup and Google authentication', async () => {
    await expect(fetchDriveCsvThroughProxy({
      apiUrl: '',
      fileUrl: 'https://drive.google.com/file/d/file-123/view',
      idToken: '',
    })).rejects.toThrow('authenticated Drive proxy is not configured');

    await expect(fetchDriveCsvThroughProxy({
      apiUrl: 'https://gridiron-proxy.run.app',
      fileUrl: 'https://drive.google.com/file/d/file-123/view',
      idToken: '',
    })).rejects.toThrow('Sign in with Google');
  });

  it('converts authorization and allowlist failures into clear messages', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const request = {
      apiUrl: 'https://gridiron-proxy.run.app',
      fileUrl: 'https://drive.google.com/file/d/file-123/view',
      idToken: 'google-id-token',
      fetchImpl,
    };

    await expect(fetchDriveCsvThroughProxy(request)).rejects.toThrow('Google sign-in expired');
    await expect(fetchDriveCsvThroughProxy(request)).rejects.toThrow('not authorized');
  });
});
