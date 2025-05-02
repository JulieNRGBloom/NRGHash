import React, { useRef, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFonts, Ubuntu_400Regular, Ubuntu_700Bold } from '@expo-google-fonts/ubuntu';
import AppLoading from 'expo-app-loading';
import { Dimensions, StyleSheet, View, Alert, Platform } from 'react-native';
import axios from 'axios';
import storage from './storage';
import { io } from 'socket.io-client';


import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import RentHashrateScreen from './screens/RentHashrateScreen';
import WalletScreen from './screens/WalletScreen';
import Sidebar from './components/Sidebar';
import HistoryScreen from './screens/HistoryScreen';
import NotificationScreen from './screens/NotificationsScreen';
import FAQScreen from './screens/FAQScreen';
import AdminDashboard from './screens/AdminDashboardScreen';
import ContactScreen from './screens/ContactScreen';


export const navigationRef = React.createRef();

export function navigate(name, params) {
  navigationRef.current?.navigate(name, params);
}

const Stack = createStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); // Store user role
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('https://api.nrghash.nrgbloom.com', {
      transports: ['websocket'],
    });
  
    setSocket(newSocket);
  
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  useEffect(() => {
    if (!socket || !isLoggedIn) return;
  
    const joinUserRoom = async () => {
      const token = await storage.getItem('authToken');
      const response = await axios.get('https://api.nrghash.nrgbloom.com/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      const userId = response.data.user.user_id;
      socket.emit('joinRoom', { userId });
    };
  
    joinUserRoom();
  
    // Listen for real-time notifications
    socket.on('newNotification', (notification) => {
      console.log('New notification received:', notification);
      setHasUnreadNotifications(true);
    });
  
    return () => {
      socket.off('newNotification');
    };
  }, [socket, isLoggedIn]);

  const fetchUnreadNotifications = async () => {
    try {
      const token = await storage.getItem('authToken');
      if (!token) return;
  
      const response = await axios.get('https://api.nrghash.nrgbloom.com/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.data.success) {
        const unread = response.data.notifications.some((n) => !n.is_read);
        setHasUnreadNotifications(unread);
      }
    } catch (error) {
      console.error('Failed to fetch unread notifications:', error);
    }
  };
  
  // Fetch notifications when app loads and every 60s
  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 60000); // Optional polling every minute
    return () => clearInterval(interval);
  }, []);


  // ✅ Fetch user role from API instead of JWT
  useEffect(() => {
    const fetchUserRole = async () => {
      const token = await storage.getItem('authToken');
      if (!token) {
        setIsLoggedIn(false);
        setUserRole(null);
        return;
      }

      try {
        const response = await axios.get('https://api.nrghash.nrgbloom.com/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Fetched User:', response.data.user); // ✅ Debugging
        setUserRole(response.data.user.role);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setIsLoggedIn(false);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, []);

  // ✅ Ensure layout adjusts dynamically
  useEffect(() => {
    const updateLayout = () => {
      const screenWidth = Dimensions.get('window').width;
      setCollapsed(screenWidth < 600);
      setIsMobile(screenWidth < 768);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove?.();
  }, []);

  let [fontsLoaded] = useFonts({
    Ubuntu_400Regular,
    Ubuntu_700Bold,
  });

  if (!fontsLoaded) {
    return <AppLoading />;
  }

  const handleNavigate = async (route) => {
    if (route === 'Logout') {
      console.log('Logout button pressed.');
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('Are you sure you want to logout?');
        if (confirmed) await performLogout();
      } else {
        Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: async () => await performLogout() },
        ]);
      }
    } else {
      navigationRef.current?.navigate(route);
    }
  };

  const performLogout = async () => {
    try {
      // Retrieve the refresh token from storage
      const refreshToken = await storage.getItem('refreshToken');
      
      // If a refresh token exists, call the backend logout endpoint to invalidate it
      if (refreshToken) {
        await axios.post(
          'https://api.nrghash.nrgbloom.com/api/users/logout',
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Clear both the access token and refresh token from storage
      await storage.removeItem('authToken');
      await storage.removeItem('refreshToken');
      await storage.removeItem('username');
      
      // Update local state to log out the user
      setIsLoggedIn(false);
      setUserRole(null);
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to logout. Please try again.');
    }
  };
  
  return (
    <NavigationContainer ref={navigationRef}>
      {isLoggedIn ? (
        <View style={[styles.rootContainer, { flexDirection: isMobile ? 'column' : 'row' }]}>
          <Sidebar
            key={userRole} // ✅ Forces re-render when role updates
            collapsed={collapsed}
            hasUnreadNotifications={hasUnreadNotifications} // ✅ Pass the state
            userRole={userRole} // ✅ Pass user role dynamically
            navigationRoutes={[
              { title: 'Dashboard', route: 'HomeScreen', icon: 'dashboard' },
              { title: 'Rent', route: 'RentHashrateScreen', icon: 'bitcoin' },
              { title: 'Wallet', route: 'Wallet', icon: 'wallet-outline' },
              { title: 'Previous Subscriptions', route: 'HistoryScreen', icon: 'time-outline' },
              { title: 'Notifications', route: 'NotificationScreen', icon: 'chatbox-outline' },
              { title: 'FAQs', route: 'FAQScreen', icon: 'help' },
              { title: 'Contact Us', route: 'ContactScreen', icon: 'mail-outline' },
              ...(userRole === 'admin' ? [{ title: 'Admin Dashboard', route: 'AdminDashboard', icon: 'shield-outline' }] : []),
              { title: 'Logout', route: 'Logout', icon: 'exit-outline' },
            ]}
            onNavigate={handleNavigate}
          />

          <View style={styles.mainContainer}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="HomeScreen" component={HomeScreen} />
              <Stack.Screen name="RentHashrateScreen" component={RentHashrateScreen} />
              <Stack.Screen name="Wallet" component={WalletScreen} />
              <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
              <Stack.Screen name="NotificationScreen">
                {(props) => (
                  <NotificationScreen
                    {...props}
                    setHasUnreadNotifications={setHasUnreadNotifications}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="FAQScreen" component={FAQScreen} />
              <Stack.Screen name="ContactScreen" component={ContactScreen} />
              {userRole === 'admin' && <Stack.Screen name="AdminDashboard" component={AdminDashboard} />}
            </Stack.Navigator>
          </View>
        </View>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
