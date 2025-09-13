import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, TextInput, ActivityIndicator, Keyboard, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import ModalBase from '../common/ModalBase';
import LabeledInput from '../common/LabeledInput';
import * as Haptics from 'expo-haptics';
import colors from '../../themes/colors';
import { transformCloudinary } from '../../services/image';
import * as ImagePicker from 'expo-image-picker';
import WakeServerModalGate from '../common/WakeServerModalGate';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';
import { uploadImage } from '../../services/upload';

type Deck = { _id: string; name: string; description?: string; url?: string };
type Card = { _id: string; name: string; definition: string; word_type?: string };

export default function MyDecksScreen() {
  const queryClient = useQueryClient();
  const { data: decksData, isLoading: loading } = useQuery({
    queryKey: queryKeys.decks(),
    queryFn: async () => {
      const { data } = await api.get('/api/decks', { params: { page: 1, limit: 50 } });
      return data as { decks: Deck[] };
    },
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deckUrl, setDeckUrl] = useState('');
  const navigation = useNavigation<any>();
  // Search state (live-as-you-type)
  const [query, setQuery] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const limit = 20;
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      setDebouncedQuery(q);
      setSearchPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: queryKeys.searchCards(debouncedQuery, searchPage, limit),
    queryFn: async () => {
      const { data } = await api.get('/api/cards/search', { params: { name: debouncedQuery, definition: debouncedQuery, page: searchPage, limit } });
      return data as { cards: Card[]; totalPages: number; currentPage?: number };
    },
    enabled: !!debouncedQuery,
    keepPreviousData: true,
  });

  const decks = decksData?.decks || [];

  const searchResults = searchData?.cards || [];
  const searchTotalPages = searchData?.totalPages || 1;

  const createDeckMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; url?: string }) => {
      await api.post('/api/decks', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.decks() });
    },
  });

  const createDeck = async () => {
    if (!name.trim()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload: { name: string; description?: string; url?: string } = { name: name.trim() };
      if (description.trim()) payload.description = description.trim();
      if (deckUrl.trim()) payload.url = deckUrl.trim();
      await createDeckMutation.mutateAsync(payload);
      setVisible(false);
      setName('');
      setDescription('');
      setDeckUrl('');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Create failed', e?.response?.data?.message || 'Please try again');
    }
  };

  const pickDeckImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to upload an image.');
        return;
      }
      const MP: any = ImagePicker as any;
      const pickerOptions: any = { allowsEditing: true, quality: 0.85 };
      if (MP?.MediaType?.Images) pickerOptions.mediaTypes = MP.MediaType.Images;
      else if (MP?.MediaTypeOptions?.Images) pickerOptions.mediaTypes = MP.MediaTypeOptions.Images;
      const res = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      await Haptics.selectionAsync();
      const url = await uploadImage({ uri: asset.uri, fileName: (asset as any).fileName, mimeType: (asset as any).mimeType });
      setDeckUrl(url);
      Alert.alert('Image selected', 'The deck image will be used when you create it.');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e?.response?.data?.message || e?.message || 'Please try again';
      Alert.alert('Upload failed', msg);
    }
  };

  return (
    <View style={styles.container}>
      <WakeServerModalGate />
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Decks</Text>
        <Pressable style={styles.createBtn} onPress={() => setVisible(true)}><Text style={styles.createText}>+ New</Text></Pressable>
      </View>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="search card by name or definition"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => { Keyboard.dismiss(); /* live search handled by debounce */ }}
          style={styles.searchInput}
          placeholderTextColor={colors.subtext}
          returnKeyType="search"
        />
        {query ? (
          <Pressable style={styles.clearBtn} onPress={() => { setQuery(''); setSearchPage(1); }}>
            <Text style={{ fontWeight: '900' }}>×</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.createBtn, { marginLeft: 8 }]} onPress={() => Keyboard.dismiss()}>
          <Text style={styles.createText}>Search</Text>
        </Pressable>
      </View>

      {query ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '900', marginBottom: 6 }}>Search Results</Text>
          {searchLoading ? (
            <ActivityIndicator />
          ) : searchResults.length === 0 ? (
            <Text>No results</Text>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(c) => c._id}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => navigation.navigate('MyCardDetail', { cardId: item._id })}>
                  <Text style={{ fontWeight: '900' }}>{item.name} {item.word_type ? `(${item.word_type})` : ''}</Text>
                  <Text style={{ color: colors.subtext }} numberOfLines={2}>{item.definition}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          )}
          {searchTotalPages > 1 && (
            <View style={styles.pagination}>
              <Pressable style={[styles.pillBtn, searchPage === 1 && styles.pillDisabled]} disabled={searchPage === 1} onPress={() => setSearchPage(1)}>
                <Text style={styles.pillText}>First</Text>
              </Pressable>
              <Pressable style={[styles.pillBtn, searchPage === 1 && styles.pillDisabled]} disabled={searchPage === 1} onPress={() => setSearchPage((p) => Math.max(1, p - 1))}>
                <Text style={styles.pillText}>Prev</Text>
              </Pressable>
              <Text style={{ fontWeight: '800' }}>{searchPage} / {searchTotalPages}</Text>
              <Pressable style={[styles.pillBtn, searchPage === searchTotalPages && styles.pillDisabled]} disabled={searchPage === searchTotalPages} onPress={() => setSearchPage((p) => Math.min(searchTotalPages, p + 1))}>
                <Text style={styles.pillText}>Next</Text>
              </Pressable>
              <Pressable style={[styles.pillBtn, searchPage === searchTotalPages && styles.pillDisabled]} disabled={searchPage === searchTotalPages} onPress={() => setSearchPage(searchTotalPages)}>
                <Text style={styles.pillText}>Last</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : loading ? (
        <Text>Loading...</Text>
      ) : decks.length === 0 ? (
        <Text>You don't have any decks yet. Create one to get started.</Text>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d._id}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('MyDeckDetail', { deckId: item._id })}>
              {item.url ? (
                <Image source={{ uri: transformCloudinary(item.url, { w: 400, q: 'auto', f: 'auto', c: 'fill' }) || item.url }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]} />
              )}
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
            </Pressable>
          )}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshing={loading}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.decks() })}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <ModalBase visible={visible} onRequestClose={() => setVisible(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Create Deck</Text>
        {deckUrl ? (
          <Image
            source={{ uri: transformCloudinary(deckUrl, { w: 800, q: 'auto', f: 'auto', c: 'fill' }) || deckUrl }}
            style={{ width: '100%', aspectRatio: 16/9, borderRadius: 10, borderWidth: 2, borderColor: colors.border, marginBottom: 8 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', aspectRatio: 16/9, borderRadius: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: '#e5e5e5', marginBottom: 8 }} />
        )}
        <Pressable style={[styles.createBtn, { marginBottom: 10 }]} onPress={pickDeckImage}>
          <Text style={styles.createText}>Choose Image</Text>
        </Pressable>
        <LabeledInput label="Name" placeholder="My Awesome Deck" value={name} onChangeText={setName} />
        <LabeledInput label="Description" placeholder="What is this deck about?" value={description} onChangeText={setDescription} />
        <Pressable style={styles.createBtn} onPress={createDeck}><Text style={styles.createText}>Create</Text></Pressable>
      </ModalBase>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '900' },
  createBtn: { backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  createText: { fontWeight: '900' },
  row: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  searchInput: { flex: 1, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  clearBtn: { marginLeft: 8, borderWidth: 2, borderColor: colors.border, borderRadius: 999, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  pagination: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  pillBtn: { borderWidth: 2, borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.white },
  pillDisabled: { opacity: 0.5 },
  pillText: { fontWeight: '800' },
  card: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 8, backgroundColor: colors.white },
  image: { width: '100%', aspectRatio: 16/9, borderRadius: 8, marginBottom: 8 },
  imagePlaceholder: { backgroundColor: '#e5e5e5', borderWidth: 2, borderColor: colors.border, width: '100%', aspectRatio: 16/9, borderRadius: 8, marginBottom: 8 },
  cardTitle: { fontWeight: '900', fontSize: 14 },
  cardDesc: { fontSize: 12, color: colors.subtext },
});
