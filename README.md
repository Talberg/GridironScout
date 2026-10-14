# Gridiron Scout

Gridiron Scout is an Expo / React Native app that can also be exported as a static website.

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

CSV uploads and saved play data remain in the current device or browser's local storage; they are not shared between users or synced to a database.
