import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '../components/screens/LoginScreen';
import RegisterScreen from '../components/screens/RegisterScreen';
import DashboardScreen from '../components/screens/DashboardScreen';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import colors from '../themes/colors';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  ExploreList: undefined;
  DefaultDeck: { deckId: string };
  DefaultCard: { deckId: string; cardId: string };
  DefaultReview: { deckId: string };
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const ExploreStack = createStackNavigator<MainStackParamList>();
type MyDecksParamList = {
  MyDecksList: undefined;
  MyDeckDetail: { deckId: string };
  MyCardDetail: { cardId: string };
  MyDeckReviewSetup: { deckId: string };
  MyDeckReview: { deckId: string; session: any };
  MyDeckReviewSummary: { deckId: string; stats: any; totals: any };
};
const MyDecksStack = createStackNavigator<MyDecksParamList>();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTitleStyle: { fontSize: 16, fontWeight: '900', color: '#000' },
      headerTintColor: '#000',
      headerShadowVisible: false,
    }}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerTitle: 'Login' }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ headerTitle: 'Register' }} />
    </AuthStack.Navigator>
  );
}

function ExploreNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTitleStyle: { fontSize: 16, fontWeight: '900', color: '#000' },
      headerTintColor: '#000',
      headerShadowVisible: false,
    }}>
      <ExploreStack.Screen name="ExploreList" component={DashboardScreen} options={{ headerTitle: 'Default Decks' }} />
      <ExploreStack.Screen name="DefaultDeck" component={require('../components/screens/DefaultDeckDetailScreen').default} options={{ headerTitle: 'Default Deck' }} />
      <ExploreStack.Screen name="DefaultCard" component={require('../components/screens/DefaultCardDetailScreen').default} />
      <ExploreStack.Screen name="DefaultReview" component={require('../components/screens/DefaultDeckReviewScreen').default} options={{ headerTitle: 'Review' }} />
    </ExploreStack.Navigator>
  );
}

const MyDecksListScreen = require('../components/screens/MyDecksScreen').default;
const MyDeckDetailScreen = require('../components/screens/MyDeckDetailScreen').default;
const MyCardDetailScreen = require('../components/screens/MyCardDetailScreen').default;
const MyDeckReviewSetupScreen = require('../components/screens/MyDeckReviewSetupScreen').default;
const MyDeckReviewScreen = require('../components/screens/MyDeckReviewScreen').default;
const MyDeckReviewSummaryScreen = require('../components/screens/MyDeckReviewSummaryScreen').default;

function MyDecksNavigator() {
  return (
    <MyDecksStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTitleStyle: { fontSize: 16, fontWeight: '900', color: '#000' },
      headerTintColor: '#000',
      headerShadowVisible: false,
    }}>
      <MyDecksStack.Screen name="MyDecksList" component={MyDecksListScreen} options={{ headerTitle: 'My Decks' }} />
      <MyDecksStack.Screen name="MyDeckDetail" component={MyDeckDetailScreen} options={{ headerTitle: 'Deck' }} />
      <MyDecksStack.Screen name="MyCardDetail" component={MyCardDetailScreen} options={{ headerTitle: 'Card' }} />
      <MyDecksStack.Screen name="MyDeckReviewSetup" component={MyDeckReviewSetupScreen} options={{ headerTitle: 'Start Review' }} />
      <MyDecksStack.Screen name="MyDeckReview" component={MyDeckReviewScreen} options={{ headerTitle: 'Review' }} />
      <MyDecksStack.Screen name="MyDeckReviewSummary" component={MyDeckReviewSummaryScreen} options={{ headerTitle: 'Summary' }} />
    </MyDecksStack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) {
    return null; // could render a splash here
  }
  if (!isAuthenticated) return <AuthNavigator />;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#222',
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';
          if (route.name === 'Explore') iconName = focused ? 'compass' : 'compass-outline';
          if (route.name === 'My Decks') iconName = focused ? 'book' : 'book-outline';
          if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: { borderTopWidth: 2, borderTopColor: '#000' }
      })}
    >
      <Tab.Screen name="Explore" component={ExploreNavigator} />
      <Tab.Screen name="My Decks" component={MyDecksNavigator} />
      <Tab.Screen name="Account" component={require('../components/screens/UserScreen').default} />
    </Tab.Navigator>
  );
}
