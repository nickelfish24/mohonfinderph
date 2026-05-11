import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { APP_THEME, getReadableTextColor } from '../utils/theme';

const BRAND_COLOR = APP_THEME.brand;
const DEFAULT_TEXT_COLOR = APP_THEME.textOnBrand || '#ffffff';

export default function AppButton(props) {
  const { title, onPress, color, textColor, disabled = false } = props;
  const backgroundColor = color || BRAND_COLOR;
  const resolvedTextColor =
    textColor || (color ? getReadableTextColor(backgroundColor) : DEFAULT_TEXT_COLOR);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor },
        disabled && styles.buttonDisabled,
      ]}
    >
      <View style={styles.textWrap}>
        <Text style={[styles.text, { color: resolvedTextColor }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: APP_THEME.buttonBorder || 'rgba(15, 23, 42, 0.05)',
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  textWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
