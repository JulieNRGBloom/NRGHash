import axios from 'axios';
import { Alert } from 'react-native';
import storage from '../storage';
import Constants from 'expo-constants';

console.log('💥 API URL is:', Constants.expoConfig.extra.apiUrl);

const { apiUrl } = Constants.expoConfig.extra;

// Create an Axios instance with your base URL
const axiosInstance = axios.create({
  baseURL: `${apiUrl}/api`,
});

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
