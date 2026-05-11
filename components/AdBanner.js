import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  getBannerAdBindings,
  getAdMobBannerIdAndroid,
  isAdsModuleAvailable,
  isAdUnitIdReady,
} from '../services/adsService';
import { APP_THEME } from '../utils/theme';

function isTruthy(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

export default function AdBanner({ visible = true }) {
  const diagnosticMode = isTruthy(process.env.EXPO_PUBLIC_ADS_DIAGNOSTIC_OVERLAY || '');
  const primaryUnitId = getAdMobBannerIdAndroid();
  const [activeUnitId, setActiveUnitId] = useState(primaryUnitId);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [adStatus, setAdStatus] = useState('loading');
  const [adError, setAdError] = useState('');

  useEffect(() => {
    setActiveUnitId(primaryUnitId);
    setReloadNonce((value) => value + 1);
    setAdStatus('loading');
    setAdError('');
  }, [primaryUnitId]);

  if (!visible || Platform.OS !== 'android' || !isAdsModuleAvailable()) {
    return null;
  }
  if (!isAdUnitIdReady(activeUnitId)) {
    return diagnosticMode ? (
      <View style={styles.wrap}>
        <Text style={[styles.debugText, styles.debugTextError]}>
          Ads: invalid ad unit configuration
        </Text>
      </View>
    ) : null;
  }

  const bindings = getBannerAdBindings();
  if (!bindings?.BannerAd || !bindings?.BannerAdSize) {
    return null;
  }

  const { BannerAd, BannerAdSize } = bindings;

  const size =
    BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ||
    BannerAdSize?.BANNER ||
    'ANCHORED_ADAPTIVE_BANNER';

  return (
    <View style={styles.wrap}>
      <BannerAd
        key={`${activeUnitId}-${reloadNonce}`}
        unitId={activeUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          setAdStatus('loaded');
          setAdError('');
        }}
        onAdFailedToLoad={(error) => {
          const message = error?.message || String(error || 'unknown');
          setAdStatus('failed');
          setAdError(message);
          console.log(
            '[AdBanner] Banner failed to load',
            message
          );
        }}
      />
      {diagnosticMode ? (
        <Text
          style={[
            styles.debugText,
            adStatus === 'loaded' ? styles.debugTextSuccess : styles.debugTextError,
          ]}
        >
          {`Ads: ${adStatus}${adError ? ` | ${adError}` : ''}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    marginBottom: 4,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_THEME.border,
    backgroundColor: APP_THEME.surface,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  debugText: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  debugTextSuccess: {
    color: '#166534',
  },
  debugTextError: {
    color: '#991b1b',
  },
});
