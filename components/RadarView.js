import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { APP_THEME } from '../utils/theme';

const RADAR_RADIUS = 72;
const RADAR_DIAMETER = RADAR_RADIUS * 2;
const BRAND_COLOR = APP_THEME.brand;
const BRAND_DARK = APP_THEME.brandDark;
const BRAND_SOFT = APP_THEME.brandSoft;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function RadarView({
  distanceMeters = null,
  relativeBearingDeg = 0,
  maxDistanceMeters = 20,
  isNearTarget = false,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const targetPosition = useMemo(() => {
    if (!Number.isFinite(distanceMeters)) {
      return null;
    }

    const normalizedDistance = clamp(distanceMeters / maxDistanceMeters, 0, 1);
    const targetRadius = normalizedDistance * RADAR_RADIUS;
    const rad = (relativeBearingDeg * Math.PI) / 180;

    const left = RADAR_RADIUS + targetRadius * Math.sin(rad);
    const top = RADAR_RADIUS - targetRadius * Math.cos(rad);

    return { left, top };
  }, [distanceMeters, relativeBearingDeg, maxDistanceMeters]);

  useEffect(() => {
    if (!isNearTarget || !targetPosition) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return undefined;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.45,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 520,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      pulseAnim.setValue(1);
    };
  }, [isNearTarget, pulseAnim, targetPosition]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.radarFrame}>
        <View style={styles.ringOuter} />
        <View style={styles.ringMid} />
        <View style={styles.ringInner} />
        <View style={styles.crossVertical} />
        <View style={styles.crossHorizontal} />
        <View style={styles.userDot} />

        {targetPosition ? (
          <Animated.View
            style={[
              styles.targetDot,
              isNearTarget ? styles.targetDotNear : null,
              {
                left: targetPosition.left - 6,
                top: targetPosition.top - 6,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        ) : null}

        <Text style={styles.northLabel}>N</Text>
        <Text style={styles.ringLabelNear}>5m</Text>
        <Text style={styles.ringLabelMid}>10m</Text>
        <Text style={styles.ringLabelFar}>20m</Text>
      </View>

      <Text style={styles.caption}>Radar Range: {maxDistanceMeters}m</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  radarFrame: {
    width: RADAR_DIAMETER,
    height: RADAR_DIAMETER,
    borderRadius: RADAR_RADIUS,
    borderWidth: 2,
    borderColor: BRAND_COLOR,
    backgroundColor: BRAND_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ringOuter: {
    position: 'absolute',
    width: RADAR_DIAMETER - 20,
    height: RADAR_DIAMETER - 20,
    borderRadius: (RADAR_DIAMETER - 20) / 2,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  ringMid: {
    position: 'absolute',
    width: RADAR_DIAMETER - 52,
    height: RADAR_DIAMETER - 52,
    borderRadius: (RADAR_DIAMETER - 52) / 2,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  ringInner: {
    position: 'absolute',
    width: RADAR_DIAMETER - 84,
    height: RADAR_DIAMETER - 84,
    borderRadius: (RADAR_DIAMETER - 84) / 2,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  crossVertical: {
    position: 'absolute',
    width: 1,
    height: RADAR_DIAMETER,
    backgroundColor: '#dcfce7',
  },
  crossHorizontal: {
    position: 'absolute',
    width: RADAR_DIAMETER,
    height: 1,
    backgroundColor: '#dcfce7',
  },
  userDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_DARK,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  targetDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  targetDotNear: {
    backgroundColor: '#b91c1c',
    shadowColor: '#ef4444',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  northLabel: {
    position: 'absolute',
    top: 4,
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 11,
  },
  ringLabelNear: {
    position: 'absolute',
    top: 42,
    right: 6,
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  ringLabelMid: {
    position: 'absolute',
    top: 28,
    right: 6,
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  ringLabelFar: {
    position: 'absolute',
    top: 14,
    right: 6,
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  caption: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
  },
});

