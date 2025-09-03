import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
};

export default function LabeledInput({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...rest} style={[styles.input, style]} placeholderTextColor="#777" />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontWeight: '800', fontSize: 12, marginBottom: 6, letterSpacing: 0.6 },
  input: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  error: { color: '#b00020', marginTop: 6, fontSize: 12, fontWeight: '600' },
});

