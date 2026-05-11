import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_THEME } from '../utils/theme';

export default function IconTileButton({
  icon = 'apps-outline',
  label = '',
  onPress,
  disabled = false,
  style,
  iconBoxStyle,
  labelStyle,
  iconColor,
  labelPlacement = 'below',
}) {
  const resolvedIconColor = disabled
    ? iconColor || 'rgba(255,255,255,0.75)'
    : iconColor || APP_THEME.textOnBrand;
  const isLabelInside = labelPlacement === 'inside';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrap,
        disabled && styles.wrapDisabled,
        pressed && !disabled ? styles.wrapPressed : null,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(15, 23, 42, 0.12)' }}
    >
      <View style={[styles.iconBox, isLabelInside ? styles.iconBoxInside : null, iconBoxStyle]}>
        <Ionicons
          name={icon}
          size={24}
          color={resolvedIconColor}
        />
        {isLabelInside ? (
          <Text
            style={[
              styles.labelInside,
              { color: resolvedIconColor },
              disabled ? styles.labelInsideDisabled : null,
              labelStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </View>
      {!isLabelInside ? (
        <Text style={[styles.label, disabled ? styles.labelDisabled : null, labelStyle]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  wrapPressed: {
    opacity: 0.92,
  },
  wrapDisabled: {
    opacity: 0.6,
  },
  iconBox: {
    width: 64,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: APP_THEME.brandDark,
    backgroundColor: APP_THEME.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxInside: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: APP_THEME.textPrimary,
  },
  labelDisabled: {
    color: APP_THEME.textMuted,
  },
  labelInside: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  labelInsideDisabled: {
    opacity: 0.75,
  },
});
