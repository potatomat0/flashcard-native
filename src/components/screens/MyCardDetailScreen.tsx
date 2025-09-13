import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { transformCloudinary, DEFAULT_CARD_IMAGE_URL } from '../../services/image';
import colors from '../../themes/colors';
import WakeServerModalGate from '../common/WakeServerModalGate';
import api from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';
import ModalBase from '../common/ModalBase';
import LabeledInput from '../common/LabeledInput';
import { uploadImage } from '../../services/upload';

type Props = {
  route: RouteProp<{ MyCardDetail: { cardId: string } }, 'MyCardDetail'>;
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
  frequency?: number;
  isArchived?: boolean;
};

export default function MyCardDetailScreen({ route }: Props) {
  const { cardId } = route.params;
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { data: card, isLoading: loading, refetch } = useQuery({
    queryKey: queryKeys.card(cardId),
    queryFn: async () => {
      const { data } = await api.get(`/api/cards/${cardId}`);
      return data as Card;
    },
  });

  useEffect(() => {
    if (card?.name) navigation.setOptions({ headerTitle: card.name });
  }, [card?.name]);

  const freqInfo = getFrequencyInfo(card?.frequency);

  const pickAndUploadImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to upload an image.');
        return;
      }
      const MP: any = ImagePicker as any;
      const pickerOptions: any = { allowsEditing: true, quality: 0.8 };
      if (MP?.MediaType?.Images) pickerOptions.mediaTypes = MP.MediaType.Images;
      else if (MP?.MediaTypeOptions?.Images) pickerOptions.mediaTypes = MP.MediaTypeOptions.Images;
      const res = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      await Haptics.selectionAsync();
      const url = await uploadImage({ uri: asset.uri, fileName: (asset as any).fileName, mimeType: (asset as any).mimeType });
      await api.patch(`/api/cards/${cardId}`, { url });
      Alert.alert('Updated', 'Card image updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.card(cardId) });
      await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
      await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e?.response?.data?.message || e?.message || 'Please try again';
      Alert.alert('Upload failed', msg);
    }
  };

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [wordType, setWordType] = useState('');
  const [hint, setHint] = useState('');
  const [categories, setCategories] = useState('');
  // Pull-to-refresh state must be declared before any conditional returns to respect Hooks order
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Haptics.selectionAsync();
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (card) {
      setName(card.name || '');
      setDefinition(card.definition || '');
      setWordType(card.word_type || '');
      setHint(card.hint || '');
      setCategories((card.category || []).join(', '));
    }
  }, [card?._id]);

  const saveEdits = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await api.patch(`/api/cards/${cardId}`, {
        name: name.trim(),
        definition: definition.trim(),
        word_type: wordType.trim(),
        hint: hint.trim(),
        category: categories.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setEditVisible(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.card(cardId) });
      await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
      await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
      Alert.alert('Updated', 'Card updated');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Update failed', 'Please try again');
    }
  };

  const deleteCard = async () => {
    Alert.alert('Delete card', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/cards/${cardId}`);
          await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
          await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Deleted', 'Card removed successfully');
          navigation.goBack();
        } catch (e) {
          Alert.alert('Delete failed');
        }
      } }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!card) return <View style={styles.center}><Text>Card not found.</Text></View>;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <WakeServerModalGate />
      <Text style={styles.title}>{card.name} {card.word_type ? `(${card.word_type})` : ''}</Text>
      {freqInfo && (
        <View style={[styles.freqBadge, { borderColor: freqInfo.color, backgroundColor: '#fff' }]}>
          <Text style={[styles.freqText, { color: freqInfo.color }]}>{freqInfo.text}</Text>
        </View>
      )}
      {(() => {
        const raw = card.url && card.url.trim() ? card.url : DEFAULT_CARD_IMAGE_URL;
        const uri = transformCloudinary(raw, { w: 800, q: 'auto', f: 'auto' }) || raw;
        return <Image source={{ uri }} style={styles.image} />;
      })()}
      <Text style={styles.block}><Text style={styles.label}>Definition: </Text>{card.definition}</Text>
      {!!card.category?.length && (
        <Text style={styles.block}><Text style={styles.label}>Category: </Text>{card.category.join(', ')}</Text>
      )}
      {typeof card.hint === 'string' && (
        <Text style={styles.block}><Text style={styles.label}>Hint: </Text>{card.hint}</Text>
      )}
      {!!card.example?.length && (
        <View style={styles.block}>
          <Text style={styles.label}>Examples:</Text>
          {card.example.map((e, i) => (
            <Text key={i} style={{ marginTop: 6 }}>• {e}</Text>
          ))}
        </View>
      )}

      <Pressable style={styles.primaryBtn} onPress={pickAndUploadImage}><Text style={styles.primaryText}>Change image</Text></Pressable>
      <Pressable style={[styles.primaryBtn, { marginTop: 8, backgroundColor: colors.orange }]} onPress={() => setEditVisible(true)}>
        <Text style={styles.primaryText}>Edit</Text>
      </Pressable>
      <Pressable style={[styles.primaryBtn, { marginTop: 8, backgroundColor: '#EF4444' }]} onPress={deleteCard}>
        <Text style={styles.primaryText}>Delete</Text>
      </Pressable>
      <Pressable
        style={[styles.primaryBtn, { marginTop: 8, backgroundColor: card.isArchived ? colors.primary : colors.orange }]}
        onPress={async () => {
          try {
            const newVal = !card?.isArchived;
            await api.patch(`/api/cards/${cardId}`, { isArchived: newVal });
            await queryClient.invalidateQueries({ queryKey: queryKeys.card(cardId) });
            await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
            await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
          } catch (e) {
            Alert.alert('Failed to update');
          }
        }}
      >
        <Text style={styles.primaryText}>{card?.isArchived ? 'Bring back to sessions' : 'Remove from future sessions'}</Text>
      </Pressable>

      {/* Edit Card Modal */}
      <ModalBase visible={editVisible} onRequestClose={() => setEditVisible(false)}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Edit Card</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          <LabeledInput label="Name" value={name} onChangeText={setName} placeholder="Word" />
          <LabeledInput label="Definition" value={definition} onChangeText={setDefinition} placeholder="Meaning" />
          <LabeledInput label="Word Type" value={wordType} onChangeText={setWordType} placeholder="e.g. noun" />
          <LabeledInput label="Hint" value={hint} onChangeText={setHint} placeholder="Optional hint" />
          <LabeledInput label="Categories" value={categories} onChangeText={setCategories} placeholder="comma,separated,cats" />
          <Pressable style={[styles.primaryBtn, { marginTop: 8 }]} onPress={saveEdits}><Text style={styles.primaryText}>Save</Text></Pressable>
        </ScrollView>
      </ModalBase>
    </ScrollView>
  );
}

function getFrequencyInfo(freq?: number): { color: string; text: string } | null {
  switch (freq) {
    case 1:
      return { color: colors.primary, text: 'You have mastered this word!' };
    case 2:
      return { color: colors.lightGreen, text: 'You recognize this word with ease' };
    case 3:
      return { color: colors.gray, text: 'You should start learning this word' };
    case 4:
      return { color: colors.orange, text: 'You have problem recognizing this word' };
    case 5:
      return { color: colors.red, text: 'You have problems remembering this word' };
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
  image: { width: '100%', height: 220, borderRadius: 12, borderWidth: 2, borderColor: colors.border, marginTop: 12 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
  placeholderText: { color: colors.subtext, fontWeight: '900' },
  block: { marginTop: 12 },
  label: { fontWeight: '900' },
  primaryBtn: { marginTop: 16, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontWeight: '900' },
  freqBadge: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, alignSelf: 'flex-start' },
  freqText: { fontWeight: '900' },
});
