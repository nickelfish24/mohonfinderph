import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import ARFinderScreen from './screens/ARFinderScreen';
import CTCScannerScreen from './screens/CTCScannerScreen';
import GnssBridgeScreen from './screens/GnssBridgeScreen';
import HomeScreen from './screens/HomeScreen';
import InputScreen from './screens/InputScreen';
import LicenseScreen from './screens/LicenseScreen';
import MapScreen from './screens/MapScreen';
import SavedLotsScreen from './screens/SavedLotsScreen';
import SettingsScreen from './screens/SettingsScreen';
import UpgradeScreen from './screens/UpgradeScreen';
import { isDeveloperAuthEnabled, useAuthSession } from './services/authService';
import { initializeAdsIfNeeded, maybeShowSecureTabInterstitial } from './services/adsService';
import { applyDeveloperPremiumAccess, shouldShowAds } from './services/subscription';
import { APP_THEME } from './utils/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const BRAND_COLOR = APP_THEME.brand;
const BRAND_DARK = APP_THEME.brandDark;
const TAB_INTERSTITIAL_ENABLED = String(
  process.env.EXPO_PUBLIC_ADS_TAB_INTERSTITIAL_ENABLED || 'true'
)
  .trim()
  .toLowerCase();

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

if (!Button.defaultProps) {
  Button.defaultProps = {};
}
if (!Button.defaultProps.color) {
  Button.defaultProps.color = BRAND_COLOR;
}

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: APP_THEME.canvas,
    card: APP_THEME.surface,
    border: APP_THEME.borderSoft,
    primary: BRAND_COLOR,
    text: APP_THEME.textPrimary,
  },
};

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected app error.',
    };
  }

  componentDidCatch() {
    // Keep app alive and show a readable fallback instead of blank screen.
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View style={styles.errorBoundaryContainer}>
        <Text style={styles.errorBoundaryTitle}>Startup Error</Text>
        <Text style={styles.errorBoundaryText}>
          {this.state.message || 'An unexpected error occurred during startup.'}
        </Text>
      </View>
    );
  }
}

function MainTabs() {
  const tabSwitchCountRef = useRef(0);
  const tabAdInFlightRef = useRef(false);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleAlign: 'center',
        tabBarActiveTintColor: BRAND_COLOR,
        tabBarInactiveTintColor: APP_THEME.iconInactive,
        tabBarHideOnKeyboard: true,
        sceneStyle: styles.tabScene,
        tabBarStyle: styles.tabBar,
        headerStyle: styles.headerStyle,
        headerShadowVisible: true,
        headerTintColor: BRAND_DARK,
        headerTitleStyle: styles.headerTitle,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'ellipse';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Input') {
            iconName = focused ? 'create' : 'create-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
      screenListeners={({ route, navigation }) => ({
        tabPress: async (event) => {
          const targetTab = String(route?.name || '').trim();
          const state = navigation.getState();
          const currentTab = String(state?.routes?.[state?.index ?? 0]?.name || '').trim();

          if (!targetTab || !currentTab || targetTab === currentTab) {
            return;
          }
          if (!isTruthy(TAB_INTERSTITIAL_ENABLED) || tabAdInFlightRef.current) {
            return;
          }
          if (!shouldShowAds()) {
            return;
          }

          tabSwitchCountRef.current += 1;
          const shouldAttemptAd = tabSwitchCountRef.current % 2 === 0;
          if (!shouldAttemptAd) {
            return;
          }

          event.preventDefault();
          tabAdInFlightRef.current = true;
          try {
            await maybeShowSecureTabInterstitial({
              fromRoute: currentTab,
              toRoute: targetTab,
              minIntervalMs: 2 * 60 * 1000,
              maxPerDay: 8,
              timeoutMs: 12000,
            });
          } catch (_error) {
            // Ignore ad failures and continue navigation.
          } finally {
            tabAdInFlightRef.current = false;
            navigation.navigate(targetTab);
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Input" component={InputScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
    </Tab.Navigator>
  );
}

function AppBootLoader() {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color={BRAND_COLOR} />
    </View>
  );
}

export default function App() {
  const { session, isLoading } = useAuthSession();
  const developerAuthEnabled = isDeveloperAuthEnabled();

  useEffect(() => {
    applyDeveloperPremiumAccess(developerAuthEnabled && Boolean(session.isAuthenticated));
  }, [developerAuthEnabled, session.isAuthenticated]);

  useEffect(() => {
    initializeAdsIfNeeded().catch(() => {
      // Keep app boot stable even if ads SDK init fails in release runtime.
    });
  }, []);

  return (
    <RootErrorBoundary>
      <NavigationContainer theme={appTheme}>
        <StatusBar style="dark" />
        {isLoading ? (
          <AppBootLoader />
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerTitleAlign: 'center',
              headerStyle: styles.headerStyle,
              headerShadowVisible: true,
              headerTintColor: BRAND_DARK,
              headerTitleStyle: styles.headerTitle,
            }}
          >
            <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="CTCScanner" component={CTCScannerScreen} options={{ title: 'CTC Scanner' }} />
            <Stack.Screen name="ARFinder" component={ARFinderScreen} options={{ title: 'AR Finder' }} />
            <Stack.Screen name="Upgrade" component={UpgradeScreen} options={{ title: 'Upgrade' }} />
            <Stack.Screen name="License" component={LicenseScreen} options={{ title: 'Buy Premium' }} />
            <Stack.Screen name="GnssBridge" component={GnssBridgeScreen} options={{ title: 'GNSS Bridge' }} />
            <Stack.Screen name="SavedLots" component={SavedLotsScreen} options={{ title: 'Saved Lots' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    height: 66,
    borderRadius: 18,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: APP_THEME.tabBarBackground,
    borderTopWidth: 1,
    borderTopColor: APP_THEME.tabBarBorder,
    elevation: 8,
  },
  headerStyle: {
    backgroundColor: APP_THEME.surface,
  },
  headerTitle: {
    color: APP_THEME.textPrimary,
  },
  tabScene: {
    paddingBottom: 98,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_THEME.canvas,
  },
  errorBoundaryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_THEME.canvas,
    paddingHorizontal: 24,
  },
  errorBoundaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_THEME.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorBoundaryText: {
    fontSize: 14,
    color: APP_THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
