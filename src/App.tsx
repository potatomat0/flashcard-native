import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import QueryProvider from './services/query';
import { pingServer } from './services/api';
 

function AppInner() {
  // Ensure navigator reacts to auth state via context
  const { initializing } = useAuth();

  // Quietly ping the server on first app open to wake free hosting
  useEffect(() => {
    pingServer().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QueryProvider>
  );
}
