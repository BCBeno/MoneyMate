import AppIcon from './AppIcon';
import React, { useEffect } from 'react';
import {
  Modal as RNModal, View, Text, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export default function Modal({ visible, onClose, title, children, scrollable }: ModalProps) {
  const { height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const sheetHeight = useSharedValue(height);

  useEffect(() => {
    cancelAnimation(translateY);
    translateY.value = 0;
    return () => cancelAnimation(translateY);
  }, [visible, translateY]);

  const drag = Gesture.Pan()
    .withTestId('bottom-sheet-drag')
    .activeOffsetY(8)
    .failOffsetY(-8)
    .failOffsetX([-20, 20])
    .onBegin(() => {
      cancelAnimation(translateY);
    })
    .onUpdate(event => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (event.translationY > 80 || (event.translationY > 12 && event.velocityY > 800)) {
        translateY.value = withTiming(sheetHeight.value, { duration: 180 }, finished => {
          if (finished) scheduleOnRN(onClose);
        });
      } else {
        translateY.value = withSpring(0, { damping: 24, stiffness: 250 });
      }
    })
    .onFinalize((_event, success) => {
      if (!success) translateY.value = withSpring(0, { damping: 24, stiffness: 250 });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - translateY.value / Math.max(1, sheetHeight.value)),
  }));

  if (!visible) return null;

  return (
    <RNModal visible transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.overlay, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={title ? `Dismiss ${title}` : 'Dismiss dialog'}
            onPress={onClose}
          />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, {
              maxHeight: Math.min(height * 0.9, height - top - 16),
              paddingBottom: Math.max(spacing.xl, bottom + 16),
            }, sheetStyle]}
            onLayout={event => { sheetHeight.value = event.nativeEvent.layout.height; }}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <GestureDetector gesture={drag}>
              <View collapsable={false}>
                <View style={styles.handle} />
                <View style={styles.header}>
                  {title && <Text style={styles.title} accessibilityRole="header">{title}</Text>}
                  <Pressable
                    onPress={onClose}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={title ? `Close ${title}` : 'Close dialog'}
                  >
                    <AppIcon name="x" size={20} color={colors.text.secondary} />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>
            {scrollable
              ? <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">{children}</ScrollView>
              : <View style={styles.content}>{children}</View>
            }
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.elevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, borderTopWidth: 1, borderColor: colors.border.default },
  handle: { width: 40, height: 4, backgroundColor: colors.border.default, borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: colors.text.primary, marginRight: spacing.md },
  closeBtn: { width: 44, height: 44, marginLeft: 'auto', borderRadius: radius.full, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' },
  content: { flexShrink: 1 },
});
