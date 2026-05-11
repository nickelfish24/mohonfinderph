import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import { PREMIUM_LOCK_MESSAGE, PREMIUM_LOCK_TITLE } from '../services/subscription';
import { APP_THEME } from '../utils/theme';

export default function LockedFeatureCard({ onUpgradeNow }) {
  const handleUpgrade = () => {
    if (typeof onUpgradeNow === 'function') {
      onUpgradeNow();
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{PREMIUM_LOCK_TITLE}</Text>
      <Text style={styles.description}>{PREMIUM_LOCK_MESSAGE}</Text>
      <AppButton title="Upgrade Now" onPress={handleUpgrade} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_THEME.border,
    backgroundColor: APP_THEME.surface,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_THEME.textPrimary,
  },
  description: {
    fontSize: 14,
    color: APP_THEME.textSecondary,
    lineHeight: 20,
  },
});
