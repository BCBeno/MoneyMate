import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DatePickerModal from '../DatePickerModal';

jest.mock('../AppIcon', () => () => null);
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'native-date-picker' });
});

const onChange = jest.fn();
const onClose = jest.fn();
const originalOS = Platform.OS;

beforeEach(() => jest.clearAllMocks());
afterEach(() => { Platform.OS = originalOS; });

it('handles Android cancellation without changing the date', () => {
  Platform.OS = 'android';
  render(<DatePickerModal visible value="2026-10-08" onChange={onChange} onClose={onClose} />);
  const nativePicker = screen.getByTestId('native-date-picker');
  expect(nativePicker.props.onChange).toBeUndefined();
  fireEvent(nativePicker, 'dismiss');
  expect(onChange).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
}, 30_000);

it('uses the new value callback and closes Android after confirming', () => {
  Platform.OS = 'android';
  render(<DatePickerModal visible value="2026-10-08" onChange={onChange} onClose={onClose} />);
  fireEvent(screen.getByTestId('native-date-picker'), 'valueChange', { nativeEvent: {} }, new Date(2026, 1, 28, 12));
  expect(onChange).toHaveBeenCalledWith('2026-02-28');
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('keeps the iOS spinner open during selection and closes from Done', () => {
  Platform.OS = 'ios';
  render(<DatePickerModal visible value="2026-10-08" onChange={onChange} onClose={onClose} />);
  fireEvent(screen.getByTestId('native-date-picker'), 'valueChange', { nativeEvent: {} }, new Date(2026, 9, 9, 12));
  expect(onChange).toHaveBeenCalledWith('2026-10-09');
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('closes the iOS date picker from the backdrop without changing the date', () => {
  Platform.OS = 'ios';
  render(<DatePickerModal visible value="2026-10-08" onChange={onChange} onClose={onClose} />);
  fireEvent.press(screen.getByRole('button', { name: 'Dismiss Select date' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onChange).not.toHaveBeenCalled();
});

it('uses the latest value when reopened instead of retaining stale date state', () => {
  Platform.OS = 'android';
  const { rerender } = render(<DatePickerModal visible value="2026-01-31" onChange={onChange} onClose={onClose} />);
  rerender(<DatePickerModal visible={false} value="2026-01-31" onChange={onChange} onClose={onClose} />);
  expect(screen.queryByTestId('native-date-picker')).toBeNull();
  rerender(<DatePickerModal visible value="2026-02-28" onChange={onChange} onClose={onClose} />);
  expect(screen.getByTestId('native-date-picker').props.value).toEqual(new Date(2026, 1, 28, 12));
});
