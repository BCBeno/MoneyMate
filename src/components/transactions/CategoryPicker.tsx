import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Category } from '../../constants/categories';

interface Props {
  categories: Category[];
  selected?: number;
  onSelect: (id: number) => void;
}

export default function CategoryPicker({ categories, selected, onSelect }: Props) {
  return (
    <FlatList
      data={categories}
      keyExtractor={c => c.id.toString()}
      numColumns={4}
      scrollEnabled={false}
      renderItem={({ item: c }) => {
        const isSelected = c.id === selected;
        return (
          <TouchableOpacity style={styles.item} onPress={() => onSelect(c.id)} activeOpacity={0.7}>
            <View style={[styles.iconWrap, {
              backgroundColor: c.color + '22',
              borderColor: isSelected ? c.color : 'transparent',
              borderWidth: isSelected ? 2 : 0,
            }]}>
              <Text style={styles.icon}>{c.icon}</Text>
            </View>
            <Text style={[styles.name, isSelected && { color: c.color }]} numberOfLines={2}>
              {c.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', padding: spacing.sm, maxWidth: '25%' },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  icon: { fontSize: 22 },
  name: { fontSize: 10, color: colors.text.secondary, textAlign: 'center', lineHeight: 13 },
});
