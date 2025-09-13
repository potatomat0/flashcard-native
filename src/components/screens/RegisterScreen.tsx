import React, { useEffect, useMemo, useState } from 'react';
import {Image, View, Text, StyleSheet, Pressable, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';
import LabeledInput from '../common/LabeledInput';
import colors from '../../themes/colors';
import DismissKeyboardView from '../common/DismissKeyboardView';
import * as Haptics from 'expo-haptics';
import ModalBase from '../common/ModalBase';
import { ActivityIndicator } from 'react-native';
import { pingServer } from '../../services/api';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameError = useMemo(() => {
    if (!username) return 'Username is required';
    return username.length < 3 ? 'Minimum 3 characters' : null;
  }, [username]);

  const nameError = useMemo(() => {
    if (!name) return 'Name is required';
    return null;
  }, [name]);

  const emailError = useMemo(() => {
    if (!email) return 'Email is required';
    return /.+@.+\..+/.test(email) ? null : 'Invalid email format';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required';
    return password.length < 6 ? 'Minimum 6 characters' : null;
  }, [password]);

  const isValid = !usernameError && !nameError && !emailError && !passwordError;

  // Wake-up modal if ping takes longer than 2s
  const [wakeupVisible, setWakeupVisible] = useState(false);
  useEffect(() => {
    let mounted = true;
    let showed = false;
    const showTimer = setTimeout(async () => {
      if (!mounted) return;
      showed = true;
      setWakeupVisible(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 2000);
    (async () => {
      await pingServer();
      clearTimeout(showTimer);
      if (mounted && showed) {
        setWakeupVisible(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    })();
    return () => { mounted = false; clearTimeout(showTimer); };
  }, []);

  const onSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await register({ username: username.trim(), name: name.trim(), email: email.trim(), password });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Registration failed', e?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DismissKeyboardView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={24}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <ModalBase visible={wakeupVisible} onRequestClose={() => setWakeupVisible(false)}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ fontWeight: '900', textAlign: 'center' }}>The server is waking up, please wait for a minute…</Text>
        </View>
      </ModalBase>
      <Image source={require('../../logo.png')} style={styles.logo} />
      <Text style={styles.title}>Register</Text>
      <Text style={styles.subtitle}>Create a new account</Text>

      <LabeledInput
        label="Username"
        placeholder="Enter your username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        error={username ? usernameError : null}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
      />
      <LabeledInput
        label="Name"
        placeholder="Nguyen Van A"
        value={name}
        onChangeText={setName}
        error={name ? nameError : null}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
      />
      <LabeledInput
        label="Email"
        placeholder="name@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={email ? emailError : null}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
      />
      <LabeledInput
        label="Password"
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
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
        <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Register'}</Text>
      </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'stretch', justifyContent: 'center', backgroundColor: colors.bg },
  form: { flexGrow: 1, justifyContent: 'center' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 12, resizeMode: 'contain' },
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
});
