module.exports = ({ config }) => {
  const fs = require('fs');
  const path = require('path');
  const devBuildConfig = require('./config/devBuildConfig.json');
  const dualReleaseConfig = require('./config/dualReleaseConfig.json');
  const freeReleaseConfig = require('./config/freeReleaseConfig.json');
  const subscriberReleaseConfig = require('./config/subscriberReleaseConfig.json');
  const ownerReleaseConfig = require('./config/ownerReleaseConfig.json');
  const standaloneReleaseConfig = require('./config/standaloneReleaseConfig.json');
  const normalizeVariant = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'mf-sa' || normalized === 'mfsa') {
      return 'standalone';
    }
    if (
      normalized === 'free' ||
      normalized === 'subscriber' ||
      normalized === 'owner' ||
      normalized === 'dev' ||
      normalized === 'dual' ||
      normalized === 'standalone'
    ) {
      return normalized;
    }
    return '';
  };
  const appVariant = normalizeVariant(process.env.APP_VARIANT);
  const easBuildProfile = String(process.env.EAS_BUILD_PROFILE || '').trim().toLowerCase();
  const profileVariant = appVariant
    ? ''
    : easBuildProfile === 'development'
      ? 'dev'
      : easBuildProfile === 'owner'
        ? 'owner'
        : easBuildProfile === 'free'
          ? 'free'
        : easBuildProfile === 'dual'
          ? 'dual'
          : easBuildProfile === 'standalone'
            ? 'standalone'
            : '';
  const resolvedVariant = appVariant || profileVariant || 'standalone';
  const isDevVariant = resolvedVariant === 'dev';
  const isFreeVariant = resolvedVariant === 'free';
  const isOwnerVariant = resolvedVariant === 'owner';
  const isDualVariant = resolvedVariant === 'dual';
  const isStandaloneVariant = resolvedVariant === 'standalone';
  const isSubscriberVariant = resolvedVariant === 'subscriber';
  const baseAndroidPackage = String(config?.android?.package || 'com.mohonfinderph.app').trim();
  let androidPackage = baseAndroidPackage;
  let appName = 'MF-Subs';
  const freeVariantPackage = String(process.env.FREE_VARIANT_ANDROID_PACKAGE || 'mffm.newvariant').trim();

  if (isFreeVariant) {
    androidPackage = freeVariantPackage || 'mffm.newvariant';
    appName = 'MF-Free';
  } else if (isDualVariant) {
    androidPackage = baseAndroidPackage.endsWith('.dual')
      ? baseAndroidPackage
      : `${baseAndroidPackage}.dual`;
    appName = 'MF-Dual';
  } else if (isOwnerVariant) {
    androidPackage = baseAndroidPackage.endsWith('.owner')
      ? baseAndroidPackage
      : `${baseAndroidPackage}.owner`;
    appName = 'MF-Owner';
  } else if (isDevVariant) {
    // Keep base package for dev builds; Gradle adds the .dev suffix.
    androidPackage = baseAndroidPackage;
    appName = 'MF-Dev';
  } else if (isStandaloneVariant) {
    androidPackage = baseAndroidPackage.endsWith('.mfsa')
      ? baseAndroidPackage
      : `${baseAndroidPackage}.mfsa`;
    appName = 'MF-SA';
  } else if (isSubscriberVariant) {
    appName = 'Mohon Finder';
  }

  const activeVariantConfig = isOwnerVariant
    ? ownerReleaseConfig
    : isFreeVariant
      ? freeReleaseConfig
    : isDualVariant
      ? dualReleaseConfig
      : isStandaloneVariant
        ? standaloneReleaseConfig
        : isDevVariant
          ? devBuildConfig
          : subscriberReleaseConfig;
  const iconPath = activeVariantConfig.iconPath;
  const adaptiveIconBackgroundImage = activeVariantConfig.adaptiveBackgroundPath;
  const adaptiveIconBackgroundColor = activeVariantConfig.adaptiveBackgroundColor;
  const defaultSplashImage = isOwnerVariant
    ? './assets/splash-owner-white.png'
    : isFreeVariant
      ? './assets/variants/free/splash-transparent.png'
    : isDualVariant
      ? './assets/variants/dual/splash-dual-orange.png'
      : isStandaloneVariant
        ? './assets/variants/standalone/splash-dev-white.png'
        : isDevVariant
          ? './assets/splash-dev-white.png'
          : './assets/splash-transparent.png';
  const splashImage = activeVariantConfig.splashImage || defaultSplashImage;
  const splashBackgroundColor = activeVariantConfig.splashBackgroundColor || '#ffffff';
  const defaultAdaptiveIcon = (config.android && config.android.adaptiveIcon) || {};
  const shouldUseAdaptiveIcon = !isFreeVariant;
  const monochromeCandidate = isFreeVariant
    ? ''
    : String(
        activeVariantConfig.monochromePath ||
          defaultAdaptiveIcon.monochromeImage ||
          ''
      ).trim();
  const hasMonochromeImage = (() => {
    if (!monochromeCandidate) {
      return false;
    }
    const normalizedPath = monochromeCandidate.replace(/^\.\//, '');
    const absolutePath = path.join(__dirname, normalizedPath);
    return fs.existsSync(absolutePath);
  })();

  const rawGoogleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  const googleMapsApiKey = String(rawGoogleMapsApiKey).trim();
  const rawAdMobAndroidAppId =
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || process.env.ADMOB_APP_ID_ANDROID || '';
  const rawAdMobIosAppId =
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || process.env.ADMOB_APP_ID_IOS || '';
  const adMobAndroidAppId =
    String(rawAdMobAndroidAppId).trim() || 'ca-app-pub-3940256099942544~3347511713';
  const adMobIosAppId =
    String(rawAdMobIosAppId).trim() || 'ca-app-pub-3940256099942544~1458002511';
  const hasValidGoogleMapsApiKey =
    Boolean(googleMapsApiKey) &&
    !googleMapsApiKey.toUpperCase().includes('PASTE_YOUR_API_KEY_HERE') &&
    !googleMapsApiKey.toUpperCase().includes('YOUR_REAL_KEY') &&
    !googleMapsApiKey.includes('xxxxxxxx');
  const baseAndroidPermissions = (config.android && config.android.permissions) || [];
  const screenRecordingPermissions = ['FOREGROUND_SERVICE', 'WRITE_EXTERNAL_STORAGE'];
  const androidPermissions = Array.from(
    new Set([...baseAndroidPermissions, ...screenRecordingPermissions])
  );
  const existingPlugins = Array.isArray(config.plugins) ? config.plugins : [];
  const pluginsWithoutAdmob = existingPlugins.filter((entry) => {
    if (typeof entry === 'string') {
      return entry !== 'react-native-google-mobile-ads';
    }
    if (Array.isArray(entry) && typeof entry[0] === 'string') {
      return entry[0] !== 'react-native-google-mobile-ads';
    }
    return true;
  });
  const resolvedPlugins = [
    ...pluginsWithoutAdmob,
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: adMobAndroidAppId,
        iosAppId: adMobIosAppId,
      },
    ],
  ];

  const baseAndroidConfig = { ...(config.android || {}) };
  if (!shouldUseAdaptiveIcon) {
    delete baseAndroidConfig.adaptiveIcon;
  }

  return {
    ...config,
    name: appName,
    icon: iconPath,
    splash: {
      ...(config.splash || {}),
      image: splashImage,
      resizeMode: 'contain',
      backgroundColor: splashBackgroundColor,
    },
    extra: {
      ...(config.extra || {}),
      appVariant: resolvedVariant,
    },
    plugins: resolvedPlugins,
    android: {
      ...baseAndroidConfig,
      package: androidPackage,
      permissions: androidPermissions,
      ...(shouldUseAdaptiveIcon
        ? {
            adaptiveIcon: {
              backgroundColor: adaptiveIconBackgroundColor,
              backgroundImage: adaptiveIconBackgroundImage,
              foregroundImage: activeVariantConfig.adaptiveForegroundPath,
              ...(hasMonochromeImage ? { monochromeImage: monochromeCandidate } : {}),
            },
          }
        : {}),
      config: {
        ...((baseAndroidConfig && baseAndroidConfig.config) || {}),
        ...(hasValidGoogleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
  };
};
