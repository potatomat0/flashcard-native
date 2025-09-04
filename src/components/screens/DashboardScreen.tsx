import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { transformCloudinary } from '../../services/image';
import api from '../../services/api';
import colors from '../../themes/colors';
import WakeServerModalGate from '../common/WakeServerModalGate';
import * as Haptics from 'expo-haptics';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../navigation/RootNavigator';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';

type Deck = {
  _id: string;
  name: string;
  description: string;
  url?: string;
  size?: number;
};

type Props = {
  navigation: StackNavigationProp<MainStackParamList, 'ExploreList'>;
};

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.defaultDecks(1, 20),
    queryFn: async () => {
      const { data } = await api.get('/api/default-decks', { params: { page: 1, limit: 20 } });
      return data as { decks: Deck[] };
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
  const decks = data?.decks || [];
  const renderItem = ({ item }: { item: Deck }) => (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        navigation.navigate('DefaultDeck', { deckId: item._id });
      }}
      style={styles.card}
    >
      {item.url ? (
        <Image source={{ uri: transformCloudinary(item.url, { w: 400, q: 'auto', f: 'auto', c: 'fill' }) || item.url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <WakeServerModalGate />
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Logged in as {user?.username || user?.email || 'Unknown User'}</Text>
        </View>
        <Pressable onPress={logout} style={styles.primaryBtn}><Text style={styles.primaryText}>Log out</Text></Pressable>
      </View>

      <Text style={styles.sectionTitle}>Default Decks</Text>
      {isLoading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={{ color: '#b00020' }}>{(error as any)?.response?.data?.message || 'Failed to load default decks'}</Text>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  primaryBtn: { backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  primaryText: { fontWeight: '900' },
  card: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 8,
    backgroundColor: colors.white,
  },
  image: { width: '100%', aspectRatio: 16/9, borderRadius: 8, marginBottom: 8 },
  imagePlaceholder: { backgroundColor: '#e5e5e5', borderWidth: 2, borderColor: colors.border, width: '100%', aspectRatio: 16/9, borderRadius: 8, marginBottom: 8 },
  cardTitle: { fontWeight: '900', fontSize: 14 },
  cardDesc: { fontSize: 12, color: colors.subtext },
});
