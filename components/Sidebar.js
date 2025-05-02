
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome, AntDesign } from '@expo/vector-icons';
import axios from 'axios';
import storage from '../storage';
import { io } from 'socket.io-client';

const API_BASE_URL = 'https://api.nrghash.nrgbloom.com/api'; 

const socket = io('https://api.nrghash.nrgbloom.com', {
  transports: ['websocket'],
});

export default function Sidebar({ collapsed, userRole, navigationRoutes, onNavigate, hasUnreadNotifications }) {
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeInterruption, setActiveInterruption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingPaused, setPollingPaused] = useState(false);

  useEffect(() => {
    const fetchInterruptionStatus = async () => {
      if (pollingPaused) return; // Pause polling when socket event handles it
      try {
        const token = await storage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/interruptions/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.active) {
          setActiveInterruption(response.data.interruption);
        } else {
          setActiveInterruption(null);
        }
      } catch (error) {
        console.error('Failed to fetch active interruption:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterruptionStatus();
    const interval = setInterval(fetchInterruptionStatus, 60000);

    return () => clearInterval(interval);
  }, [pollingPaused]);

  // Real-time updates via WebSocket
  useEffect(() => {
    socket.on('interruptionStarted', (data) => {
      console.log('Interruption started (socket):', data);
      setActiveInterruption(data);
      setPollingPaused(true); // 🛑 Stop polling once we know the state is live
    });

    socket.on('interruptionEnded', () => {
      console.log('Interruption ended (socket)');
      setActiveInterruption(null);
      setPollingPaused(true); // 🛑 Stop polling temporarily
      setTimeout(() => setPollingPaused(false), 2000); // Resume polling after a short delay (optional)
    });

    return () => {
      socket.off('interruptionStarted');
      socket.off('interruptionEnded');
    };
  }, []);

  const renderInterruptionBanner = () => {
    if (loading) return <ActivityIndicator size="small" color="#ffffff" />;
    if (activeInterruption) {
      return (
        <View style={styles.interruptionBanner}>
          <Text style={styles.interruptionText}>
            ⚠️ Hashrate Interruption in Progress (Started at:{' '}
            {new Date(activeInterruption.start_time).toLocaleString()})
          </Text>
        </View>
      );
    }
    return null;
  };

  if (isMobile) {
    return (
      <>
        {!menuOpen && (
          <TouchableOpacity style={styles.hamburgerButton} onPress={() => setMenuOpen(true)}>
            <Ionicons name="menu" size={28} color="#000" />
          </TouchableOpacity>
        )}

        {menuOpen && (
          <View style={styles.mobileSidebarOverlay}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMenuOpen(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Image source={require('../assets/logo2.png')} style={styles.logo} />
            </View>

            {renderInterruptionBanner()}

            {/* ✅ Properly rendering navigation items */}
            {navigationRoutes.map((item) => {
              const isNotifications = item.route === 'NotificationScreen';

              return (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.navItem,
                    isNotifications && hasUnreadNotifications && styles.navItemUnread,
                  ]}
                  onPress={() => {
                    onNavigate(item.route);
                    setMenuOpen(false); // Close the sidebar after navigation
                  }}
                >
                  {item.icon === 'bitcoin' ? (
                    <FontAwesome name={item.icon} size={20} color="#fff" style={{ paddingRight: 5 }} />
                  ) : item.icon === 'dashboard' ? (
                    <AntDesign name={item.icon} size={20} color="#fff" />
                  ) : (
                    <Ionicons name={item.icon} size={20} color="#fff" />
                  )}
                  <Text style={styles.navText}>{item.title}</Text>

                  {/* Optional badge/dot indicator for unread notifications */}
                  {isNotifications && hasUnreadNotifications && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })}

          </View>
        )}
      </>
    );
  } else {
    return (
      <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo2.png')} style={[styles.logo, collapsed && styles.logoCollapsed]} />
        </View>

        {renderInterruptionBanner()}


        {/* ✅ Properly rendering navigation items */}
        {navigationRoutes.map((item) => {
          const isNotifications = item.route === 'NotificationScreen';

          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem,
                isNotifications && hasUnreadNotifications && styles.navItemUnread,
              ]}
              onPress={() => onNavigate(item.route)}
            >
              {item.icon === 'bitcoin' ? (
                <FontAwesome name={item.icon} size={20} color="#fff" style={{ paddingRight: 5 }} />
              ) : item.icon === 'dashboard' ? (
                <AntDesign name={item.icon} size={20} color="#fff" />
              ) : (
                <Ionicons name={item.icon} size={20} color="#fff" />
              )}
              <Text style={styles.navText}>{item.title}</Text>

              {/* Optional badge/dot indicator for unread notifications */}
              {isNotifications && hasUnreadNotifications && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
}


const styles = StyleSheet.create({
  sidebar: {
    zIndex: 1,
    width: 240,
    backgroundColor: '#14489b',
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  sidebarCollapsed: {
    width: 50,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    paddingLeft: 10,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    paddingLeft: 10,
  },
  logoCollapsed: {
    width: 32,
    height: 32,
    paddingLeft: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  navText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#fff',
  },
  hamburgerButton: {
    top: 0,
    left: 0,
    zIndex: 9999,
    padding: 8,
    backgroundColor: '#F9FAFB'    
  },
  mobileSidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#14489b',
    zIndex: 9998,
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 9999,
    padding: 8,
    backgroundColor: 'transparent',
  },
  interruptionBanner: {
    backgroundColor: '#ffcc00',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  interruptionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  navItemUnread: {
    backgroundColor: '#456599', // Highlight color for unread notifications
  },
  
  unreadDot: {
    display: 'none',
    position: 'absolute',
    right: 10,
    top: '45%',
    width: 10,
    height: 10,
    backgroundColor: 'red',
    borderRadius: 5,
  },
  
});
