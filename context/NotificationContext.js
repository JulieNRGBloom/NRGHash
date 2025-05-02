import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import storage from '../storage';

// 1. Create the context
const NotificationContext = createContext();

// 2. Provider component
export const NotificationProvider = ({ children }) => {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // Function to check unread notifications
  const checkUnreadNotifications = async () => {
    try {
      const token = await storage.getItem('authToken');
      if (!token) return;

      const response = await axios.get('https://api.nrghash.nrgbloom.com/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const hasUnread = response.data.notifications.some((n) => !n.is_read);
        setHasUnreadNotifications(hasUnread);
      }
    } catch (err) {
      console.error('Failed to check unread notifications:', err.message);
    }
  };

  // Check on mount
  useEffect(() => {
    checkUnreadNotifications();
  }, []);

  return (
    <NotificationContext.Provider value={{ hasUnreadNotifications, checkUnreadNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

// 3. Custom Hook
export const useNotification = () => useContext(NotificationContext);
