import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabNavigator from './MainTabNavigator';
import PinLockScreen from '../screens/auth/PinLockScreen';
import { useSettingsStore } from '../store/slices/settingsSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { pinEnabled, isLocked, isLoading, loadSettings } = useSettingsStore();

  useEffect(() => { loadSettings(); }, []);

  if (isLoading) return <LoadingSpinner message="Se încarcă..." />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0B0D12' } }}>
        {pinEnabled && isLocked
          ? <Stack.Screen name="PinLock" component={PinLockScreen} />
          : <Stack.Screen name="Main" component={MainTabNavigator} />
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
