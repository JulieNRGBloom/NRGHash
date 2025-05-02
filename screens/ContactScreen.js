import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../utils/axiosInstance';


function ContactScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          setUserId(decodedToken.user_id);
        } else {
          console.warn('No token found');
        }
      } catch (error) {
        console.error('Failed to fetch user ID:', error);
      }
    };

    fetchUserId();
  }, []);

  const handleSubmit = async () => {
    if (!email || !message) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post('/contact', {
        email,
        message,
        userId,
      });      

      if (response.data.success) {
        Alert.alert('Success', 'Your message has been sent!');
        setEmail('');
        setMessage('');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending contact message:', error);
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <Text style={[styles.title, isMobile && styles.titleMobile]}>Contact Us</Text>
      <Text style={styles.label}>Your Email</Text>

      <TextInput
        style={styles.input}
        placeholder=""
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.label}>Message</Text>

      <TextInput
        style={[styles.input, styles.messageInput]}
        placeholder=""
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
      />

      {loading ? (
        <ActivityIndicator size="small" color="#14489b" />
      ) : (
        <TouchableOpacity style={[styles.button, isMobile && styles.buttonMobile]} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Send Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 40,
  },
  containerMobile: {
    padding: 15,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  titleMobile: {
    marginBottom: 20,
  },
  label: {
    alignSelf: 'flex-start',
    color: '#0F172A',         // Dark navy color
    marginLeft: 4,            // Slight left padding
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#14489b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '35%',
    alignSelf: 'center',
  },
  buttonMobile: {
    width: '90%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ContactScreen;
