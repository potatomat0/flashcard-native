import React from 'react';
import { Modal, Pressable, StyleSheet, View, KeyboardAvoidingView, Platform, Text } from 'react-native';
import colors from '../../themes/colors';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
};

export default function ModalBase({ visible, onRequestClose, children }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.overlay} onPress={onRequestClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ alignSelf: 'stretch' }}>
          <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
            <Pressable accessibilityLabel="Close modal" onPress={onRequestClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
  },
  closeBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: colors.red,
    borderColor: colors.border,
    borderWidth: 2,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: { fontWeight: '900', color: '#000', fontSize: 16, lineHeight: 16 },
});
