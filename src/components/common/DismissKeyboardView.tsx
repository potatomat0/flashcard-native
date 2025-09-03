import React from 'react';
import { Keyboard, TouchableWithoutFeedback, View, ViewProps } from 'react-native';

export default function DismissKeyboardView({ children, ...rest }: ViewProps & { children: React.ReactNode }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View {...rest}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

