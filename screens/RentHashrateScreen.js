// screens/RentHashrateScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  ScrollView,
  Dimensions,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import MyCustomButton from '../components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { fetchAppData, fetchCostData, fetchSubscriptionData } from '../utils/api';
import axiosInstance from '../utils/axiosInstance';


const { width } = Dimensions.get('window');

function RentHashrateScreen() {
  const [hashrate, setHashrate] = useState(1);
  const [appData, setAppData] = useState({});
  const [costData, setCostData] = useState({});
  const [subscriptionData, setSubscriptionData] = useState({});
  const [estimatedBTC, setEstimatedBTC] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [estimatedProfits, setEstimatedProfits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStaticDataLoading, setIsStaticDataLoading] = useState(true);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0);
  const [error, setError] = useState(null);
  const [staticDataError, setStaticDataError] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [subscriptionDays, setSubscriptionDays] = useState(null);
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const navigation = useNavigation();
  const isInitialLoading = isStaticDataLoading || isSubscriptionLoading;
  const [rentError, setRentError] = useState('');

  // Fetch Static Data
  useEffect(() => {
    const fetchStatic = async () => {
      try {
        const [app, cost, subscription] = await Promise.all([
          fetchAppData(),
          fetchCostData(),
          fetchSubscriptionData(),
        ]);
        setAppData(app);
        setCostData(cost);
        setSubscriptionData(subscription);
      } catch (err) {
        console.error('Error fetching static data:', err.message);
        setStaticDataError('Failed to load static data.');
      } finally {
        setIsStaticDataLoading(false);
      }
    };
    fetchStatic();
  }, []);

  // Define fetchSubscription using useCallback
  const fetchSubscription = useCallback(async () => {
    setIsSubscriptionLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken'); 
      if (!token) {
        console.log('No auth token found. User is not logged in.');
        setIsSubscriptionLoading(false);
        return;
      }

      const response = await axiosInstance.get('/subscriptions/active');


      if (response.data.success && response.data.subscription) {
        setHasActiveSubscription(true);
        setRemainingDays(response.data.subscription.remainingDays);
      } else {
        setHasActiveSubscription(false);
      }
    } catch (err) {
      console.error('Error fetching active subscription:', err.message);
      setSubscriptionError('Failed to fetch subscription data.');
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, []);

  // Fetch Active Subscription on Mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Calculate available hashrate
  const availableHashrate = appData.totalHashrateTH && appData.dedicatedHashratePercentage
    ? (appData.totalHashrateTH * appData.dedicatedHashratePercentage) / 100
    : 0;
  const clients = appData.clients || 1;
  const maxHashrate = clients > 0 ? Math.floor(availableHashrate / clients) : 0;

  // Calculate BTC Mined and Costs
  useEffect(() => {
    const calculateMetrics = async () => {
      if (hashrate && costData && !hasActiveSubscription && !isInitialLoading) {
        setLoading(true);
        try {
          const response = await axiosInstance.get('/mining-data', { params: { hashrate } });

          if (response.data) {
            const btcPrice = parseFloat(response.data.price);
            const subscriptionPeriod = subscriptionData.subscriptionPeriodDays;
            setSubscriptionDays(subscriptionPeriod);

            const totalBTC = subscriptionData.estimatedBTC * subscriptionPeriod * hashrate;
            setEstimatedBTC(totalBTC);

            // Debugging Logs
            console.log('Cost Data:', costData);
            console.log('Subscription Data:', subscriptionData);
            console.log('Total BTC:', totalBTC);

            // Corrected Conditional Check
            if (
              costData.hostingFeePerKWH &&
              costData.poolFeesperTHPercentage &&
              costData.asicPricePerTH &&
              costData.asicBrokerFee &&
              costData.ThPerAsic &&
              costData.asicLifetimeDays &&
              costData.asicPowerConsumptionWatts
            ) {
              const hostingCostPerkWh = parseFloat(costData.hostingFeePerKWH) || 0;
              const poolFeePercentage = parseFloat(costData.poolFeesperTHPercentage) / 100 || 0;
              const thPrice = parseFloat(costData.asicPricePerTH) || 0;
              const asicHr = parseFloat(costData.ThPerAsic) || 0;
              const asicLifetime = parseFloat(costData.asicLifetimeDays) || 0;
              const brokerFee = parseFloat(costData.asicBrokerFee) || 0;
              const wattsPerAsic = parseFloat(costData.asicPowerConsumptionWatts) || 0;

              const kWhPerTH = (((wattsPerAsic / asicHr) * 24) / 1000) * subscriptionPeriod;
              const totalKWH = kWhPerTH * hashrate;
              const variableCostsTotal = hostingCostPerkWh * totalKWH;
              const poolFees = poolFeePercentage * totalBTC * btcPrice;

              const totalEstimatedCost = variableCostsTotal + poolFees;
              const totalEstimatedProfits = (totalBTC * btcPrice) - totalEstimatedCost;

              setEstimatedCost(totalEstimatedCost);
              setEstimatedProfits(totalEstimatedProfits);

              console.log('Estimated Cost:', totalEstimatedCost);
              console.log('Estimated Profits:', totalEstimatedProfits);
            } else {
              console.log('Incomplete cost data. Cannot calculate estimated cost and profits.');
              setEstimatedCost(null);
              setEstimatedProfits(null);
            }
          }
        } catch (err) {
          console.error('Error calculating metrics:', err.message);
          setError('Failed to calculate metrics.');
        } finally {
          setLoading(false);
        }
      }
    };
    calculateMetrics();
  }, [hashrate, costData, hasActiveSubscription, isInitialLoading, subscriptionData]);

  const handleRent = async () => {
    try {
      setLoading(true);
      setRentError(''); // Clear any previous errors
  
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setRentError('You must be logged in to rent hashrate.');
        setLoading(false);
        return;
      }
  
      // 1) Fetch the latest hashrate from server
      const hashrateResponse = await axiosInstance.get('/hashrate');
      if (!hashrateResponse.data.success || !hashrateResponse.data.data) {
        setRentError('Unable to fetch current hashrate info.');
        setLoading(false);
        return;
      }
      const { available_hashrate_th } = hashrateResponse.data.data;
  
      // 2) Check if user’s selection is <= available
      if (hashrate > available_hashrate_th) {
        setRentError(`Insufficient hashrate. Only ${available_hashrate_th} TH/s available.`);
        setLoading(false);
        return;
      }
  
      // 3) Post to /subscriptions
      const response = await axiosInstance.post('/subscriptions', {
        hashrate,
        subscriptionPeriodDays: 30,
      });
  
      // If status is 2xx, we get here:
      if (response.data.success) {
        // success
        if (Platform.OS === 'web') {
          window.alert('Subscription created successfully!');
        }
        await fetchSubscription();
        navigation.navigate('HomeScreen');
      } else {
        // If the server returned success=false with a 200 status (unlikely)
        setRentError(response.data.message || 'Failed to create subscription.');
      }
    } catch (err) {
      // We only reach here if axios sees a 4xx/5xx error or a network error
      setLoading(false);
  
      if (err.response && err.response.data) {
        // The server’s JSON: { success: false, message: '...' }
        setRentError(err.response.data.message || 'Failed to create subscription.');
      } else {
        // e.g. no response or parse error
        setRentError('A network error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  
  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {isInitialLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14489b" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Main content wrapped in ScrollView for better mobile experience */}
      {!isInitialLoading && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Rent Hashrate</Text>

          <View style={styles.card}>

            {/* Display Errors */}
            {staticDataError && <Text style={styles.errorText}>{staticDataError}</Text>}
            {subscriptionError && <Text style={styles.errorText}>{subscriptionError}</Text>}
            {rentError !== '' && (
              <Text style={styles.errorText}>{rentError}</Text>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            {hasActiveSubscription ? (
              /* Active Subscription Message */
              <View style={styles.subscriptionContainer}>
                <Text style={styles.subscriptionText}>
                  You are already subscribed to hashrate.
                </Text>
                <Text style={styles.subscriptionText}>
                  You can rent hashrate again in {remainingDays} {remainingDays === 1 ? 'day' : 'days'}.
                </Text>
              </View>
            ) : maxHashrate >= 1 ? (
              <>
                <View style={[styles.sliderContainer, isMobile && styles.mobileSliderContainer]}>
                  <Text style={[styles.sliderLabel, isMobile && styles.mobileSliderLabel]}>Select Hashrate (TH/s)</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={maxHashrate}
                    value={hashrate}
                    onValueChange={(value) => {
                      setHashrate(value);
                      if (rentError !== '') {
                        setRentError('');
                      }
                    }}
                    step={1}
                    minimumTrackTintColor="#14489b"
                    maximumTrackTintColor="#ccc"
                    thumbTintColor="#14489b"
                  />
                  <Text style={[styles.selectedHashrate, isMobile && styles.mobileSelectedHashrate]}>{hashrate} TH/s</Text>
                </View>

                <View style={[styles.metricsContainer, isMobile && styles.mobileMetricsContainer]}>
                  <View style={[styles.metricCard, isMobile && styles.mobileMetricCard]}>
                    <Text style={styles.metricTitle}>Estimated Bitcoins</Text>
                    <Text style={styles.metricValue}>
                      {estimatedBTC !== null ? estimatedBTC.toFixed(8) : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.metricCard, isMobile && styles.mobileMetricCard]}>
                    <Text style={styles.metricTitle}>Estimated Costs</Text>
                    <Text style={styles.metricValue}>
                      {estimatedCost !== null ? `$${estimatedCost.toFixed(2)}` : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.metricCard, isMobile && styles.mobileMetricCard]}>
                    <Text style={styles.metricTitle}>Estimated Profits</Text>
                    <Text style={styles.metricValue}>
                      {estimatedProfits !== null ? `$${estimatedProfits.toFixed(2)}` : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.metricCard, isMobile && styles.mobileMetricCard]}>
                    <Text style={styles.metricTitle}>Subscription Period</Text>
                    <Text style={styles.metricValue}>{subscriptionDays} days</Text>
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <MyCustomButton 
                    title="Rent Now"
                    onPress={handleRent}
                    disabled={loading || estimatedCost === null || rentError !== ''}
                    loading={loading}
                    style={styles.customButton}
                  />
                </View>
              </>
            ) : (
              <Text style={styles.errorText}>No available hashrate to rent.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },

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
  // White "card" with shadow and padding
  card: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },

  // Slider container
  sliderContainer: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
  },

  mobileSliderContainer: {
    marginBottom: 0,
  },

  sliderLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  mobileSliderLabel: {
    marginBottom: 4,
  },

  slider: {
    width: '80%',
    height: 40,
  },

  selectedHashrate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
  mobileSelectedHashrate: {
    marginTop: 0,
    marginBottom: 7,
  },


  // Metrics container
  metricsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // Centers the cards horizontally
    alignItems: 'center',
    marginBottom: 30,
  },
  mobileMetricsContainer: {
    marginBottom: 15,
  },

  metricCard: {
    width: 250, // Fixed width
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    margin: 10, // Adjusted margin for better spacing
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4, // For Android shadow
  },

  mobileMetricCard: {
    padding: 10,
    margin: 7,
  },

  metricTitle: {
    fontSize: 14,
    color: '#6B7280', // Gray color
    marginBottom: 5,
    textAlign: 'center',
  },

  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },

  // Subscription message container
  subscriptionContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  subscriptionText: {
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 5,
  },

  // Error text
  errorText: {
    fontSize: 16,
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
  },

  // Loading container with overlay effect
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0F172A',
  },

  // Button container
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 300, // Maximum width for larger screens
  },

  customButton: {
    width: '90%',
    paddingVertical: 15,
    borderRadius: 10,
  },
});

export default RentHashrateScreen;
