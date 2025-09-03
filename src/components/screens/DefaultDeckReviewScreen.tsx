import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/RootNavigator';
import api from '../../services/api';
import { transformCloudinary } from '../../services/image';
import colors from '../../themes/colors';
import ModalBase from '../common/ModalBase';
import * as Haptics from 'expo-haptics';
import { Image } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';

type Props = {
  route: RouteProp<MainStackParamList, 'DefaultReview'>;
};

type Card = {
  _id: string;
  name: string;
  definition: string;
  hint?: string;
  example?: string[];
  category?: string[];
  word_type?: string;
  url?: string;
};

export default function DefaultDeckReviewScreen({ route }: Props) {
  const { deckId } = route.params;
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [userDecks, setUserDecks] = useState<Array<{ _id: string; name: string }>>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);

  const current = queue[index];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Request a simple session; use only flashcards to keep it simple
        const { data } = await api.post(`/api/default-decks/${deckId}/review-session`, {
          Flashcard: 10,
          MCQ: 0,
          fillInTheBlank: 0,
        });
        const cards: Card[] = (data.flashcard || []).map((c: any) => ({
          _id: c._id,
          name: c.name,
          definition: c.definition,
          hint: c.hint,
          example: c.example,
          category: c.category,
          word_type: c.word_type,
          url: c.url,
        }));
        setQueue(cards);
        setIndex(0);
        setFlipped(false);
        setShowHint(false);
      } catch (e: any) {
        // fallback: fetch cards list directly if session endpoint unavailable
        try {
          const { data } = await api.get(`/api/default-decks/${deckId}/cards`, { params: { page: 1, limit: 10 } });
          setQueue(data.cards || []);
          setIndex(0);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deckId]);

  const next = () => {
    if (index < queue.length - 1) {
      setIndex(index + 1);
      setFlipped(false);
      setShowHint(false);
    } else {
      navigation.goBack();
    }
  };

  const openSave = async () => {
    setSaveVisible(true);
    setLoadingDecks(true);
    try {
      const { data } = await api.get('/api/decks', { params: { page: 1, limit: 50 } });
      setUserDecks(data.decks || []);
    } finally {
      setLoadingDecks(false);
    }
  };

  const saveToDeck = async (targetDeckId: string) => {
    try {
      await Haptics.selectionAsync();
      await api.post(`/api/decks/${targetDeckId}/cards/from-default`, { defaultCardId: [current._id] });
      setSaveVisible(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.deckCards(targetDeckId, 1, 10) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.decks() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.deck(targetDeckId) });
      await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!current) return <View style={styles.center}><Text>No cards to review.</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Card {index + 1} / {queue.length}</Text>
        <Pressable style={styles.skipBtn} onPress={() => navigation.goBack()}><Text style={styles.skipText}>Skip Session</Text></Pressable>
      </View>

      <View style={styles.cardBox}>
        {!flipped ? (
          <View style={styles.unflippedCenter}>
            <Text style={styles.cardName}>{current.name} {current.word_type ? `(${current.word_type})` : ''}</Text>
            {typeof current.hint === 'string' && (
              <View style={[styles.block, { alignItems: 'center', width: '100%' }]}>
                {!showHint ? (
                  <Pressable style={styles.pillBtn} onPress={() => setShowHint(true)}><Text style={styles.pillText}>Show hint</Text></Pressable>
                ) : (
                  <>
                    <Text style={{ marginTop: 6, textAlign: 'center' }}>{current.hint}</Text>
                    <Pressable style={[styles.pillBtn, { marginTop: 8 }]} onPress={() => setShowHint(false)}><Text style={styles.pillText}>Hide hint</Text></Pressable>
                  </>
                )}
              </View>
            )}
            <Pressable accessibilityRole="button" onPress={() => setFlipped(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.flipIconBtn}>
              <Ionicons name="swap-horizontal" size={32} color="#000" />
            </Pressable>
          </View>
        ) : (
          <ScrollView>
            <Text style={styles.cardName}>{current.name} {current.word_type ? `(${current.word_type})` : ''}</Text>
            {!!current.url && <Image source={{ uri: transformCloudinary(current.url, { w: 800, q: 'auto', f: 'auto' }) || current.url }} style={styles.image} />}
            <Text style={styles.block}><Text style={styles.label}>Definition: </Text>{current.definition}</Text>
            {!!current.category?.length && (
              <Text style={styles.block}><Text style={styles.label}>Category: </Text>{current.category.join(', ')}</Text>
            )}
            {typeof current.hint === 'string' && (
              <View style={styles.block}>
                <Text style={styles.label}>Hint:</Text>
                <Text style={{ marginTop: 6 }}>{current.hint}</Text>
              </View>
            )}
            {!!current.example?.length && (
              <View style={styles.block}>
                <Text style={styles.label}>Examples:</Text>
                {current.example.map((e, i) => (
                  <Text key={i} style={{ marginTop: 6 }}>• {e}</Text>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={openSave}><Text style={styles.saveText}>Save to your deck</Text></Pressable>
        <Pressable style={styles.nextBtn} onPress={next}><Text style={styles.nextText}>{index < queue.length - 1 ? 'Next' : 'Finish'}</Text></Pressable>
      </View>

      <ModalBase visible={saveVisible} onRequestClose={() => setSaveVisible(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Choose a deck</Text>
        {loadingDecks ? (
          <ActivityIndicator />
        ) : userDecks.length === 0 ? (
          <View>
            <Text style={{ marginBottom: 8 }}>You have no deck.</Text>
            <Pressable onPress={() => { setSaveVisible(false); navigation.getParent()?.navigate('My Decks'); }} style={styles.createBtn}><Text style={styles.createText}>Create deck</Text></Pressable>
          </View>
        ) : (
          <ScrollView>
            {userDecks.map((d) => (
              <Pressable key={d._id} style={styles.deckRow} onPress={() => saveToDeck(d._id)}>
                <Text style={{ fontWeight: '800' }}>{d.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ModalBase>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '900' },
  skipBtn: { borderWidth: 2, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.orange },
  skipText: { fontWeight: '900' },
  cardBox: { flex: 1, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 16, marginTop: 12 },
  cardName: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  unflippedCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  image: { width: '100%', height: 200, borderRadius: 12, borderWidth: 2, borderColor: colors.border, marginTop: 12 },
  flipIconBtn: { marginTop: 12 },
  block: { marginTop: 12 },
  label: { fontWeight: '900' },
  pillBtn: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 6, backgroundColor: colors.white },
  pillText: { fontWeight: '800' },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 12 },
  saveBtn: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.primary },
  saveText: { fontWeight: '900' },
  nextBtn: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.primary },
  nextText: { fontWeight: '900' },
  deckRow: { borderWidth: 2, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.white, marginBottom: 8 },
  createBtn: { backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  createText: { fontWeight: '900' },
});
