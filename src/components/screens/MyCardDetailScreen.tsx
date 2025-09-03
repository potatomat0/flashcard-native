import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { transformCloudinary } from '../../services/image';
import colors from '../../themes/colors';
import api from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';

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
  const { data: card, isLoading: loading } = useQuery({
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
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to upload an image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const form = new FormData();
      form.append('image', { uri: asset.uri, name: asset.fileName || 'upload.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      await Haptics.selectionAsync();
      const { data } = await api.post('/api/upload', form as any, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = data.filePath;
      await api.patch(`/api/cards/${cardId}`, { url });
      Alert.alert('Updated', 'Card image updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.card(cardId) });
      await queryClient.invalidateQueries({ queryKey: ['deck-cards'] as any });
      await queryClient.invalidateQueries({ queryKey: ['search-cards'] as any });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload failed', e?.response?.data?.message || 'Please try again');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!card) return <View style={styles.center}><Text>Card not found.</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{card.name} {card.word_type ? `(${card.word_type})` : ''}</Text>
      {freqInfo && (
        <View style={[styles.freqBadge, { borderColor: freqInfo.color, backgroundColor: '#fff' }]}>
          <Text style={[styles.freqText, { color: freqInfo.color }]}>{freqInfo.text}</Text>
        </View>
      )}
      {!!card.url && (
        <Image source={{ uri: transformCloudinary(card.url, { w: 800, q: 'auto', f: 'auto' }) || card.url }} style={styles.image} />
      )}
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
  block: { marginTop: 12 },
  label: { fontWeight: '900' },
  primaryBtn: { marginTop: 16, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontWeight: '900' },
  freqBadge: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, alignSelf: 'flex-start' },
  freqText: { fontWeight: '900' },
});
