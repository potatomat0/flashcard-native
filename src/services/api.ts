import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://flashcard-rs95.onrender.com';
const TOKEN_KEY = 'flashcard_token';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function setAuthToken(token: string) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common['Authorization'];
}

// Attach token for outgoing requests if missing
api.interceptors.request.use(async (config) => {
  if (!config.headers?.Authorization) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally if needed (consumer can also handle)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      clearAuthToken();
      // In-app logout is handled by AuthContext via calling logout, but here we just clear token.
    }
    return Promise.reject(error);
  }
);

export default api;

