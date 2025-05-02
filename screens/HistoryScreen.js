import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  useWindowDimensions, 
  ActivityIndicator, 
  Alert,
  Image
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import BitcoinLogo from '../assets/bitcoin-logo.png'; // Import your PNG image
import axiosInstance from '../utils/axiosInstance';

const SubscriptionPeriodItem = ({ period, isMobile }) => (
  <View style={styles.periodCard}>
    <View style={styles.periodHeader}>
      <Text style={styles.periodTitle}>Subscription Period</Text>
      <Text style={styles.periodDate}>
        {period.startDate} → {period.endDate}
      </Text>
    </View>

    <View
      style={[
        styles.statsGrid,
        isMobile && styles.statsGridMobile,
      ]}
    >
      <StatItem label="Mined BTC" value={`₿ ${Number(period.minedBtc).toFixed(8)}`} isMobile={isMobile} />
      <StatItem label="Hosting Fees" value={`$ ${Number(period.hostingFeesUSD).toFixed(2)}`} isMobile={isMobile} />
      <StatItem label="Profit (BTC)" value={`₿ ${Number(period.profitBtc).toFixed(8)}`} isMobile={isMobile} />
      <StatItem label="Mining Pool Fees" value={`₿ ${Number(period.miningPoolFees).toFixed(8)}`} isMobile={isMobile} />
    </View>
  </View>
);



const StatItem = ({ label, value, isMobile }) => (
  <View style={[styles.statItem, isMobile && styles.statItemMobile]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

function HistoryScreen() {
  const [subscriptionPeriods, setSubscriptionPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMinedBtc, setTotalMinedBtc] = useState(0);
  const [numberOfSubscriptions, setNumberOfSubscriptions] = useState(0);

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

  const fetchMiningStats = async () => {
    try {
      const response = await axiosInstance.get('/subscriptions/mining-stats');
  
      if (response.data.success) {
        setTotalMinedBtc(response.data.totalMinedBtc);
        setNumberOfSubscriptions(response.data.numberOfSubscriptions);
      } else {
        console.error('Failed to fetch mining stats:', response.data.message);
      }
    } catch (err) {
      console.error('Error fetching mining stats:', err.message);
    }
  };
  
  const fetchInvalidSubscriptions = async () => {
    try {
      const response = await axiosInstance.get('/subscriptions/invalid');
  
      if (response.data.success) {
        setSubscriptionPeriods(response.data.subscriptions);
      } else {
        console.error('Failed to fetch invalid subscriptions:', response.data.message);
      }
    } catch (err) {
      console.error('Error fetching invalid subscriptions:', err.message);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken();
      if (!token) {
        Alert.alert('Authentication Error', 'No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      await Promise.all([fetchMiningStats(token), fetchInvalidSubscriptions(token)]);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, isMobile && styles.containerMobile, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <Text style={[styles.title, isMobile && styles.titleMobile]}>Previous Subscription Stats</Text>

      <View style={[styles.statsSummary, isMobile && styles.statsSummaryMobile]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Mined BTC</Text>
          <View style={styles.cardContent}>
            <Image source={BitcoinLogo} style={styles.bitcoinLogo} />
            <Text style={styles.cardValue}>{totalMinedBtc.toFixed(8)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Subscriptions</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardValue}>{numberOfSubscriptions}</Text>
          </View>
        </View>
      </View>

      {subscriptionPeriods.length === 0 ? (
        <Text style={styles.emptyText}>No Previous Subscriptions Found</Text>
      ) : (
        <FlatList
          data={subscriptionPeriods}
          renderItem={({ item }) => <SubscriptionPeriodItem period={item} isMobile={isMobile} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
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
    marginBottom: 20,
    marginTop: 10,
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsSummaryMobile: {
    flexDirection: 'column',
  },

  // Individual Card
  card: {
    backgroundColor: '#ffffff',
    flex: 1,
    marginRight: 10,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },

  // Bitcoin Logo
  bitcoinLogo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  periodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  periodHeader: {
    marginBottom: 12,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14489b',
    marginBottom: 4,
  },
  periodDate: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12, // for spacing between rows
  },
  statsGridMobile: {
    flexDirection: 'column',
    rowGap: 10, // slightly reduced on mobile for better stacking
  },

  statItem: {
    width: '48%',
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItemMobile: {
    width: '100%',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
});

export default HistoryScreen;
