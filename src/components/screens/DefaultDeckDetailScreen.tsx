import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/RootNavigator';
import api from '../../services/api';
import * as Haptics from 'expo-haptics';
import colors from '../../themes/colors';
import WakeServerModalGate from '../common/WakeServerModalGate';
import ModalBase from '../common/ModalBase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';

type Props = {
  route: RouteProp<MainStackParamList, 'DefaultDeck'>;
  navigation: any;
};

type Card = {
  _id: string;
  name: string;
  definition: string;
  word_type?: string;
  category?: string[];
};

export default function DefaultDeckDetailScreen({ route, navigation }: Props) {
  const { deckId } = route.params;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const deckQuery = useQuery({
    queryKey: queryKeys.defaultDeck(deckId),
    queryFn: async () => {
      const { data } = await api.get(`/api/default-decks/${deckId}`);
      return data as { _id: string; name: string; description: string };
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
  const cardsQuery = useQuery({
    queryKey: queryKeys.defaultDeckCards(deckId, page, 10),
    queryFn: async () => {
      const { data } = await api.get(`/api/default-decks/${deckId}/cards`, { params: { page, limit: 10 } });
      return data as { cards: Card[]; totalPages: number };
    },
    keepPreviousData: true,
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Multi-select state for adding multiple default cards to personal deck
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveVisible, setSaveVisible] = useState(false);
  const [userDecks, setUserDecks] = useState<Array<{ _id: string; name: string }>>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const openDeckPicker = async () => {
    if (selectedIds.size === 0) return;
    setSaveVisible(true);
    setLoadingDecks(true);
    try {
      const { data } = await api.get('/api/decks', { params: { page: 1, limit: 50 } });
      setUserDecks(data.decks || []);
    } catch (e) {
      Alert.alert('Failed to load your decks');
      setSaveVisible(false);
    } finally {
      setLoadingDecks(false);
    }
  };

  const addSelectedToMyDeck = async (targetDeckId: string) => {
    if (selectedIds.size === 0) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const ids = Array.from(selectedIds);
      // Follow existing working endpoints (also used in other screens)
      const body: any = { defaultCardId: ids };
      await api.post(`/api/decks/${targetDeckId}/cards/from-default`, body);
      setSaveVisible(false);
      Alert.alert('Added', `Added ${ids.length} card(s) to your deck`);
      clearSelection();
      setSelecting(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.deckCards(targetDeckId, 1, 10) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.decks() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.deck(targetDeckId) });
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Add failed', e?.response?.data?.message || e?.message || 'Please try again');
    }
  };

  const cloneDeck = async () => {
    try {
      Haptics.selectionAsync();
      await api.post(`/api/decks/clone/${deckId}`);
      Alert.alert('Cloned', 'Deck cloned to your personal decks');
      await queryClient.invalidateQueries({ queryKey: queryKeys.decks() });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Clone failed', e?.response?.data?.message || 'Please try again');
    }
  };

  const renderItem = ({ item }: { item: Card }) => {
    const isSelected = selectedIds.has(item._id);
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          if (selecting) {
            toggleSelect(item._id);
          } else {
            navigation.navigate('DefaultCard', { deckId, cardId: item._id });
          }
        }}
        style={[styles.cardRow, selecting && { flexDirection: 'row', alignItems: 'center' }]}
      >
        {selecting && (
          <Pressable
            onPress={() => toggleSelect(item._id)}
            style={[styles.checkBox, isSelected && styles.checkBoxSelected]}
            accessibilityLabel={isSelected ? 'Deselect card' : 'Select card'}
          >
            {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name} {item.word_type ? `(${item.word_type})` : ''}
          </Text>
          <Text style={styles.cardDef} numberOfLines={2}>{item.definition}</Text>
          {!!item.category?.length && (
            <Text style={styles.cardCat} numberOfLines={1}>Category: {item.category.join(', ')}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <WakeServerModalGate />
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{deckQuery.data?.name || 'Default Deck'}</Text>
          {deckQuery.data?.description ? <Text style={styles.subtitle}>{deckQuery.data.description}</Text> : null}
        </View>
        <View style={{ gap: 8 }}>
          {!selecting ? (
            <>
              <Pressable style={styles.actionBtn} onPress={cloneDeck}><Text style={styles.actionText}>Clone</Text></Pressable>
              <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('DefaultReview', { deckId })}><Text style={styles.actionText}>Start Review</Text></Pressable>
              <Pressable style={[styles.actionBtn, styles.selectBtn]} onPress={() => { setSelecting(true); clearSelection(); }}>
                <Text style={styles.actionText}>Select Cards</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                disabled={selectedIds.size === 0}
                style={[styles.actionBtn, styles.addBtn, selectedIds.size === 0 && { opacity: 0.6 }]}
                onPress={openDeckPicker}
              >
                <Text style={styles.actionText}>Add Selected ({selectedIds.size})</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={() => { setSelecting(false); clearSelection(); }}>
                <Text style={styles.actionText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      {/* Deck picker for multi-add */}
      <ModalBase visible={saveVisible} onRequestClose={() => setSaveVisible(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Choose a deck</Text>
        {loadingDecks ? (
          <ActivityIndicator />
        ) : userDecks.length === 0 ? (
          <View>
            <Text style={{ marginBottom: 8 }}>You have no deck.</Text>
            <Pressable onPress={() => { setSaveVisible(false); navigation.getParent()?.navigate('My Decks'); }} style={styles.actionBtn}><Text style={styles.actionText}>Create deck</Text></Pressable>
          </View>
        ) : (
          <View>
            {userDecks.map((d) => (
              <Pressable key={d._id} style={[styles.cardRow, { marginBottom: 8 }]} onPress={() => addSelectedToMyDeck(d._id)}>
                <Text style={{ fontWeight: '800' }}>{d.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ModalBase>

      {deckQuery.isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {cardsQuery.isLoading ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={cardsQuery.data?.cards || []}
              keyExtractor={(c) => c._id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              contentContainerStyle={{ paddingVertical: 8 }}
              refreshing={cardsQuery.isFetching}
              onRefresh={() => cardsQuery.refetch()}
            />
          )}

          <View style={styles.pagination}>
            <Pressable style={[styles.pillBtn, page === 1 && styles.pillDisabled]} disabled={page === 1} onPress={() => setPage(1)}>
              <Text style={styles.pillText}>First</Text>
            </Pressable>
            <Pressable style={[styles.pillBtn, page === 1 && styles.pillDisabled]} disabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
              <Text style={styles.pillText}>Prev</Text>
            </Pressable>
            <Text style={{ fontWeight: '800' }}>{page} / {cardsQuery.data?.totalPages || 1}</Text>
            <Pressable style={[styles.pillBtn, page === (cardsQuery.data?.totalPages || 1) && styles.pillDisabled]} disabled={page === (cardsQuery.data?.totalPages || 1)} onPress={() => setPage((p) => Math.min(cardsQuery.data?.totalPages || 1, p + 1))}>
              <Text style={styles.pillText}>Next</Text>
            </Pressable>
            <Pressable style={[styles.pillBtn, page === (cardsQuery.data?.totalPages || 1) && styles.pillDisabled]} disabled={page === (cardsQuery.data?.totalPages || 1)} onPress={() => setPage(cardsQuery.data?.totalPages || 1)}>
              <Text style={styles.pillText}>Last</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  topBar: { flexDirection: 'row', gap: 12 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 13, color: '#333' },
  actionBtn: { backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionText: { fontWeight: '900' },
  cardRow: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 2, borderRadius: 12, padding: 12 },
  cardTitle: { fontWeight: '900', fontSize: 14 },
  cardDef: { fontSize: 13, marginTop: 4 },
  cardCat: { fontSize: 12, marginTop: 4, color: colors.subtext },
  pagination: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }
  ,
  pillBtn: { borderWidth: 2, borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.white },
  pillDisabled: { opacity: 0.5 },
  pillText: { fontWeight: '800' },
  checkBox: { width: 24, height: 24, borderWidth: 2, borderColor: colors.border, borderRadius: 6, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  checkBoxSelected: { backgroundColor: colors.primary },
  selectBtn: { backgroundColor: colors.white },
  addBtn: { backgroundColor: colors.primary },
  cancelBtn: { backgroundColor: colors.orange },
});
