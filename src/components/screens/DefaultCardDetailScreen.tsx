import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, FlatList, Image } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/RootNavigator';
import api from '../../services/api';
import colors from '../../themes/colors';
import WakeServerModalGate from '../common/WakeServerModalGate';
import { transformCloudinary } from '../../services/image';
import ModalBase from '../common/ModalBase';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';

type Props = {
  route: RouteProp<MainStackParamList, 'DefaultCard'>;
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

export default function DefaultCardDetailScreen({ route }: Props) {
  const { deckId, cardId } = route.params;
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { data: cardList, isLoading } = useQuery({
    queryKey: queryKeys.defaultDeckCards(deckId, 1, 100),
    queryFn: async () => {
      const { data } = await api.get(`/api/default-decks/${deckId}/cards`, { params: { page: 1, limit: 100 } });
      return data as { cards: Card[] };
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
  const card = (cardList?.cards || []).find((c) => c._id === cardId) || null;
  const [saveVisible, setSaveVisible] = useState(false);
  const [userDecks, setUserDecks] = useState<Array<{ _id: string; name: string }>>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);

  useEffect(() => {
    if (card?.name) navigation.setOptions({ headerTitle: card.name });
  }, [card?.name]);

  const openSave = async () => {
    setSaveVisible(true);
    setLoadingDecks(true);
    try {
      const { data } = await api.get('/api/decks', { params: { page: 1, limit: 50 } });
      setUserDecks(data.decks || []);
    } catch (e: any) {
      Alert.alert('Failed to load your decks');
    } finally {
      setLoadingDecks(false);
    }
  };

  const saveToDeck = async (targetDeckId: string) => {
    try {
      Haptics.selectionAsync();
      await api.post(`/api/decks/${targetDeckId}/cards/from-default`, {
        defaultCardId: [cardId],
      });
      setSaveVisible(false);
      Alert.alert('Saved', 'Card added to your deck');
      await queryClient.invalidateQueries({ queryKey: queryKeys.deckCards(targetDeckId, 1, 10) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.decks() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.deck(targetDeckId) });
      await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Save failed', e?.response?.data?.message || 'Please try again');
    }
  };

  useEffect(() => {
    if (card?.name) {
      navigation.setOptions({ headerTitle: card.name });
    }
  }, [card?.name]);

  if (isLoading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!card) return <View style={styles.center}><Text>Card not found.</Text></View>;

  return (
    <View style={styles.container}>
      <WakeServerModalGate />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{card.name} {card.word_type ? `(${card.word_type})` : ''}</Text>
        {!!card.url && <Image source={{ uri: transformCloudinary(card.url, { w: 800, q: 'auto', f: 'auto' }) || card.url }} style={styles.image} />}
        {!!card.definition && <Text style={styles.block}><Text style={styles.label}>Definition: </Text>{card.definition}</Text>}
        {!!card.hint && <Text style={styles.block}><Text style={styles.label}>Hint: </Text>{card.hint}</Text>}
        {!!card.category?.length && <Text style={styles.block}><Text style={styles.label}>Category: </Text>{card.category.join(', ')}</Text>}
        {!!card.example?.length && (
          <View style={styles.block}>
            <Text style={styles.label}>Examples:</Text>
            {card.example.map((ex, idx) => (
              <Text key={idx} style={styles.example}>• {ex}</Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={openSave}><Text style={styles.saveText}>Save to your deck</Text></Pressable>
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
          <FlatList
            data={userDecks}
            keyExtractor={(d) => d._id}
            renderItem={({ item }) => (
              <Pressable style={styles.deckRow} onPress={() => saveToDeck(item._id)}>
                <Text style={{ fontWeight: '800' }}>{item.name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </ModalBase>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
  image: { width: '100%', height: 200, borderRadius: 12, borderWidth: 2, borderColor: colors.border, marginTop: 12 },
  block: { marginTop: 12 },
  label: { fontWeight: '900' },
  example: { marginTop: 6, fontSize: 13 },
  footer: { borderTopWidth: 2, borderColor: colors.border, backgroundColor: colors.white, padding: 12 },
  saveBtn: { backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 2, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveText: { fontWeight: '900' },
  deckRow: { borderWidth: 2, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.white },
  createBtn: { backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  createText: { fontWeight: '900' }
});
