import React from 'react';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import AppIcon from '../components/common/AppIcon';
import { useSettingsStore } from '../store/slices/settingsSlice';
import HomeScreen from '../screens/home/HomeScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
const Tab = createBottomTabNavigator();
function TabButton({ icon, label, ...props }: BottomTabBarButtonProps & { icon: string; label: string }) {
  const focused = props.accessibilityState?.selected;
  return <PlatformPressable {...props} accessibilityLabel={label} style={[props.style, s.item, focused && s.active]}><AppIcon name={icon} size={21} color={focused ? colors.accent.primary : colors.text.muted} /><Text style={[s.label, focused && s.activeLabel]} numberOfLines={1}>{label}</Text></PlatformPressable>;
}
export default function MainTabNavigator() {
  const showGoalsTab = useSettingsStore(state => state.showGoalsTab);
  const { bottom } = useSafeAreaInsets();
  return <Tab.Navigator screenOptions={{headerShown: false, tabBarShowLabel: false, tabBarStyle: {...s.bar, height: 78 + bottom, paddingBottom: 8 + bottom}, tabBarItemStyle: s.tab}}>
    <Tab.Screen name="Home" component={HomeScreen} options={{tabBarButton: props => <TabButton {...props} icon="house" label="Home" />}} />
    <Tab.Screen name="Reports" component={ReportsScreen} options={{tabBarButton: props => <TabButton {...props} icon="bar-chart-2" label="Reports" />}} />
    {showGoalsTab && <Tab.Screen name="Goals" component={GoalsScreen} options={{tabBarButton: props => <TabButton {...props} icon="target" label="Goals" />}} />}
    <Tab.Screen name="Settings" component={SettingsScreen} options={{tabBarButton: props => <TabButton {...props} icon="settings" label="Settings" />}} />
  </Tab.Navigator>;
}
const s = StyleSheet.create({
  bar: { backgroundColor: colors.bg.secondary, borderTopColor: colors.border.default, borderTopWidth: 1, paddingHorizontal: 18, paddingTop: 10, elevation: 0 },
  tab: { marginHorizontal: 3 },
  item: { alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1, minWidth: 0, height: 57, borderRadius: 12 },
  active: { backgroundColor: colors.accent.muted },
  label: { fontSize: 11, fontWeight: '600', color: colors.text.muted },
  activeLabel: { color: colors.accent.primary },
});
