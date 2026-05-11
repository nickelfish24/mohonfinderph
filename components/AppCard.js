import React from 'react';
import { StyleSheet, View } from 'react-native';
import { APP_THEME } from '../utils/theme';

export default function AppCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: APP_THEME.border,
    borderRadius: 12,
    backgroundColor: APP_THEME.surface,
    padding: 12,
  },
});
