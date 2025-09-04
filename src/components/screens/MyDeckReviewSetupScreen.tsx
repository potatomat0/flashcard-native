import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Keyboard, TextInput } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import colors from '../../themes/colors';
import WakeServerModalGate from '../common/WakeServerModalGate';
import api from '../../services/api';

type Props = {
  route: RouteProp<{ MyDeckReviewSetup: { deckId: string } }, 'MyDeckReviewSetup'>;
};

export default function MyDeckReviewSetupScreen({ route }: Props) {
  const { deckId } = route.params;
  const navigation = useNavigation<any>();
  const [flashcard, setFlashcard] = useState('5');
  const [mcq, setMcq] = useState('3');
  const [fill, setFill] = useState('2');
  const [loading, setLoading] = useState(false);

  const start = async () => {
    const f = Math.max(0, parseInt(flashcard || '0', 10) || 0);
    const m = Math.max(0, parseInt(mcq || '0', 10) || 0);
    const fi = Math.max(0, parseInt(fill || '0', 10) || 0);
    if (f + m + fi === 0) {
      Alert.alert('Validation', 'Choose at least one item to review.');
      return;
    }
    setLoading(true);
    try {
      Keyboard.dismiss();
      const { data } = await api.post(`/api/decks/${deckId}/review-session`, { flashcard: f, mcq: m, fillInTheBlank: fi });
      navigation.replace('MyDeckReview', { deckId, session: data });
    } catch (e: any) {
      Alert.alert('Failed to start session', e?.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const NumberField = ({ label, value, onChangeText, onClear }: { label: string; value: string; onChangeText: (t: string) => void; onClear: () => void }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" style={styles.input} placeholder="0" />
        {!!value && (
          <Pressable accessibilityLabel={`Clear ${label}`} onPress={onClear} style={styles.clearBtn}>
            <Text style={{ fontWeight: '900' }}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <WakeServerModalGate />
      <Text style={styles.title}>Configure Session</Text>
      <NumberField label="Flashcard" value={flashcard} onChangeText={setFlashcard} onClear={() => setFlashcard('')} />
      <NumberField label="Multiple Choice" value={mcq} onChangeText={setMcq} onClear={() => setMcq('')} />
      <NumberField label="Fill in the Blank" value={fill} onChangeText={setFill} onClear={() => setFill('')} />

      <Pressable disabled={loading} onPress={start} style={[styles.primaryBtn, loading && { opacity: 0.6 }]}>
        <Text style={styles.primaryText}>{loading ? 'Starting…' : 'Start'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
  label: { fontWeight: '900', marginBottom: 6 },
  input: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  clearBtn: { position: 'absolute', right: 10, top: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.white },
  primaryBtn: { marginTop: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontWeight: '900' },
});
