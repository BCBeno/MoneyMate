import React from 'react';
import { Modal as RNModal, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import BottomSheetPicker from '../BottomSheetPicker';
import MonthPickerModal from '../MonthPickerModal';

jest.mock('../AppIcon', () => () => null);

const onSelect = jest.fn();
const onClose = jest.fn();
const picker = (visible = true) => <BottomSheetPicker
  visible={visible}
  title="Select category"
  items={[{ key: 'food', label: 'Food' }, { key: 'travel', label: 'Travel' }]}
  selectedKey="food"
  onSelect={onSelect}
  onClose={onClose}
/>;

beforeEach(() => jest.clearAllMocks());

it('covers the background with a dismiss target and closes without selecting an item', () => {
  render(picker());
  const backdrop = screen.getByRole('button', { name: 'Dismiss Select category' });
  expect(StyleSheet.flatten(backdrop.props.style)).toEqual(expect.objectContaining({
    position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
  }));
  fireEvent.press(backdrop);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
}, 30_000);

it('closes from the X button', () => {
  render(picker());
  fireEvent.press(screen.getByRole('button', { name: 'Close Select category' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
});

it('keeps Android Back connected to the same close action', () => {
  render(picker());
  fireEvent(screen.UNSAFE_getByType(RNModal), 'requestClose');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
});

it('selects an item and closes exactly once', () => {
  render(picker());
  fireEvent.press(screen.getByRole('button', { name: 'Travel' }));
  expect(onSelect).toHaveBeenCalledWith('travel');
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it.each([
  { distance: 120, velocity: 0 },
  { distance: 24, velocity: 1000 },
])('closes after a downward drag ($distance px, $velocity px/s)', async ({ distance, velocity }) => {
  render(picker());
  fireGestureHandler(getByGestureTestId('bottom-sheet-drag'), [
    { state: State.BEGAN, translationY: 0, velocityY: 0 },
    { state: State.ACTIVE, translationY: distance, velocityY: velocity },
    { state: State.END, translationY: distance, velocityY: velocity },
  ]);
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onSelect).not.toHaveBeenCalled();
});

it.each([
  { distance: 24, finalState: State.END },
  { distance: 120, finalState: State.CANCELLED },
])('keeps the sheet open after an incomplete gesture', ({ distance, finalState }) => {
  render(picker());
  fireGestureHandler(getByGestureTestId('bottom-sheet-drag'), [
    { state: State.BEGAN, translationY: 0, velocityY: 0 },
    { state: State.ACTIVE, translationY: distance, velocityY: 0 },
    { state: finalState, translationY: distance, velocityY: 0 },
  ]);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Food' }));
  expect(onSelect).toHaveBeenCalledWith('food');
});

it('does not mount interactive content while hidden', () => {
  render(picker(false));
  expect(screen.queryByText('Food')).toBeNull();
});

it('discards an unconfirmed month when dismissed and reopened', () => {
  const props = { value: '2026-10', onChange: onSelect, onClose };
  const { rerender } = render(<MonthPickerModal visible {...props} />);
  fireEvent.press(screen.getByRole('button', { name: 'Jan' }));
  fireEvent.press(screen.getByRole('button', { name: 'Dismiss Choose month' }));
  expect(onSelect).not.toHaveBeenCalled();
  rerender(<MonthPickerModal visible={false} {...props} />);
  rerender(<MonthPickerModal visible {...props} />);
  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(onSelect).toHaveBeenCalledWith('2026-10');
});
