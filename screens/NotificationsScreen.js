import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import { FontAwesome5, Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance from '../utils/axiosInstance';


const ICONS = {
  subscription: { name: 'calendar-check-o', type: 'FontAwesome' },
  block: { name: 'pickaxe', type: 'MaterialCommunityIcons' },
  default: { name: 'bell', type: 'FontAwesome5' },
  end_subscription: { name: 'calendar-times-o', type: 'FontAwesome' },
  withdrawal_processed: { name: 'checkmark-circle-outline', type: 'Ionicons' },
  withdrawal_rejected: { name: 'close-circle-outline', type: 'Ionicons' },
  withdrawal_reviewed: { name: 'refresh', type: 'Ionicons' },
  end_interruption: { name: 'pause', type: 'Ionicons' },
  start_interruption: { name: 'play', type: 'Ionicons' },
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

function NotificationScreen({ setHasUnreadNotifications }) {
  const [notifications, setNotifications] = useState([]);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const getToken = async () => {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (err) {
      console.error('Failed to retrieve token:', err);
      return null;
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('User not authenticated.');

      const response = await axiosInstance.get('/notifications');

      if (response.data.success) {
        setNotifications(response.data.notifications);

        // Extract unread notifications
        const unreadIds = response.data.notifications
          .filter((n) => !n.is_read)
          .map((n) => n.id);

        if (unreadIds.length > 0) {
          markNotificationsAsRead(unreadIds);
        } else {
          // Clear badge if no unread notifications
          setHasUnreadNotifications(false);
        }
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch notifications.');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
      Alert.alert('Error', err.message);
    }
  };

  const markNotificationsAsRead = async (notificationIds) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('User not authenticated.');

      await axiosInstance.patch('/notifications/mark-as-read', { notificationIds });


      // Set the unread state to false when marking as read
      setHasUnreadNotifications(false);

      // Update the state locally as well
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Failed to mark notifications as read:', err.message);
    }
  };

  // Fetch notifications when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications();
    }, [])
  );
  

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <Text style={[styles.title, isMobile && styles.titleMobile]}>Notifications</Text>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'stretch' }}>
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const iconData = ICONS[notification.icon] || ICONS.default;
            const IconComponent =
              iconData.type === 'FontAwesome5'
                ? FontAwesome5
                : iconData.type === 'FontAwesome'
                ? FontAwesome
                : iconData.type === 'MaterialCommunityIcons'
                ? MaterialCommunityIcons
                : Ionicons;
  
            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  notification.importance === 'important' && styles.important,
                  !notification.is_read && styles.unread,
                ]}
              >
                <IconComponent
                  name={iconData.name}
                  size={22}
                  color="#14489b"
                  style={styles.icon}
                />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationText}>{notification.message}</Text>
                  <Text style={styles.notificationDate}>{formatDate(notification.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.noNotifications}>No notifications yet.</Text>
        )}
      </ScrollView>
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
    marginTop: 10,
    marginLeft: 8,
  },
  titleMobile: {
    fontSize: 22,
    textAlign: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    width: '100%',  // Added to force full width
  },
  notificationContent: {
    flex: 1,
    flexWrap: 'wrap',
  },
  unread: {
    backgroundColor: '#e6f7ff', // Light blue for unread
  },
  important: {
    backgroundColor: '#ffeeba',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notificationText: {
    fontSize: 14,
  },
  notificationDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },
  noNotifications: {
    textAlign: 'center',
    marginTop: 20,
  },
  icon: {
    marginRight: 10,
  },
});

export default NotificationScreen;
