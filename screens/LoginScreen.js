// screens/LoginScreen.js

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Image, 
  Alert, 
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MyCustomButton from '../components/CustomButton';
import axios from 'axios';
import storage from '../storage'; 
import { useNavigation } from '@react-navigation/native';

function LoginScreen({ setIsLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef(null);

  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Validation Error', 'Username and password are required.');
      return;
    }
    setLoading(true);

    try {
      const response = await axios.post('https://api.nrghash.nrgbloom.com/api/users/login', {
        username: username.trim(), 
        password,
      });

      if (response.data.success) {
        const { token, refreshToken } = response.data;

        try {
          await storage.setItem('authToken', token);
          await storage.setItem('refreshToken', refreshToken);
          await storage.setItem('username', username.trim());
        } catch (storageError) {
          console.error('Storage Error:', storageError);
          Alert.alert('Storage Error', 'Failed to save session data. Please try again.');
          return;
        }

        // Trigger navigation via App.js
        setIsLoggedIn(true);
      } else {
        Alert.alert('Login Failed', response.data.message || 'Invalid credentials.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again later.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.request) {
        errorMessage = 'Unable to reach the server. Check your internet connection.';
      }
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* Center area for the form */}
      <View style={styles.formArea}>
        <View style={styles.formWrapper}>
          {/* Logo */}
          <Image
            source={require('../assets/logo3.png')} 
            style={styles.logo} 
          />

          <Text style={styles.title}>Sign in to your account</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#6B7280"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            returnKeyType="next"  
            onSubmitEditing={() => {               
                  passwordInputRef.current?.focus();
                }}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin} 
          />

          {/* Sign in button or loading indicator */}
          {loading ? (
            <ActivityIndicator 
              size="large" 
              color="#14489b" 
              style={styles.loadingIndicator} 
            />
          ) : (
            <MyCustomButton 
              title="Sign in" 
              onPress={handleLogin} 
              style={styles.signInButton}
            />
          )}
        </View>
      </View>

      {/* Text at the bottom of the screen */}
      <Text style={styles.help}>Need Help? Reach out to julie@nrgbloom.com</Text>
    </View>
  );
}

export default LoginScreen;

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isLargeScreen = SCREEN_WIDTH >= 1024;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // No justifyContent here so we can have a bottom element
  },
  formArea: {
    flex: 1,                  // Takes up all available space
    justifyContent: 'center', // Centers contents vertically
    alignItems: 'center',     // Centers contents horizontally
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 10,
    // For shadow on web, optional:
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)', 
  },
  logo: {
    width: 84,
    height: 84,
    resizeMode: 'contain',
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontSize: isLargeScreen ? 28 : 24,
    color: '#0F172A',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    alignSelf: 'flex-start',
    color: '#0F172A',
    marginLeft: 4,
    marginBottom: 6,
    fontSize: isLargeScreen ? 16 : 14,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 12,
    borderColor: '#14489b',
    borderWidth: 1,
    color: '#0F172A',
    fontSize: isLargeScreen ? 18 : 16,
  },
  signInButton: {
    marginTop: 10,
    width: '100%',
  },
  loadingIndicator: {
    marginTop: 10,
  },
  help: {
    // Placed after formArea, so it sits at the bottom
    textAlign: 'center',
    marginBottom: 20,
    fontSize: isLargeScreen ? 14 : 12,
    color: '#0F172A',
  },
});
