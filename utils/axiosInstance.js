import axios from 'axios';
import { Alert } from 'react-native';
import storage from '../storage';
import Constants from 'expo-constants';

// Grab the prod URL from app.config.js → Constants.expoConfig.extra.apiUrl
const PROD = Constants.expoConfig.extra.apiUrl;
// When running via `expo start` __DEV__ will be true
const LOCAL = 'http://localhost:8080';

const baseURL = __DEV__ ? `${LOCAL}/api` : `${PROD}/api`;

console.log(`⚡️ axios baseURL = ${baseURL} (__DEV__=${__DEV__})`);

const axiosInstance = axios.create({ baseURL });


// Request interceptor: Attach access token to every request
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Check for 401 errors and attempt a token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Get the refresh token from storage
      const storedRefreshToken = await storage.getItem('refreshToken');
      if (!storedRefreshToken) {
        // No refresh token available, logout the user
        Alert.alert('Session Expired', 'Please log in again.');
        // Optionally trigger your logout flow here
        return Promise.reject(error);
      }
      
      try {
        // Request a new access token using the refresh token
        const { data } = await axios.post(
          `${apiUrl}/api/users/refresh-token`,
          { refreshToken: storedRefreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (data.success && data.accessToken) {
          // Update storage with the new access token
          await storage.setItem('authToken', data.accessToken);
          // Update the authorization header and retry the original request
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, force logout or show an alert
        Alert.alert('Session Expired', 'Please log in again.');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
