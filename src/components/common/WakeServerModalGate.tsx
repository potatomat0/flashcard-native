import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import ModalBase from './ModalBase';
import * as Haptics from 'expo-haptics';
import { pingServer } from '../../services/api';

let hasStartedPing = false;
let pingResolved = false;
let pingPromise: Promise<boolean> | null = null;

export default function WakeServerModalGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    let showed = false;

    if (!hasStartedPing) {
      hasStartedPing = true;
      pingPromise = pingServer().then((ok) => {
        pingResolved = true;
        return ok;
      });
    }

    const timer = setTimeout(async () => {
      if (!mounted || pingResolved) return;
      showed = true;
      setVisible(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 2000);

    (async () => {
      try {
        await (pingPromise || pingServer());
      } finally {
        clearTimeout(timer);
        if (mounted && showed) {
          setVisible(false);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    })();

    return () => { mounted = false; clearTimeout(timer); };
  }, []);

  return (
    <ModalBase visible={visible} onRequestClose={() => {}}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ fontWeight: '900', textAlign: 'center' }}>The server is waking up, please wait for a minute…</Text>
      </View>
    </ModalBase>
  );
}

