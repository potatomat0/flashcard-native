import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';
import colors from '../../themes/colors';
import ModalBase from '../common/ModalBase';
import LabeledInput from '../common/LabeledInput';

export default function UserScreen() {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const [editVisible, setEditVisible] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [pwdVisible, setPwdVisible] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user?.username}</Text>
        <Text style={[styles.label, { marginTop: 12 }]}>Name</Text>
        <Text style={styles.value}>{user?.name}</Text>
        {!!user?.email && (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </>
        )}
      </View>

      <View style={styles.btnList}>
        <Pressable
          onPress={async () => { setName(user?.name || ''); setEmail(user?.email || ''); await Haptics.selectionAsync(); setEditVisible(true); }}
          style={[styles.btn, styles.editBtn]}
        >
          <Text style={styles.btnText}>Edit Profile</Text>
        </Pressable>
        <Pressable
          onPress={async () => { await Haptics.selectionAsync(); setPwdVisible(true); }}
          style={[styles.btn, styles.pwdBtn]}
        >
          <Text style={styles.btnText}>Change Password</Text>
        </Pressable>
        <Pressable
          onPress={async () => { await Haptics.selectionAsync(); logout(); }}
          style={[styles.btn, styles.logoutBtn]}
        >
          <Text style={styles.btnText}>Log out</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          Alert.alert('Delete Account', 'This will remove your account and all decks/cards. Proceed?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', style: 'destructive', onPress: async () => {
              Alert.alert('Confirm Deletion', 'Are you absolutely sure? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  try {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    await deleteAccount();
                  } catch {
                    Alert.alert('Delete failed');
                  }
                }}
              ]);
            }}
          ]);
        }}
        style={[styles.btn, styles.deleteBtn]}
      >
        <Text style={styles.btnText}>Delete Account</Text>
      </Pressable>

      <ModalBase visible={editVisible} onRequestClose={() => setEditVisible(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Edit Profile</Text>
        <ScrollView>
          <LabeledInput label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <LabeledInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <Pressable
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await updateProfile({ name: name.trim(), email: email.trim() });
                setEditVisible(false);
                Alert.alert('Saved', 'Profile updated');
              } catch (e: any) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Update failed', e?.response?.data?.message || 'Please try again');
              }
            }}
            style={[styles.btn, styles.saveBtn]}
          >
            <Text style={styles.btnText}>Save</Text>
          </Pressable>
        </ScrollView>
      </ModalBase>

      <ModalBase visible={pwdVisible} onRequestClose={() => setPwdVisible(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Change Password</Text>
        <ScrollView>
          <LabeledInput label="Current password" value={currentPwd} onChangeText={setCurrentPwd} secureTextEntry placeholder="••••••••" />
          <LabeledInput label="New password" value={newPwd} onChangeText={setNewPwd} secureTextEntry placeholder="At least 6 characters" />
          <LabeledInput label="Confirm new password" value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry placeholder="Repeat new password" />
          <Pressable
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (!newPwd || newPwd.length < 6) { Alert.alert('Validation', 'New password must be at least 6 characters.'); return; }
                if (newPwd !== confirmPwd) { Alert.alert('Validation', 'New passwords do not match.'); return; }
                // Call backend change password
                await (await import('../../services/api')).default.patch('/api/users/password', { currentPassword: currentPwd, newPassword: newPwd });
                setPwdVisible(false);
                setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
                Alert.alert('Updated', 'Password changed successfully.');
              } catch (e: any) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Change failed', e?.response?.data?.message || 'Please try again');
              }
            }}
            style={[styles.btn, styles.saveBtn]}
          >
            <Text style={styles.btnText}>Save</Text>
          </Pressable>
        </ScrollView>
      </ModalBase>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 12 },
  card: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 16 },
  label: { fontWeight: '900', fontSize: 12 },
  value: { fontSize: 16 },
  btnList: { marginTop: 12, gap: 10 },
  btn: { width: '100%', backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '900' },
  editBtn: { backgroundColor: colors.primary },
  pwdBtn: { backgroundColor: colors.white },
  logoutBtn: { backgroundColor: colors.orange },
  deleteBtn: { marginTop: 12, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.border, borderRadius: 12 },
  saveBtn: { marginTop: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
});
