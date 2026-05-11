import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { maybeShowSecureTabInterstitial } from '../services/adsService';
import { usePremiumSubscription } from '../services/subscription';
import { APP_THEME } from '../utils/theme';

const TAB_ITEMS = [
  { key: 'Home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { key: 'Input', icon: 'create-outline', iconActive: 'create', label: 'Input' },
  { key: 'Map', icon: 'map-outline', iconActive: 'map', label: 'Map' },
];

export default function BottomTabDock({ navigation, activeTab = '' }) {
  const { shouldShowAds } = usePremiumSubscription();
  const current = String(activeTab || '').trim();
  const handleTabPress = useCallback(
    async (item) => {
      const destination = String(item?.key || '').trim();
      if (!destination) {
        return;
      }
      if (current.toLowerCase() === destination.toLowerCase()) {
        return;
      }

      if (shouldShowAds()) {
        try {
          await maybeShowSecureTabInterstitial({
            fromRoute: current || 'unknown',
            toRoute: destination,
            minIntervalMs: 75 * 1000,
            maxPerDay: 16,
            timeoutMs: 12000,
          });
        } catch (_error) {
          // Keep tab navigation responsive even when ad loading fails.
        }
      }

      navigation.navigate('Tabs', { screen: destination });
    },
    [current, navigation, shouldShowAds]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {TAB_ITEMS.map((item) => {
          const isActive = current.toLowerCase() === item.key.toLowerCase();
          return (
            <TouchableOpacity
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label}`}
              onPress={() => {
                void handleTabPress(item);
              }}
              style={[styles.item, isActive && styles.itemActive]}
              activeOpacity={0.84}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.icon}
                size={20}
                color={isActive ? APP_THEME.brandDark : APP_THEME.iconInactive}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: APP_THEME.tabBarBorder,
    borderRadius: 14,
    backgroundColor: APP_THEME.tabBarBackground,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  itemActive: {
    backgroundColor: APP_THEME.surfaceSoft,
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: APP_THEME.textSecondary,
  },
  labelActive: {
    color: APP_THEME.brandDark,
  },
});
