# Gridiron Scout

Gridiron Scout is an Expo / React Native app that can also be exported as a static website.

Use the horizontal scouting tabs to review **Field Zones**, **Down & Distance**, **Formations**, **Back Sets**, and **Play Families**, then open the **DC Quiz Engine**, **Beebe Call Sheet**, or **Snap Log**. The left-side menu contains **Record Data**, **Settings**, and the team schedule. Add schedule entries with a team/opponent name and an optional week; each has a separate playbook on the current device. On the CSV upload page, choose a scheduled week as the import destination; the imported data is saved to that entry, makes it active, and selects Local mode so it remains available even if Cloud mode was previously selected.

Down-and-distance filters and tendency groups use the distance-to-go buckets Short (S, 1–3 yards), Medium (M, 4–6 yards), and Long (L, 7+ yards), grouped separately by down. Goal-to-go is treated as short.

Cloud mode loads and parses the selected data when enabled and when the app starts. Public Google Sheets can be loaded from their Sheets URL. Private Google Drive CSV files are fetched through the authenticated Cloud Run proxy in `server/`: users sign in with Google, the backend verifies the ID token and an email allowlist, then its read-only runtime identity fetches only the configured Drive file. The browser never contacts Drive directly, so the Drive CORS restriction is avoided without publishing the CSV. Cloud data is read-only: plays recorded or other data changes made in the app are not uploaded. CSV imports and manual play entries are saved locally; Local mode uses the selected schedule entry’s playbook on the current device.

## Configure private Drive CSV access

The web app is static, so the proxy and OAuth client IDs must be deployed separately. Keep Google service-account credentials on Cloud Run; never put a service-account key or Google client secret in the app.

1. In Google Cloud, enable the **Google Drive API**, create a Cloud Run runtime service account, and create a Google OAuth **Web application** client ID. Add `https://talberg.github.io`, `http://localhost:8081`, and `http://localhost:8083` as authorized JavaScript origins. Configure the OAuth consent screen and add the permitted user as a test user if the app is still in testing.
2. Deploy the proxy from the `server/` directory with the Drive file ID, the OAuth client ID audience(s), and the permitted Google account email(s):

   ```powershell
   gcloud services enable drive.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   gcloud iam service-accounts create gridiron-scout-drive-reader
   gcloud run deploy gridiron-scout-drive-proxy `
     --source server `
     --region us-central1 `
     --allow-unauthenticated `
     --service-account gridiron-scout-drive-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com `
     --set-env-vars "DRIVE_FILE_ID=YOUR_DRIVE_FILE_ID,GOOGLE_OAUTH_CLIENT_IDS=YOUR_WEB_CLIENT_ID,ALLOWED_GOOGLE_EMAILS=YOUR_GOOGLE_EMAIL"
   ```

   `--allow-unauthenticated` lets the browser reach the HTTPS service; it does **not** make CSV data public. The `/api/csv` route independently validates the Google ID token, requires a verified account in `ALLOWED_GOOGLE_EMAILS`, and only serves `DRIVE_FILE_ID`. The default CORS origins include the GitHub Pages site and the listed local development ports. To use another site, set `ALLOWED_ORIGINS` to a comma-separated exact-origin allowlist.
3. Share the Drive CSV as **Viewer** with the Cloud Run runtime service account email (`gridiron-scout-drive-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com`). The end user does not need to make the CSV public.
4. In the repository's **Settings → Secrets and variables → Actions → Variables**, add:
   - `GRIDIRON_CLOUD_API_URL`: the HTTPS Cloud Run service URL.
   - `GOOGLE_WEB_CLIENT_ID`: the OAuth Web application client ID.

   The Pages workflow embeds these public configuration values during the build. Re-run **Deploy React Native Web to GitHub Pages** after setting them. For local web development, set `EXPO_PUBLIC_GRIDIRON_CLOUD_API_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in the shell before `npm start`.
5. In the app's Settings, paste the Drive file URL, sign in with an account listed in `ALLOWED_GOOGLE_EMAILS`, and select Cloud. Google ID tokens stay in memory for the current app session; if one expires, sign in again and reload.

For Android/iOS builds, also configure the native OAuth client IDs (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`), register the app's package/bundle ID and platform signing details in Google Cloud, and include those client IDs in `GOOGLE_OAUTH_CLIENT_IDS` on Cloud Run. Native IDs are not needed for the GitHub Pages web build.

## Run locally

```sh
npm ci
npm start
```

Press `w` in the Expo terminal to open the web app.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
3. Push to `main`, or run **Deploy React Native Web to GitHub Pages** from the repository's **Actions** tab.
4. Once the workflow completes, use the Pages URL shown in the workflow deployment.

The workflow builds the web export into `dist/` and publishes it. The Expo base URL is selected from the GitHub repository name at build time, so both project pages (`owner/repository`) and user or organization pages (`owner/owner.github.io`) use the correct asset paths.

To build the static website locally:

```sh
npm ci
npm run build:web
```

Local builds use the root path. The GitHub Actions build supplies the repository path automatically.

In Local mode, CSV uploads and saved play data remain in the current device or browser's local storage. Existing playbooks are migrated into the default **My Team** schedule entry. The schedule, selected entry, cloud URL, and storage preference are also saved locally. Cloud mode reads the configured shared source but does not write changes back to it; schedule entries use the same configured cloud CSV while Cloud mode is selected.
