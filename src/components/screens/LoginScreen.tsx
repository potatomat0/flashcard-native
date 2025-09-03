import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Keyboard } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';
import LabeledInput from '../common/LabeledInput';
import colors from '../../themes/colors';
import DismissKeyboardView from '../common/DismissKeyboardView';
import * as Haptics from 'expo-haptics';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailError = useMemo(() => {
    if (!email) return 'Email is required';
    const ok = /.+@.+\..+/.test(email);
    return ok ? null : 'Invalid email format';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required';
    return password.length < 6 ? 'Minimum 6 characters' : null;
  }, [password]);

  const isValid = !emailError && !passwordError;

  const onSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await login(email.trim(), password);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login failed', e?.response?.data?.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DismissKeyboardView style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Access your flashcards securely</Text>

      <LabeledInput
        label="Email"
        placeholder="name@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        error={email ? emailError : null}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
      />
      <LabeledInput
        label="Password"
        placeholder="Your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={password ? passwordError : null}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
      />

      <Pressable
        onPress={onSubmit}
        disabled={loading || !isValid}
        style={[styles.button, (loading || !isValid) && styles.buttonDisabled]}
        onPressIn={() => Haptics.selectionAsync()}
      >
        <Text style={styles.buttonText}>{loading ? 'Logging in…' : 'Login'}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Register')} style={[styles.linkButton]}> 
        <Text style={styles.linkText}>Create an account</Text>
      </Pressable>
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'stretch', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, color: '#333' },
  button: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontWeight: '900', fontSize: 16 },
  linkButton: { marginTop: 14, alignItems: 'center' },
  linkText: { fontWeight: '800', textDecorationLine: 'underline' },
});
