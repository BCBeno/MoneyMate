import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { resolveIconName } from '../../constants/icons';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
type MaterialName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const aliases: Record<string, FeatherName> = {
  house: 'home', laptop: 'monitor', 'briefcase-business': 'briefcase',
  'calendar-days': 'calendar', 'chart-no-axes-column': 'bar-chart-2',
  'file-spreadsheet': 'file-text', 'lock-keyhole': 'lock',
  'shield-check': 'shield', 'book-open': 'book-open', pencil: 'edit-3',
  'loader-circle': 'loader', tags: 'tag', 'gamepad-2': 'code',
};
const material: Record<string, MaterialName> = {
  wallet: 'wallet-outline', car: 'car-outline', plane: 'airplane',
  utensils: 'silverware-fork-knife', clapperboard: 'movie-open-outline',
  coins: 'cash-multiple', fingerprint: 'fingerprint', 'graduation-cap': 'school-outline',
  gem: 'diamond-stone', dumbbell: 'dumbbell', 'paw-print': 'paw-outline',
  beer: 'beer-outline', hospital: 'hospital-building', leaf: 'leaf',
  wrench: 'wrench-outline', tent: 'tent', rocket: 'rocket-launch-outline',
  palette: 'palette-outline', 'gamepad-2': 'controller-classic-outline',
};
export default function AppIcon({ name, size = 22, color = colors.text.secondary, style }: {
  name?: string | null; size?: number; color?: string; style?: StyleProp<ViewStyle>;
}) {
  const resolved = resolveIconName(name);
  if (material[resolved]) return <MaterialCommunityIcons name={material[resolved]} size={size} color={color} style={style} accessible={false} />;
  const featherName = aliases[resolved] ?? resolved;
  if (Object.prototype.hasOwnProperty.call(Feather.glyphMap, featherName)) {
    return <Feather name={featherName as FeatherName} size={size} color={color} style={style} accessible={false} />;
  }
  return <MaterialCommunityIcons name="wallet-outline" size={size} color={color} style={style} accessible={false} />;
}
