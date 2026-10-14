module.exports = ({ config }) => {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const isUserOrOrganizationSite = repositoryName?.toLowerCase().endsWith('.github.io');
  const baseUrl = repositoryName && !isUserOrOrganizationSite
    ? `/${repositoryName}`
    : '';

  return {
    ...config,
    name: config.name || 'Gridiron Scout',
    slug: config.slug || 'gridiron-scout',
    scheme: config.scheme || 'gridironscout',
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier || 'com.talberg.gridironscout',
    },
    android: {
      ...config.android,
      package: config.android?.package || 'com.talberg.gridironscout',
    },
    plugins: [...(config.plugins || []), 'expo-web-browser'],
    web: {
      ...config.web,
      bundler: 'metro',
      output: 'single',
    },
    experiments: {
      ...config.experiments,
      baseUrl,
    },
    extra: {
      ...config.extra,
      gridironCloudApiUrl: process.env.EXPO_PUBLIC_GRIDIRON_CLOUD_API_URL || '',
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    },
  };
};
