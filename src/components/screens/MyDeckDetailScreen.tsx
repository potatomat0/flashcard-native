import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import ModalBase from '../common/ModalBase';
import WORD_TYPES from '../../data/wordTypes';
import LabeledInput from '../common/LabeledInput';
import * as Haptics from 'expo-haptics';
import colors from '../../themes/colors';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';

type Props = {
  route: RouteProp<{ MyDeckDetail: { deckId: string } }, 'MyDeckDetail'>;
};

type Deck = { _id: string; name: string; description?: string };
type Card = {
  _id: string;
  name: string;
  definition: string;
  word_type?: string;
  category?: string[];
  hint?: string;
  url?: string;
  isArchived?: boolean;
};

export default function MyDeckDetailScreen({ route }: Props) {
  const { deckId } = route.params;
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);

  // Deck edit modal
  const [deckModal, setDeckModal] = useState(false);
  const [dName, setDName] = useState('');
  const [dDesc, setDDesc] = useState('');

  // Card create/edit modal
  const [cardModal, setCardModal] = useState<{ visible: boolean; editing?: Card | null }>({ visible: false, editing: null });
  const [cName, setCName] = useState('');
  const [cDef, setCDef] = useState('');
  const [cType, setCType] = useState('');
  const [cHint, setCHint] = useState('');
  const [cCats, setCCats] = useState('');
  const [cUrl, setCUrl] = useState('');
  const [showTypeList, setShowTypeList] = useState(false);
  const [customType, setCustomType] = useState('');

  const openEditDeck = () => {
    setDName(deck?.name || '');
    setDDesc(deck?.description || '');
    setDeckModal(true);
  };

  const deckQuery = useQuery({
    queryKey: queryKeys.deck(deckId),
    queryFn: async () => {
      const { data } = await api.get(`/api/decks/${deckId}`);
      return data as Deck;
    },
  });

  const cardsQuery = useQuery({
    queryKey: queryKeys.deckCards(deckId, page, 10),
    queryFn: async () => {
      const { data } = await api.get(`/api/decks/${deckId}/cards`, { params: { page, limit: 10 } });
      return data as { cards: Card[]; totalPages: number };
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    if (deckQuery.data) {
      setDeck(deckQuery.data);
      navigation.setOptions({ headerTitle: deckQuery.data.name });
    }
    setLoading(!deckQuery.data && deckQuery.isLoading);
  }, [deckQuery.data, deckQuery.isLoading]);

  useEffect(() => {
    if (cardsQuery.data) {
      setCards(cardsQuery.data.cards || []);
      setTotalPages(cardsQuery.data.totalPages || 1);
    }
    setLoadingCards(cardsQuery.isLoading);
  }, [cardsQuery.data, cardsQuery.isLoading]);

  const updateDeck = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.patch(`/api/decks/${deckId}`, { name: dName.trim(), description: dDesc.trim() });
      setDeckModal(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.deck(deckId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.decks() });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Update failed', e?.response?.data?.message || 'Please try again');
    }
  };

  const deleteDeck = async () => {
    Alert.alert('Delete deck', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/decks/${deckId}`);
          await queryClient.invalidateQueries({ queryKey: queryKeys.decks() });
          navigation.goBack();
        } catch (e: any) { Alert.alert('Delete failed'); }
      }}
    ]);
  };

  const openCreateCard = () => {
    setCardModal({ visible: true, editing: null });
    setCName(''); setCDef(''); setCType(''); setCHint(''); setCCats(''); setCUrl('');
  };

  const openEditCard = (c: Card) => {
    setCardModal({ visible: true, editing: c });
    setCName(c.name); setCDef(c.definition); setCType(c.word_type || ''); setCHint(c.hint || ''); setCCats((c.category || []).join(', ')); setCUrl(c.url || '');
  };

  const upsertCard = async () => {
    const payload = {
      name: cName.trim(),
      definition: cDef.trim(),
      word_type: cType.trim(),
      hint: cHint.trim(),
      category: cCats.split(',').map((s) => s.trim()).filter(Boolean),
      url: cUrl.trim(),
    };
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (cardModal.editing) {
        await api.patch(`/api/cards/${cardModal.editing._id}`, payload);
      } else {
        await api.post(`/api/decks/${deckId}/cards`, payload);
      }
      setCardModal({ visible: false, editing: null });
      await queryClient.invalidateQueries({ queryKey: queryKeys.deckCards(deckId, page, 10) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.deck(deckId) });
      await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Save failed', e?.response?.data?.message || 'Please try again');
    }
  };

  const pickAndUploadImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to upload an image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const form = new FormData();
      form.append('image', {
        uri: asset.uri,
        // Try to infer a filename and type; fall back to jpeg
        name: asset.fileName || 'upload.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      await Haptics.selectionAsync();
      const { data } = await api.post('/api/upload', form as any, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = data.filePath;
      setCUrl(url);
      if (cardModal.editing) {
        // Instantly update the card's image
        await api.patch(`/api/cards/${cardModal.editing._id}`, { url });
        await queryClient.invalidateQueries({ queryKey: queryKeys.deckCards(deckId, page, 10) });
        await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
        Alert.alert('Updated', 'Card image updated');
      } else {
        Alert.alert('Uploaded', 'Image attached to new card');
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload failed', e?.response?.data?.message || 'Please try again');
    }
  };

  const deleteCard = async (id: string) => {
    Alert.alert('Delete card', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/cards/${id}`);
          await queryClient.invalidateQueries({ queryKey: queryKeys.deckCards(deckId, page, 10) });
          await queryClient.invalidateQueries({ queryKey: queryKeys.deck(deckId) });
          await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
        } catch { Alert.alert('Delete failed'); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{deck?.name || 'Deck'}</Text>
          {!!deck?.description && <Text style={styles.subtitle}>{deck?.description}</Text>}
        </View>
        <View style={{ gap: 8, flexDirection: 'row' }}>
          <Pressable style={[styles.iconBtn, styles.actionBtnEdit]} onPress={openEditDeck} accessibilityLabel="Edit deck">
            <Ionicons name="create-outline" size={18} color="#000" />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.actionBtnDelete]} onPress={deleteDeck} accessibilityLabel="Delete deck">
            <Ionicons name="trash-outline" size={18} color="#000" />
          </Pressable>
        </View>
      </View>

      <View style={{ height: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={styles.createBtn} onPress={openCreateCard}><Text style={styles.createText}>+ Add Card</Text></Pressable>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('MyDeckReviewSetup', { deckId })}><Text style={styles.primaryText}>Start Review</Text></Pressable>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : loadingCards ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c._id}
          renderItem={({ item }) => (
            <View style={[styles.cardRow, item.isArchived && styles.cardRowArchived]}>
              <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('MyCardDetail', { cardId: item._id })}>
                <Text style={[styles.cardTitle, item.isArchived && styles.archivedText]} numberOfLines={1}>{item.name} {item.word_type ? `(${item.word_type})` : ''}</Text>
                <Text style={[styles.cardDef, item.isArchived && styles.archivedText]} numberOfLines={2}>{item.definition}</Text>
                {!!item.category?.length && <Text style={[styles.cardCat, item.isArchived && styles.archivedText]} numberOfLines={1}>Category: {item.category.join(', ')}</Text>}
              </Pressable>
              <View style={{ gap: 8, marginLeft: 8 }}>
                <Pressable style={[styles.iconBtnSmall, styles.smallBtnEdit]} onPress={() => openEditCard(item)} accessibilityLabel="Edit card">
                  <Ionicons name="create-outline" size={18} color="#000" />
                </Pressable>
                <Pressable style={[styles.iconBtnSmall, styles.smallBtnDelete]} onPress={() => deleteCard(item._id)} accessibilityLabel="Delete card">
                  <Ionicons name="trash-outline" size={18} color="#000" />
                </Pressable>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshing={loadingCards}
          onRefresh={() => {
            // Invalidate current page cards to refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.deckCards(deckId, page, 10) });
          }}
        />
      )}

      <View style={styles.pagination}>
        <Pressable style={[styles.pillBtn, page === 1 && styles.pillDisabled]} disabled={page === 1} onPress={() => setPage(1)}>
          <Text style={styles.pillText}>First</Text>
        </Pressable>
        <Pressable style={[styles.pillBtn, page === 1 && styles.pillDisabled]} disabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
          <Text style={styles.pillText}>Prev</Text>
        </Pressable>
        <Text style={{ fontWeight: '800' }}>{page} / {totalPages}</Text>
        <Pressable style={[styles.pillBtn, page === totalPages && styles.pillDisabled]} disabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
          <Text style={styles.pillText}>Next</Text>
        </Pressable>
        <Pressable style={[styles.pillBtn, page === totalPages && styles.pillDisabled]} disabled={page === totalPages} onPress={() => setPage(totalPages)}>
          <Text style={styles.pillText}>Last</Text>
        </Pressable>
      </View>

      {/* Edit Deck Modal */}
      <ModalBase visible={deckModal} onRequestClose={() => setDeckModal(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Edit Deck</Text>
        <LabeledInput label="Name" value={dName} onChangeText={setDName} placeholder="Deck name" />
        <LabeledInput label="Description" value={dDesc} onChangeText={setDDesc} placeholder="Description" />
        <Pressable style={styles.primaryBtn} onPress={updateDeck}><Text style={styles.primaryText}>Save</Text></Pressable>
      </ModalBase>

      {/* Card Create/Edit Modal */}
      <ModalBase visible={cardModal.visible} onRequestClose={() => setCardModal({ visible: false, editing: null })}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>{cardModal.editing ? 'Edit Card' : 'Add Card'}</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          <LabeledInput label="Name" value={cName} onChangeText={setCName} placeholder="Word" />
          <LabeledInput label="Definition" value={cDef} onChangeText={setCDef} placeholder="Meaning" />
          <Text style={{ fontWeight: '900', marginBottom: 6 }}>Word Type</Text>
          <Pressable style={styles.selectLike} onPress={() => setShowTypeList((v) => !v)}>
            <Text style={cType ? styles.selectText : styles.selectPlaceholder}>{cType || 'Select word type'}</Text>
          </Pressable>
          {showTypeList && (
            <View style={styles.dropdownPanel}>
              <ScrollView style={{ maxHeight: 260 }}>
                {WORD_TYPES.map((t) => (
                  <Pressable key={t} style={styles.typeRow} onPress={() => { setCType(t); setShowTypeList(false); }}>
                    <Text style={{ fontWeight: '800' }}>{t}</Text>
                  </Pressable>
                ))}
                <View style={{ height: 8 }} />
                <Text style={{ fontWeight: '900', marginBottom: 6 }}>Other</Text>
                <LabeledInput label="Custom" value={customType} onChangeText={setCustomType} placeholder="e.g. collocation" />
                <Pressable style={[styles.primaryBtn, { marginTop: 6 }]} onPress={() => { if (customType.trim()) { setCType(customType.trim()); setCustomType(''); setShowTypeList(false); } }}>
                  <Text style={styles.primaryText}>Use custom</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}
          <LabeledInput label="Hint" value={cHint} onChangeText={setCHint} placeholder="Optional hint" />
          <LabeledInput label="Categories" value={cCats} onChangeText={setCCats} placeholder="comma,separated,cats" />
          <LabeledInput label="Image URL" value={cUrl} onChangeText={setCUrl} placeholder="https://…" />
          <Pressable style={[styles.primaryBtn, { marginTop: 6 }]} onPress={pickAndUploadImage}><Text style={styles.primaryText}>Pick image from device</Text></Pressable>
          <Pressable style={[styles.primaryBtn, { marginTop: 8 }]} onPress={upsertCard}><Text style={styles.primaryText}>{cardModal.editing ? 'Save' : 'Create'}</Text></Pressable>
      </ScrollView>
      </ModalBase>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  headerRow: { flexDirection: 'row', gap: 12 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 13, color: colors.subtext },
  iconBtn: { borderWidth: 2, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnEdit: { backgroundColor: '#F59E0B' },
  actionBtnDelete: { backgroundColor: '#EF4444' },
  actionText: { fontWeight: '900' },
  createBtn: { backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center' },
  createText: { fontWeight: '900' },
  cardRow: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 2, borderRadius: 12, padding: 12, flexDirection: 'row' },
  cardRowArchived: { borderColor: colors.gray, opacity: 0.8 },
  cardTitle: { fontWeight: '900', fontSize: 14 },
  cardDef: { fontSize: 13, marginTop: 4 },
  cardCat: { fontSize: 12, marginTop: 4, color: colors.subtext },
  archivedText: { textDecorationLine: 'line-through', color: colors.gray },
  iconBtnSmall: { borderWidth: 2, borderColor: colors.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  smallBtnEdit: { backgroundColor: '#F59E0B' },
  smallBtnDelete: { backgroundColor: '#EF4444' },
  smallText: { fontWeight: '900' },
  pagination: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  pillBtn: { borderWidth: 2, borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.white },
  pillDisabled: { opacity: 0.5 },
  pillText: { fontWeight: '800' },
  primaryBtn: { backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 2, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryText: { fontWeight: '900' }
  ,
  selectLike: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  selectText: { fontSize: 14 },
  selectPlaceholder: { fontSize: 14, color: colors.subtext },
  typeRow: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 10, padding: 10, marginBottom: 8 },
  dropdownPanel: { marginTop: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 10, padding: 8 }
});
