import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
});

const PERSIST_KEY = 'REACT_QUERY_OFFLINE_CACHE';
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: PERSIST_KEY });

export async function clearQueryCachePersist() {
  try {
    queryClient.clear();
    await AsyncStorage.removeItem(PERSIST_KEY);
  } catch {}
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PersistQueryClientProvider>
  );
}

export { queryClient };
