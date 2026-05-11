import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { APP_THEME } from '../utils/theme';

const BRAND_DARK = APP_THEME.brandDark;

export default function CompassArrow({ rotationDeg = 0 }) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.arrowWrap, { transform: [{ rotate: `${rotationDeg}deg` }] }]}>
        <View style={styles.tipIndicator} />
        <Text style={styles.arrow}>▲</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BRAND_DARK,
    marginBottom: 2,
  },
  arrow: {
    fontSize: 52,
    lineHeight: 56,
    color: BRAND_DARK,
    fontWeight: '700',
    textAlign: 'center',
  },
});

