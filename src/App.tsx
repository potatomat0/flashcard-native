import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import QueryProvider from './services/query';
 

function AppInner() {
  // Ensure navigator reacts to auth state via context
  const { initializing } = useAuth();

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
