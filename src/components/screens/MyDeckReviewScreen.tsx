import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import colors from '../../themes/colors';
import api from '../../services/api';
import * as Haptics from 'expo-haptics';
import ModalBase from '../common/ModalBase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';

type Props = {
  route: RouteProp<{ MyDeckReview: { deckId: string; session: any } }, 'MyDeckReview'>;
};

type FlashcardItem = { _id: string; name: string; definition: string; hint?: string; word_type?: string };
type McqItem = { card_id: string; prompt: string; options: string[]; correctAnswer: string };
type FillItem = { card_id: string; prompt: string; correctAnswer: string };

type QueueItem =
  | { type: 'flashcard'; card: FlashcardItem }
  | { type: 'mcq'; item: McqItem }
  | { type: 'fill'; item: FillItem };

export default function MyDeckReviewScreen({ route }: Props) {
  const { deckId, session } = route.params;
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const queue: QueueItem[] = useMemo(() => buildQueue(session), [session]);
  const [index, setIndex] = useState(0);
  const current = queue[index];
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [mcqResult, setMcqResult] = useState<null | 'correct' | 'wrong'>(null);
  const [fillResult, setFillResult] = useState<null | 'correct' | 'wrong'>(null);
  const [archiveCandidates, setArchiveCandidates] = useState<Record<string, { id: string; label: string }>>({});
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<Record<string, boolean>>({});

  const next = () => {
    setFlipped(false);
    setShowHint(false);
    setAnswer(null);
    setMcqResult(null);
    setFillResult(null);
    if (index < queue.length - 1) setIndex(index + 1);
    else {
      const count = Object.keys(archiveCandidates).length;
      if (count > 0) setShowArchiveModal(true);
      else navigation.goBack();
    }
  };

  const submitFlash = async (level: 'easy' | 'medium' | 'hard') => {
    const id = (current as any).card._id as string;
    try {
      await Haptics.selectionAsync();
      const { data } = await api.post(`/api/cards/${id}/review`, { retrievalLevel: level, hintWasShown: !!showHint });
      if (data?.frequency === 1) {
        setArchiveCandidates(prev => ({ ...prev, [id]: { id, label: `${(current as any).card.name}` } }));
      }
      await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
      await queryClient.invalidateQueries({ queryKey: queryKeys.card(id) });
    } catch (e: any) {
      // Non-blocking
    } finally {
      next();
    }
  };

  const submitResultApi = async (cardId: string, correct: boolean, label: string) => {
    const payload = { retrievalLevel: correct ? 'easy' : 'hard', hintWasShown: false };
    try {
      const { data } = await api.post(`/api/cards/${cardId}/review`, payload);
      if (data?.frequency === 1) {
        setArchiveCandidates(prev => ({ ...prev, [cardId]: { id: cardId, label } }));
      }
      await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
      await queryClient.invalidateQueries({ queryKey: queryKeys.card(cardId) });
    } catch {}
  };

  if (!current) return (
    <View style={styles.container}><Text>No items.</Text></View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Item {index + 1} / {queue.length}</Text>
        <Pressable style={styles.skipBtn} onPress={() => navigation.goBack()}><Text style={styles.skipText}>Exit</Text></Pressable>
      </View>

      {current.type === 'flashcard' && (
        <View style={styles.cardBox}>
          {!flipped ? (
            <View style={styles.centerBox}>
              <Text style={styles.cardName}>{current.card.name} {current.card.word_type ? `(${current.card.word_type})` : ''}</Text>
              {!!current.card.hint && (
                <View style={styles.block}>
                  {!showHint ? (
                    <Pressable style={styles.pillBtn} onPress={() => setShowHint(true)}><Text style={styles.pillText}>Show hint</Text></Pressable>
                  ) : (
                    <>
                      <Text style={{ marginTop: 6, textAlign: 'center' }}>{current.card.hint}</Text>
                      <Pressable style={[styles.pillBtn, { marginTop: 8 }]} onPress={() => setShowHint(false)}><Text style={styles.pillText}>Hide hint</Text></Pressable>
                    </>
                  )}
                </View>
              )}
              <Pressable style={[styles.pillBtn, { marginTop: 14 }]} onPress={() => setFlipped(true)}><Text style={styles.pillText}>Flip</Text></Pressable>
            </View>
          ) : (
            <ScrollView>
              <Text style={styles.cardName}>{current.card.name} {current.card.word_type ? `(${current.card.word_type})` : ''}</Text>
              <Text style={styles.block}><Text style={styles.label}>Definition: </Text>{current.card.definition}</Text>
              <View style={[styles.row, { marginTop: 14 }]}>
                {(['easy','medium','hard'] as const).map(l => (
                  <Pressable key={l} style={[styles.levelBtn, l==='easy'&&styles.levelEasy, l==='medium'&&styles.levelMed, l==='hard'&&styles.levelHard]} onPress={() => submitFlash(l)}>
                    <Text style={styles.levelText}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {current.type === 'mcq' && (
        <View style={styles.cardBox}>
          <Text style={styles.cardName}>{current.item.prompt}</Text>
          <View style={{ marginTop: 12 }}>
            {current.item.options.map((opt, idx) => {
              const selected = answer === opt;
              const isCorrect = opt === current.item.correctAnswer;
              const decorated = selected ? (isCorrect ? styles.optionCorrect : styles.optionWrong) : undefined;
              return (
                <Pressable
                  key={idx}
                  style={[styles.optionBtn, decorated]}
                  disabled={mcqResult !== null}
                  onPress={async () => {
                    const correct = isCorrect;
                    setAnswer(opt);
                    setMcqResult(correct ? 'correct' : 'wrong');
                    if (correct) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    await submitResultApi(current.item.card_id, correct, current.item.prompt);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
          {mcqResult && (
            <View style={[styles.feedbackBox, mcqResult==='correct'?styles.feedbackOk:styles.feedbackErr]}>
              <Text style={styles.feedbackText}>
                {mcqResult === 'correct' ? 'Correct!' : `Wrong. Correct: ${current.item.correctAnswer}`}
              </Text>
            </View>
          )}
          {mcqResult && (
            <Pressable style={styles.primaryBtn} onPress={next}><Text style={styles.primaryText}>Continue</Text></Pressable>
          )}
        </View>
      )}

      {current.type === 'fill' && (
        <View style={styles.cardBox}>
          <Text style={styles.cardName}>{current.item.prompt}</Text>
          <TextInput value={answer ?? ''} onChangeText={setAnswer as any} placeholder="Type your answer" style={styles.input} autoCapitalize="none" editable={fillResult===null} />
          {fillResult === null ? (
            <Pressable style={styles.primaryBtn} onPress={async () => {
              if (!answer) { Alert.alert('Enter an answer'); return; }
              const correct = normalize(answer) === normalize(current.item.correctAnswer);
              setFillResult(correct ? 'correct' : 'wrong');
              if (correct) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              await submitResultApi(current.item.card_id, correct, current.item.prompt);
            }}>
              <Text style={styles.primaryText}>Submit</Text>
            </Pressable>
          ) : (
            <>
              <View style={[styles.feedbackBox, fillResult==='correct'?styles.feedbackOk:styles.feedbackErr]}>
                <Text style={styles.feedbackText}>
                  {fillResult === 'correct' ? 'Correct!' : `Wrong. Correct: ${current.item.correctAnswer}`}
                </Text>
              </View>
              <Pressable style={[styles.primaryBtn, { marginTop: 8 }]} onPress={next}><Text style={styles.primaryText}>Continue</Text></Pressable>
            </>
          )}
        </View>
      )}
      {/* Archive modal */}
      <ModalBase visible={showArchiveModal} onRequestClose={() => setShowArchiveModal(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>You’ve remembered these well. Remove from future sessions?</Text>
        <ScrollView style={{ maxHeight: 320 }}>
          {Object.values(archiveCandidates).map(item => (
            <Pressable key={item.id} style={styles.modalRow} onPress={() => setSelectedArchive(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
              <View style={styles.checkbox}>{selectedArchive[item.id] ? <View style={styles.checkboxInner} /> : null}</View>
              <Text style={{ fontWeight: '800' }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={async () => {
            const ids = Object.keys(selectedArchive).filter(k => selectedArchive[k]);
            for (const id of ids) {
              try { await api.patch(`/api/cards/${id}`, { isArchived: true }); } catch {}
            }
            setShowArchiveModal(false);
            await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
            for (const id of Object.keys(selectedArchive)) {
              if (selectedArchive[id]) await queryClient.invalidateQueries({ queryKey: queryKeys.card(id) });
            }
            navigation.goBack();
          }}>
            <Text style={styles.primaryText}>Confirm</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, { flex: 1, backgroundColor: '#fff' }]} onPress={() => { setShowArchiveModal(false); navigation.goBack(); }}>
            <Text style={styles.primaryText}>Skip</Text>
          </Pressable>
        </View>
      </ModalBase>
    </View>
  );
}

function buildQueue(session: any): QueueItem[] {
  const q: QueueItem[] = [];
  const f = (session.flashcard || []) as FlashcardItem[];
  const m = (session.mcq || []) as McqItem[];
  const b = (session.fillInTheBlank || []) as FillItem[];
  const max = Math.max(f.length, m.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < f.length) q.push({ type: 'flashcard', card: f[i] });
    if (i < m.length) q.push({ type: 'mcq', item: m[i] });
    if (i < b.length) q.push({ type: 'fill', item: b[i] });
  }
  return q;
}

const normalize = (s: string) => s.trim().toLowerCase();

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '900' },
  skipBtn: { borderWidth: 2, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.orange },
  skipText: { fontWeight: '900' },
  cardBox: { flex: 1, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 16, marginTop: 12 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  block: { marginTop: 12 },
  label: { fontWeight: '900' },
  pillBtn: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 6, backgroundColor: colors.white },
  pillText: { fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  levelBtn: { borderWidth: 2, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.white },
  levelText: { fontWeight: '900' },
  levelEasy: { backgroundColor: '#DCFCE7' },
  levelMed: { backgroundColor: '#FEF9C3' },
  levelHard: { backgroundColor: '#FEE2E2' },
  optionBtn: { borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.white, marginBottom: 8 },
  optionText: { fontWeight: '900' },
  optionCorrect: { backgroundColor: '#DCFCE7' },
  optionWrong: { backgroundColor: '#FEE2E2' },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  primaryBtn: { marginTop: 12, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontWeight: '900' },
  feedbackBox: { marginTop: 10, borderWidth: 2, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  feedbackOk: { borderColor: '#16A34A', backgroundColor: '#DCFCE7' },
  feedbackErr: { borderColor: '#DC2626', backgroundColor: '#FEE2E2' },
  feedbackText: { fontWeight: '900' },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.white, marginBottom: 8 },
  checkbox: { width: 18, height: 18, borderWidth: 2, borderColor: colors.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxInner: { width: 10, height: 10, backgroundColor: colors.primary },
});
