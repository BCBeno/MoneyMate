import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import PinLockScreen from '../screens/auth/PinLockScreen';
import { useSettingsStore } from '../store/slices/settingsSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { pinEnabled, isLocked, isLoading, loadSettings, lock } = useSettingsStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (!pinEnabled) return;
      if (prevState === 'active' && (nextState === 'inactive' || nextState === 'background')) {
        lock();
      }
    });

    return () => sub.remove();
  }, [pinEnabled, lock]);

  if (isLoading) return <LoadingSpinner message="Loading..." />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0D12' } }}>
        {pinEnabled && isLocked
          ? <Stack.Screen name="PinLock" component={PinLockScreen} />
          : <Stack.Screen name="Main" component={MainTabNavigator} />
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
