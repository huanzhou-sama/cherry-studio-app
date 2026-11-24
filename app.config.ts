import { ConfigContext, ExpoConfig } from 'expo/config';

import reportingServices from './src/frontend/appShell/observability/reportingServices.json';
import { getAppId, getAppName, getAppVersion, isProductionProfile, resolveBuildProfile } from './src/shared/config/appVariant';
import { resolveEnabledServices } from './src/shared/observability/reportingServices';

const APK_UPDATES_ENABLED = process.env.APK_UPDATES_ENABLED === 'true';
const DOMESTIC_STORES_ENABLED = process.env.DOMESTIC_STORES_ENABLED === 'true';

export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = resolveBuildProfile(process.env.PROFILE);
  const isProduction = isProductionProfile(profile);
  const reporting = resolveEnabledServices(reportingServices.services, {
    isProduction,
    env: process.env,
  });
  const basePlugins = config.plugins ?? [];

  return {
    ...config,
    name: getAppName(profile),
    version: getAppVersion(config.version!, profile),
    ios: {
      ...config.ios,
      bundleIdentifier: getAppId(profile),
    },
    android: {
      ...config.android,
      package: getAppId(profile),
      permissions: [
        ...(config.android?.permissions ?? []),
        ...(APK_UPDATES_ENABLED ? ['android.permission.REQUEST_INSTALL_PACKAGES'] : []),
      ],
    },
    extra: {
      ...config.extra,
      profile,
      reporting: {
        services: reporting,
      },
      apkUpdatesEnabled: APK_UPDATES_ENABLED,
      domesticStoresEnabled: DOMESTIC_STORES_ENABLED,
    },
    plugins: [
      ...basePlugins
        .map((plugin) => {
          if (plugin === '@sentry/react-native/expo') {
            return ['@sentry/react-native/expo', { organization: 'cherry-studio', project: 'cherry-studio-app' }];
          }
          return plugin;
        })
        .filter((plugin) => {
          const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
          if (pluginName === '@sentry/react-native/expo') return reporting.sentry;
          if (pluginName === 'expo-insights') return reporting.insights;
          if (pluginName === 'expo-observe') return reporting.observe;
          return true;
        }),
      ['./scripts/withAppUpdates', { domesticStoresEnabled: DOMESTIC_STORES_ENABLED }],
    ],
    updates: {
      ...config.updates,
      enabled: false,
    },
  };
};
