import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

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
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
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
});

