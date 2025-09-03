import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/RootNavigator';
import api from '../../services/api';
import * as Haptics from 'expo-haptics';
import colors from '../../themes/colors';
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

  const renderItem = ({ item }: { item: Card }) => (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        navigation.navigate('DefaultCard', { deckId, cardId: item._id });
      }}
      style={styles.cardRow}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.name} {item.word_type ? `(${item.word_type})` : ''}
      </Text>
      <Text style={styles.cardDef} numberOfLines={2}>{item.definition}</Text>
      {!!item.category?.length && (
        <Text style={styles.cardCat} numberOfLines={1}>Category: {item.category.join(', ')}</Text>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{deckQuery.data?.name || 'Default Deck'}</Text>
          {deckQuery.data?.description ? <Text style={styles.subtitle}>{deckQuery.data.description}</Text> : null}
        </View>
        <View style={{ gap: 8 }}>
          <Pressable style={styles.actionBtn} onPress={cloneDeck}><Text style={styles.actionText}>Clone</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('DefaultReview', { deckId })}><Text style={styles.actionText}>Start Review</Text></Pressable>
        </View>
      </View>

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
});
