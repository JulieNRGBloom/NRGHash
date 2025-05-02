// HomeScreen.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  Image,
  StyleSheet, 
  ScrollView, 
  FlatList, 
  Button, 
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import io from 'socket.io-client'; // Import Socket.io client
import Ionicons from 'react-native-vector-icons/Ionicons'; // Import Ionicons
import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient from Expo
import MyCustomButton from '../components/CustomButton';
import { fetchAppData, fetchCostData, fetchSubscriptionData } from '../utils/api.mjs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import BitcoinLogo from '../assets/bitcoin-logo.png'; // Import your PNG image
import axiosInstance from '../utils/axiosInstance';



function HomeScreen() {
  const [appData, setAppData] = useState({});
  const [costData, setCostData] = useState({});
  const [subscriptionData, setSubscriptionData] = useState({});
  const [userData, setUserData] = useState(null);

  // All blocks from the backend, plus a derived array that indicates whether user subscribed to each
  const [allBlocks, setAllBlocks] = useState([]);
  const [subscriptionBlocks, setSubscriptionBlocks] = useState(new Set());
  const [blocks, setBlocks] = useState([]); // Combined blocks with isSubscribed flag

  const [subscription, setSubscription] = useState(null);
  const [bitcoinAllocated, setBitcoinAllocated] = useState(0);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Socket-based states for real-time Bitcoin pricing
  const [bitcoinPriceUSD, setBitcoinPriceUSD] = useState(null);

  // Real-time states for energy consumption
  const [dailyEnergyConsumption, setDailyEnergyConsumption] = useState(0);
  const [totalEnergyConsumption, setTotalEnergyConsumption] = useState(0);

  // Real-time operational costs
  const [totalCost, setTotalCost] = useState(0);
  const [energyCost, setEnergyCost] = useState(0);
  const [internetCost, setInternetCost] = useState(0);
  const [manpowerCost, setManpowerCost] = useState(0);
  const [insuranceCost, setInsuranceCost] = useState(0);
  const [maintenanceCost, setMaintenanceCost] = useState(0);
  const [poolFees, setPoolFees] = useState(0);

  // Derived break-even price
  const [breakEvenPrice, setBreakEvenPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // For block detail modal
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Other hooks
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const flatListRef = useRef();

  // Detect mobile layout
  const isMobile = width < 768;

  // -----------------------------
  //  Fetch static data on mount
  // -----------------------------
  useEffect(() => {
    const fetchStatic = async () => {
      try {
        const [app, cost, subData] = await Promise.all([
          fetchAppData(),
          fetchCostData(),
          fetchSubscriptionData(),
        ]);
        setAppData(app);
        setCostData(cost);
        setSubscriptionData(subData);
      } catch (err) {
        console.error('Error fetching static data:', err.message);
        Alert.alert('Error', 'Failed to load static data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStatic();
  }, []);

  // -------------------------------------------------------------
  //  Helper to determine your API base URL
  // -------------------------------------------------------------
  const getApiBaseUrl = () => {
    return 'https://api.nrghash.nrgbloom.com/api';
  };

  // -------------------------------------------------------------
  //  Helper: fetch subscription blocks -> returns Set of hashes
  // -------------------------------------------------------------
  const fetchSubscriptionBlocks = async (token = null) => {
    try {
      const authToken = token || (await AsyncStorage.getItem('authToken'));
      if (!authToken) {
        console.log('No auth token found while fetching subscription blocks.');
        return new Set();
      }

      const response = await axiosInstance.get('/blocks/blocks');

      const subscriptionBlockHashes = new Set(
        response.data.blocks.map((block) => block.blockHash)
      );
      setSubscriptionBlocks(subscriptionBlockHashes);
      console.log('Fetched Subscription Blocks:', subscriptionBlockHashes);

      return subscriptionBlockHashes;
    } catch (error) {
      console.error('Error fetching subscription blocks:', error.message);
      Alert.alert(
        'Error',
        'Unable to fetch subscription blocks. Please try again later.'
      );
      return new Set();
    }
  };

  // ---------------------------------------------------
  //  Helper: fetch all blocks -> used in newBlock logic
  // ---------------------------------------------------
  const fetchAllBlocks = async (token = null) => {
    try {
      const authToken = token || (await AsyncStorage.getItem('authToken'));
      if (!authToken) {
        console.log('No auth token found while fetching all blocks.');
        return;
      }

      const response = await axiosInstance.get('/blocks/all-blocks');


      setAllBlocks(response.data.blocks);
      console.log('Fetched All Blocks:', response.data.blocks);
    } catch (error) {
      console.error('Error fetching all blocks:', error.message);
      Alert.alert(
        'Error',
        'Unable to fetch all blocks. Please try again later.'
      );
    }
  };

  // ---------------------------------------
  //  useEffect to initialize Socket.io
  // ---------------------------------------
  useEffect(() => {
    const socket = io('https://api.nrghash.nrgbloom.com', {
      transports: ['websocket'], 
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // On connect, try joining user-specific room (if userId is in token)
    socket.on('connect', async () => {
      console.log('Connected to Socket.io server');
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          // Decode JWT to get userId (adjust to your token structure)
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.user_id; // or however your token stores userId

          if (userId) {
            socket.emit('joinRoom', { userId });
            console.log(`Joined room: user_${userId}`);
          } else {
            console.warn('User ID not found in token payload.');
          }
        } catch (error) {
          console.error('Error decoding token:', error.message);
        }
      } else {
        console.warn('No auth token found for joining rooms.');
      }
    });

    // -----------------------
    //  Subscription updates
    // -----------------------
    socket.on('subscriptionDaysUpdate', (data) => {
      const { subscriptionId, remainingDays } = data;
      console.log(
        `Received subscriptionDaysUpdate for subscription ${subscriptionId}: ${remainingDays} days remaining`
      );
      if (subscription && subscription.subscription_id === subscriptionId) {
        setSubscription((prev) => ({ ...prev, remainingDays }));
      }
    });

    socket.on('subscriptionExpired', (data) => {
      const { subscriptionId, message } = data;
      console.log(
        `Received subscriptionExpired for subscription ${subscriptionId}: ${message}`
      );

      if (subscription && subscription.subscription_id === subscriptionId) {
        Alert.alert('Subscription Expired', message);
        // Update subscription state to null to trigger "No Active Subscription" UI
        setSubscription(null);
      }
    });

    // ------------------------------------------------
    //  Listen for Bitcoin Price Updates
    // ------------------------------------------------
    socket.on('bitcoinPriceUpdate', (data) => {
      console.log('Received Bitcoin Price Update:', data);
      if (data.priceUSD) {
        setBitcoinPriceUSD(parseFloat(data.priceUSD));
      }
    });

    // -------------------------------------------------
    //  Listen for newBlock event -> real-time block, BTC allocated, & pool fees
    // -------------------------------------------------
    socket.on('newBlock', async (data) => {
      console.log('Received newBlock event:', data);
      // Validate incoming bitcoinAllocated
      const newBlockAllocation = parseFloat(data.bitcoinAllocated);
      if (isNaN(newBlockAllocation)) {
        console.error('Invalid bitcoinAllocated received:', data.bitcoinAllocated);
        Alert.alert('Error', 'Received invalid bitcoin allocation data.');
        return;
      }

      // Update local state for BTC Mined
      setBitcoinAllocated((prev) => {
        const updatedValue = prev + newBlockAllocation;
        console.log(`Updated bitcoinAllocated: ${updatedValue}`);
        return updatedValue;
      });

      // Validate and set poolFees from incoming data
      const incomingPoolFees = parseFloat(data.poolFees);
      if (isNaN(incomingPoolFees)) {
        console.error('Invalid poolFees received:', data.poolFees);
        Alert.alert('Error', 'Received invalid pool fee data.');
        return;
      }
      setPoolFees(incomingPoolFees);
      console.log(`Updated poolFees: ${incomingPoolFees} Sats`);

      // Fetch subscription blocks to check if new block is subscribed
      try {
        const token = await AsyncStorage.getItem('authToken');
        const API_BASE_URL = getApiBaseUrl();

        const response = await axios.get(`${API_BASE_URL}/blocks/blocks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const updatedSubBlockHashes = new Set(
          response.data.blocks.map((b) => b.blockHash)
        );
        setSubscriptionBlocks(updatedSubBlockHashes);
        console.log('Updated Subscription Blocks after newBlock:', updatedSubBlockHashes);

        // Determine if new block is subscribed
        const isSubscribed = updatedSubBlockHashes.has(data.blockHash);
        console.log(`Is the new block subscribed? ${isSubscribed}`);

        // Append the new block to the 'blocks' array
        setBlocks((prevBlocks) => {
          const updatedBlocks = [...prevBlocks, { ...data, isSubscribed }];
          console.log('Appended new block:', { ...data, isSubscribed });
          return updatedBlocks;
        });

        // Scroll the FlatList to the end to show the latest block
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      } catch (error) {
        console.error('Error fetching subscription blocks after newBlock:', error.message);

        // Fallback: append the new block with isSubscribed: false
        setBlocks((prevBlocks) => [...prevBlocks, { ...data, isSubscribed: false }]);
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    });

    // On disconnect
    socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.io server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    return () => {
      socket.disconnect();
      console.log('Socket disconnected');
    };
  }, [subscription]); // Dependency on subscription

  // ----------------------------------
  //  Fetch user data, subscription info, blocks
  // ----------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          console.log('No auth token found. User is not logged in.');
          Alert.alert('Authentication Error', 'No auth token found. Please log in.');
          navigation.navigate('LoginScreen');
          return;
        }

        const API_BASE_URL = getApiBaseUrl();

        // 1) Fetch user data
        const userResponse = await axiosInstance.get('/users/me');
        setUserData(userResponse.data.user);

        // 2) Fetch active subscription
        const subscriptionResponse = await axiosInstance.get('/subscriptions/active');
        if (subscriptionResponse.data.subscription) {
          setSubscription(subscriptionResponse.data.subscription);
        } else {
          setSubscription(null);
        }

        // 3) Fetch allocated BTC for the subscription
        const btcResponse = await axiosInstance.get('/subscriptions/active/bitcoin-allocated');
        setBitcoinAllocated(btcResponse.data.bitcoinAllocated);

        // If we have a valid pool fee config, recalc poolFees upfront
        if (costData.poolFeesperTHPercentage && btcResponse.data.bitcoinAllocated) {
          const poolFeePercentage = parseFloat(costData.poolFeesperTHPercentage);
          const allocatedBTC = parseFloat(btcResponse.data.bitcoinAllocated);
          if (!isNaN(poolFeePercentage) && !isNaN(allocatedBTC)) {
            const calculatedPoolFees =
              (poolFeePercentage / 100) * allocatedBTC * 100000000; // BTC -> satoshis
            setPoolFees(calculatedPoolFees);
            console.log(`Calculated initial poolFees: ${calculatedPoolFees} Sats`);
          } else {
            console.warn('Invalid values for poolFeePercentage or allocatedBTC.');
          }
        }

        // 4) Fetch all blocks
        const allBlocksResponse = await axios.get(`${API_BASE_URL}/blocks/all-blocks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAllBlocks(allBlocksResponse.data.blocks);
        console.log('Fetched All Blocks:', allBlocksResponse.data.blocks);

        // 5) Fetch user-specific subscription blocks (hashes)
        const subscriptionBlockHashes = await fetchSubscriptionBlocks(token);
        console.log('Fetched Subscription Blocks:', subscriptionBlockHashes);

        // Sort blocks oldest first
        const sortedAllBlocks = allBlocksResponse.data.blocks.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Combine blocks with isSubscribed flag
        const combinedBlocks = sortedAllBlocks.map((block) => ({
          ...block,
          isSubscribed: subscriptionBlockHashes.has(block.blockHash),
        }));
        setBlocks(combinedBlocks);
        console.log('Combined Blocks:', combinedBlocks);
      } catch (error) {
        console.error('Error loading data:', error.message);
        if (error.response) {
          console.error('Response Data:', error.response.data);
          Alert.alert(
            'Error',
            error.response.data.message || 'An error occurred while loading data.'
          );
        } else if (error.request) {
          console.error('Request Data:', error.request);
          Alert.alert('Error', 'No response from server. Please check your connection.');
        } else {
          console.error('Error Message:', error.message);
          Alert.alert('Error', 'An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigation, costData.poolFeesperTHPercentage, bitcoinAllocated]);

  // --------------------------
  //  Handle tapping on a block
  // --------------------------
  const handleBlockPress = async (block) => {
    // Immediately set the block data
    setSelectedBlock(block);
    const blockId = block.blockId || block.block_id;
    console.log(`Fetching block reward for block ID: ${blockId}`);
    
    console.log('Fetching block reward');
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found');
        return;
      }
      const API_BASE_URL = getApiBaseUrl();

      // Make an API call with the block's identifier (blockId)
      // The endpoint should return data like { bitcoin_allocated: <reward_for_this_block> }
      const response = await axios.get(
        `${API_BASE_URL}/subscriptions/active/bitcoin-allocated/block?blockId=${block.blockId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const blockReward = parseFloat(response.data.bitcoin_allocated);
      // Merge the block-specific reward into the selected block object
      setSelectedBlock((prevBlock) => ({
        ...prevBlock,
        bitcoinAllocated: !isNaN(blockReward) ? blockReward : 0,
      }));
    } catch (error) {
      console.error("Error fetching block-specific reward:", error.message);
      // Optionally set a default if the API call fails
      setSelectedBlock((prevBlock) => ({
        ...prevBlock,
        bitcoinAllocated: 0,
      }));
    }
    setModalVisible(true);
  };
  

  // ---------------------------------------------------
  //  Calculate how many days have passed in the subscription
  // ---------------------------------------------------
  const calculatePassedDays = () => {
    if (
      !subscription ||
      typeof subscription.remainingDays !== 'number' ||
      typeof subscriptionData.subscriptionPeriodDays !== 'number'
    ) {
      console.warn('Subscription data is incomplete or missing.');
      return 0;
    }
    // Example: if total period is 90 days, and user has 50 days left, then 40 days have passed
    const passed = subscriptionData.subscriptionPeriodDays - subscription.remainingDays;
    return passed >= 0 ? passed : 0;
  };

  // Use memo for derived passed days
  const passedDays = useMemo(() => calculatePassedDays(), [
    subscription,
    subscriptionData,
  ]);

  // -------------------------------------------------------------------
  //  Recalculate daily/total energy consumption & operational costs
  // -------------------------------------------------------------------
  useEffect(() => {
    if (
      costData.asicPowerConsumptionWatts &&
      costData.ThPerAsic &&
      costData.hostingFeePerKWH &&
      subscription &&
      subscription.hashrate &&
      costData.energyShare &&
      costData.internetShare &&
      costData.manpowerShare &&
      costData.insuranceShare &&
      costData.maintenanceShare
    ) {
      // 1) Calculate daily consumption in kWh
      const dailyEnergy =
        ((costData.asicPowerConsumptionWatts / costData.ThPerAsic) *
          subscription.hashrate *
          24) /
        1000;
      setDailyEnergyConsumption(dailyEnergy);

      // 2) Calculate total consumption so far
      const totalEnergy = dailyEnergy * passedDays;
      setTotalEnergyConsumption(totalEnergy);

      // 3) Calculate total cost (hostingFeePerKWH * totalEnergy)
      const calculatedTotalCost = costData.hostingFeePerKWH * totalEnergy;
      setTotalCost(calculatedTotalCost);

      // 4) Distribute cost among categories
      const calcEnergyCost = calculatedTotalCost * costData.energyShare;
      setEnergyCost(calcEnergyCost);

      const calcInternetCost = calculatedTotalCost * costData.internetShare;
      setInternetCost(calcInternetCost);

      const calcManpowerCost = calculatedTotalCost * costData.manpowerShare;
      setManpowerCost(calcManpowerCost);

      const calcInsuranceCost = calculatedTotalCost * costData.insuranceShare;
      setInsuranceCost(calcInsuranceCost);

      const calcMaintenanceCost = calculatedTotalCost * costData.maintenanceShare;
      setMaintenanceCost(calcMaintenanceCost);

      // Pool fees are recalculated on the newBlock event and initial load
    }
  }, [costData, subscription, passedDays, bitcoinPriceUSD, bitcoinAllocated]);

  // ----------------------------------
  //  Calculate break-even price
  // ----------------------------------
  useEffect(() => {
    if (
      subscription &&
      subscriptionData.estimatedBTC &&
      subscription.hashrate &&
      costData.poolFeesperTHPercentage &&
      costData.asicPricePerTH &&
      costData.asicBrokerFee &&
      costData.ThPerAsic &&
      costData.asicLifetimeDays &&
      costData.asicPowerConsumptionWatts &&
      costData.hostingFeePerKWH &&
      energyCost &&
      bitcoinPriceUSD
    ) {
      // 1) subscriptionPeriodDays
      const subPeriodDays = calculateSubscriptionPeriod();
      console.log(`subPeriodDays: ${subPeriodDays}`);
      if (!subPeriodDays) {
        console.warn('Subscription period could not be calculated.');
        return;
      }

      // 2) total estimated BTC for the entire subscription
      const totalEstimatedBTC = subscriptionData.estimatedBTC * subPeriodDays;
      console.log(`Total estimated BTC: ${totalEstimatedBTC}`);

      // 3) ASIC acquiring costs (amortized daily)
      const asicAcquiringCosts =
        (costData.asicPricePerTH + costData.asicBrokerFee / costData.ThPerAsic) /
        costData.asicLifetimeDays; 
      console.log(`ASIC acquisition cost: $${asicAcquiringCosts}`);

      // 4) operational costs for the entire subscription
      const operationalCosts =
        (((costData.asicPowerConsumptionWatts / costData.ThPerAsic) * 24 * subPeriodDays) /
          1000) *
        costData.hostingFeePerKWH;
      console.log(`Operational costs: $${operationalCosts}`);

      // 5) poolFees in BTC
      const poolFeesInBTC = poolFees / 100_000_000;
      console.log(`Pool fees: ${poolFeesInBTC}`);
      // Final break-even in USD
      const breakEven =
        (operationalCosts + asicAcquiringCosts + poolFeesInBTC) / totalEstimatedBTC;
      console.log(`Break-Even Price: $${breakEven.toFixed(2)}`);

      setBreakEvenPrice(breakEven);
    }
  }, [
    subscription,
    subscriptionData.estimatedBTC,
    costData.poolFeesperTHPercentage,
    costData.asicPricePerTH,
    costData.asicBrokerFee,
    costData.ThPerAsic,
    costData.asicLifetimeDays,
    costData.asicPowerConsumptionWatts,
    costData.hostingFeePerKWH,
    energyCost,
    bitcoinPriceUSD,
    poolFees,
  ]);

  // Helper to compute total subscription days
  const calculateSubscriptionPeriod = () => {
    if (!subscription || !subscription.start_date || !subscription.end_date) {
      console.warn('Subscription data is incomplete or missing.');
      return 0;
    }
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);
    const timeDiff = endDate - startDate;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  // ------------------------------------------------------
  //  Recalculate break-even when poolFees or other dependencies change
  // ------------------------------------------------------
 
  useFocusEffect(
    useCallback(() => {
      const fetchLatestPrice = async () => {
        setPriceLoading(true);
        try {
          const app = await fetchAppData();
          setAppData(app);
        } catch (err) {
          console.error('Error fetching latest bitcoin price:', err.message);
        } finally {
          setPriceLoading(false);
        }
      };
  
      fetchLatestPrice();
    }, [])
  );

  // ------------------------------------------------------
  //  UI starts here
  // ------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14489b" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Updated condition to check if subscription is null or invalid
  if (!subscription || (subscription.is_valid === false)) {
    console.log('No active subscriptions found or subscription is invalid.');
    return (
      <View style={styles.containerCentered}>
        <Text style={styles.noSubscriptionText}>
          You are not currently hashing. Rent hashrate to start mining with us.
        </Text>
        <MyCustomButton
          title="Rent Hashrate"
          onPress={() => navigation.navigate('RentHashrateScreen')}
          style={styles.button}
        />
      </View>
    );
  }

  // Removed the following line to fix the error:
  // console.log(`Rendering ${subscriptionPeriods.length} subscription(s).`);

  return (
    <ScrollView
      style={[styles.container, isMobile && styles.containerMobile]}
      contentContainerStyle={isMobile ? { paddingHorizontal: 10 } : {}}
    >
      <Text style={[styles.title, isMobile && styles.titleMobile]}>Dashboard</Text>

      {/* Grid Section */}
      <View style={[styles.grid, isMobile && styles.gridMobile]}>
        {/* Card: Subscription Stats */}
        <View style={[styles.card, getCardStyle(width)]}>
          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={[styles.cardTitle, isMobile && styles.cardTitleTwoMobile]}>
              Your Hashrate
            </Text>
            <Text style={[styles.cardValueTwo, isMobile && styles.cardValueTwoMobile]}>
              {subscription.hashrate} TH/s
            </Text>
          </View>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={[styles.cardTitle, isMobile && styles.cardTitleTwoMobile]}>
              BTC Mined
            </Text>
            <View style={styles.btcMinedView}>
              <Text style={[styles.cardValueTwo, isMobile && styles.cardValueTwoMobile]}>
              {bitcoinAllocated.toFixed(8)}
              </Text>
              <View style={styles.logoContainer}>
                <Image source={BitcoinLogo} style={[styles.bitcoinLogo, isMobile && styles.bitcoinLogoMobile]} />
              </View>
            </View>
            
          </View>

          <View style={[styles.insideCard]}>
            <Text style={[styles.cardTitle, isMobile && styles.cardTitleTwoMobile]}>
              Remaining Time
            </Text>
            <Text style={[styles.cardValueTwo, isMobile && styles.cardValueTwoMobile]}>
              {subscription.remainingDays} days
            </Text>
          </View>
        </View>

        {/* Card: Mining Pool Stats */}
        <View style={[styles.card, getCardStyle(width)]}>
          <View style={[styles.insideCard]}>
            <Text style={styles.subtitle}>Mining Pool Stats</Text>
          </View>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={[styles.cardTitleTwo, isMobile && styles.cardTitleTwoMobile]}>
              Mining Pool:
            </Text>
            <Text style={styles.cardValue}>{appData.miningPool}</Text>
          </View>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={[styles.cardTitleTwo, isMobile && styles.cardTitleTwoMobile]}>
              Mining Pool Fee
            </Text>
            <Text style={styles.cardValue}>{costData.poolFeesperTHPercentage}%</Text>
          </View>

          {/* Block Timeline */}
          <View style={styles.blockchainContainer}>
            <LinearGradient
              colors={['rgba(249, 250, 251, 1)', 'rgba(249, 250, 251, 0)']}
              style={styles.leftGradient}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(249, 250, 251, 0)', 'rgba(249, 250, 251, 1)']}
              style={styles.rightGradient}
              pointerEvents="none"
            />

            <FlatList
              ref={flatListRef}
              // data={blocks}
              data={blocks.slice(-70)} // Only use the last 70 blocks
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleBlockPress(item)}
                  style={styles.blockItemContainer}
                >
                  <Ionicons
                    name={item.isSubscribed ? 'cube' : 'cube-outline'}
                    size={50}
                    color={item.isSubscribed ? '#14489b' : '#888'}
                    style={styles.cubeIcon}
                  />
                  <View style={styles.blockInfo}>
                    <Text style={styles.blockText}>Block ID: {item.blockId}</Text>
                  </View>
                </TouchableOpacity>
              )}
              horizontal={true}
              style={styles.blockList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.blockListContent}
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
              onLayout={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }}
            />
          </View>

          {/* Modal for Block Details */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            {selectedBlock && (
              <View style={styles.modalOverlay}>
                <View style={styles.modalView}>
                  <Text style={styles.modalTitle}>Block Details</Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Height:</Text> {selectedBlock.height}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Hash:</Text> {selectedBlock.blockHash}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Time:</Text>{' '}
                    {new Date(selectedBlock.timestamp).toLocaleString()}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.modalLabel}>Reward:</Text>{' '}
                    {selectedBlock.bitcoinMined} BTC
                  </Text>
                  {selectedBlock.isSubscribed && (
                    <Text style={styles.modalText}>
                      <Text style={styles.modalLabel}>Your Reward:</Text>{' '}
                      {typeof selectedBlock.bitcoinAllocated === 'number'
                        ? selectedBlock.bitcoinAllocated.toFixed(8)
                        : 'Reward not available'} BTC
                    </Text>
                  )}
                  <Text style={styles.modalText}>
                    {selectedBlock.isSubscribed
                      ? 'You helped mine this block and received a reward.'
                      : 'You did not help mine this block and did not receive a reward.'}
                  </Text>
                  <Button
                    title="Close"
                    onPress={() => setModalVisible(!modalVisible)}
                    color="#14489b"
                  />
                </View>
              </View>
            )}
          </Modal>
        </View>
      </View>

      {/* Grid Two Section */}
      <View style={[styles.gridTwo, isMobile && styles.gridMobile]}>
        {/* Operational Costs Card */}
        <View style={[styles.card, getCardStyle(width)]}>
          <Text style={styles.subtitle}>Operational Costs</Text>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={styles.cardTitleTwo}>Energy Cost</Text>
            <Text style={styles.cardValue}>${energyCost.toFixed(2)}</Text>
          </View>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={styles.cardTitleTwo}>Internet Cost</Text>
            <Text style={styles.cardValue}>${internetCost.toFixed(2)}</Text>
          </View>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={styles.cardTitleTwo}>Manpower Cost</Text>
            <Text style={styles.cardValue}>${manpowerCost.toFixed(2)}</Text>
          </View>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={styles.cardTitleTwo}>Insurance Cost</Text>
            <Text style={styles.cardValue}>${insuranceCost.toFixed(2)}</Text>
          </View>

          <View style={[styles.insideCard, styles.horizontalLine]}>
            <Text style={styles.cardTitleTwo}>Maintenance & Repair Costs</Text>
            <Text style={styles.cardValue}>${maintenanceCost.toFixed(2)}</Text>
          </View>

          <View style={[styles.insideCard]}>
            <Text style={styles.cardTitle}>Total Operational Cost</Text>
            <Text style={styles.cardValue}>${totalCost.toFixed(2)}</Text>
          </View>

          <View style={[styles.insideCard]}>
            <Text style={styles.cardTitle}>Pool Fees</Text>
            <Text style={styles.cardValue}>
              {poolFees.toFixed(0)} Sats
            </Text>
          </View>
        </View>

        {/* Grid Three Container */}
        <View style={[styles.gridThree, isMobile && styles.gridThreeMobile, getGridThreeStyle(width)]}>
          {/* Bitcoin Stats Card */}
          <View style={[styles.card, getGridThreeCardStyle(width)]}>
            <Text style={styles.subtitle}>Bitcoin Stats</Text>

            <View style={[styles.insideCard, styles.horizontalLine]}>
              <Text style={styles.cardTitleTwo}>Price:</Text>
              <View style={styles.bitcoinPriceView}>
                {/* USD Price */}
                <Text style={styles.cardValue}>
                  {bitcoinPriceUSD !== null ? `$${formatPrice(bitcoinPriceUSD)}` : 'Loading...'}
                </Text>
              </View>
            </View>

            <View style={[styles.insideCard]}>
              <Text style={styles.cardTitleTwo}>Break-Even Price:</Text>
              <Text style={styles.cardValue}>
                {breakEvenPrice !== null ? `$${formatPrice(breakEvenPrice)}` : 'Calculating...'}
              </Text>
            </View>
          </View>

          {/* ASIC Info Card */}
          <View style={[styles.card, getGridThreeCardStyle(width)]}>
            <View style={styles.insideCard}>
              <Text style={styles.subtitle}>ASIC Info</Text>
            </View>
            <View
              style={[
                styles.asicImageInfoContainer,
                isMobile && styles.asicImageInfoContainerMobile
              ]}
            >
              <Image
                source={require('../assets/avalon_88.webp')}
                style={styles.asicImage}
              />
              <View style={styles.insideCardTwo}>
                <View style={[styles.insideCard, isMobile && styles.insideCardMobile]}>
                  <Text
                    style={[
                      styles.cardTitleTwo,
                      isMobile && styles.asicCardTitleTwoMobile
                    ]}
                  >
                    ASIC Miner:
                  </Text>
                  <Text
                    style={[
                      styles.cardValue,
                      isMobile && styles.asicCardValueTwoMobile
                    ]}
                  >
                    {appData.asic || 'N/A'}
                  </Text>
                </View>

                <View style={styles.insideCard}>
                  <Text style={styles.cardTitleTwo}>Hashrate:</Text>
                  <Text style={styles.cardValue}>
                    {costData.ThPerAsic || 'N/A'} TH/s
                  </Text>
                </View>

                <View style={styles.insideCard}>
                  <Text style={styles.cardTitleTwo}>Power Consumption:</Text>
                  <Text style={styles.cardValue}>
                    {costData.asicPowerConsumptionWatts || 'N/A'} W
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Energy Stats Card */}
          <View style={[styles.card, getGridThreeCardStyle(width)]}>
            <Text style={styles.subtitle}>Energy Stats</Text>
            <View style={[styles.insideCard, styles.horizontalLine]}>
              <Text style={styles.cardTitleTwo}>Daily Power Consumption</Text>
              <Text style={styles.cardValue}>
                {dailyEnergyConsumption.toFixed(2)} kWh
              </Text>
            </View>
            <View style={[styles.insideCard]}>
              <Text style={styles.cardTitleTwo}>Total Power Consumption</Text>
              <Text style={styles.cardValue}>
                {totalEnergyConsumption.toFixed(2)} kWh
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// **Helper function to get dynamic styles for regular cards based on width**
const getCardStyle = (width) => {
  if (width >= 768) {
    return { width: '48%' }; // 2 cards per row for desktop and tablet
  } else {
    return { width: '100%' }; // 1 card per row for mobile
  }
};

// **Helper function for gridThree container**
const getGridThreeStyle = (width) => {
  if (width >= 768) {
    return { width: '48%', flexDirection: 'column' }; // 2 columns: operational costs and gridThree
  } else {
    return { width: '100%', flexDirection: 'column' }; // Stack vertically on mobile
  }
};

// **Helper function for gridThree cards**
const getGridThreeCardStyle = (width) => {
  if (width >= 768) {
    return { width: '100%', marginBottom: 10 }; // Full width within gridThree on desktop
  } else {
    return { width: '100%', marginBottom: 10 }; // Full width on mobile
  }
};

// Get device dimensions for gradient overlays
const deviceWidth = Dimensions.get('window').width;
const gradientWidth = 40; // Width of the gradient overlays

// Stylesheet without dynamic variables
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 40, // Default padding, can be overridden
  },
  containerMobile: {
    padding: 15, // Adjusted padding for mobile
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSubscriptionText: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#333',
    fontSize: 18,
    marginTop: 10,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'left',
    marginBottom: 20,
    marginTop: 10,
    marginLeft: 8,
  },
  titleMobile: {
    marginBottom: 20,
    marginTop: 10,
    marginLeft: 0,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 15,
    textAlign: 'left',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Align cards to the start
  },
  gridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Align cards to the start
    marginTop: 10, // Added margin to separate from previous content
  },
  gridMobile: {
    justifyContent: 'center', // Align cards to the start
  },
  gridThree: {
    flexDirection: 'column', // Default direction
  },
  gridThreeMobile: {
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4, // For Android shadow
    // flex: 1, // Removed to prevent stretching and conflicts with width
    justifyContent: 'space-evenly',
  },
  insideCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  asicImageInfoContainer: {
    flexDirection: 'row', // Default direction
    alignItems: 'center', // Align image and text vertically
    justifyContent: 'flex-start', // Align content to the start of the row
    padding: 10, // Add consistent padding around the container
  },
  // **New Style for Mobile: Column Reverse**
  asicImageInfoContainerMobile: {
    flexDirection: 'column-reverse',
    padding: 0, // Optional: Adjust padding for mobile if needed
  },
  asicCardTitleTwoMobile: {
    textAlign: 'left',
  },
  asicCardValueTwoMobile: {
    textAlign: 'right',
  },
  asicImage: {
    width: 100, // Fixed width for the image
    height: 100, // Fixed height for the image
    marginRight: 16, // Spacing between image and text
    resizeMode: 'contain', // Prevent distortion of the image
  },
  insideCardTwo: {
    flex: 1, // Allow text container to take remaining space
    justifyContent: 'space-evenly', // Evenly distribute text rows
    width: '100%'
  },
  cardTitleTwo: {
    fontSize: 16,
    fontWeight: '600', // Medium font weight for titles
    color: '#222',
    marginBottom: 4, // Add spacing below title
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600', // Normal font weight for values
    color: '#777',
  },  
  horizontalLine: {
    borderBottomColor: '#e1e1e1',
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  cardTwo: {
    borderRadius: 12,
    padding: 16,
    margin: 8,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTwoMobile: {
    padding: 5,
    marginBottom: 5,
  },
  cardTitleTwo: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardTitleTwoMobile: {
    fontSize: 14, // Smaller font on mobile
  },
  cardValueTwo: {
    fontSize: 24,
    fontWeight: '600',
    paddingBottom: 10,
    color: '#222',
    textAlign: 'center',
  },
  cardValueTwoMobile: {
    fontSize: 20, // Adjusted to prevent overflow on mobile
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  blockchainContainer: {
    marginTop: 10,
    marginBottom: 20,
    position: 'relative', // To position gradient overlays
  },
  blockList: {
    // Additional styling if needed
  },
  blockListContent: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    paddingLeft: gradientWidth, // Prevent first item from being hidden under left gradient
    paddingRight: gradientWidth, // Prevent last item from being hidden under right gradient
  },
  blockItemContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  cubeIcon: {
    marginBottom: 5,
  },
  blockInfo: {
    alignItems: 'center',
  },
  blockText: {
    fontSize: 16,
    color: '#555',
  },
  blockTime: {
    fontSize: 12,
    color: '#888',
  },
  separator: {
    width: 20, // Adjust width for horizontal separator
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#14489b',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  modalLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  // Gradient Overlays
  leftGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: gradientWidth,
    zIndex: 1,
  },
  rightGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: gradientWidth,
    zIndex: 1,
  },
  // Optional: Scroll Arrows
  leftArrow: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 2,
  },
  rightArrow: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 2,
  },
  button: {
    width: 200,
  },
  // **Additional Styles for Mobile Layouts (Optional)**
  insideCardMobile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  asicCardTitleTwoMobile: {
    textAlign: 'left',
  },
  asicCardValueTwoMobile: {
    textAlign: 'right',
  },
  bitcoinPriceView: {
    alignItems: 'flex-end', // Changed from 'end' to 'flex-end' for proper alignment
  },
  btcMinedView: {
    flexDirection: 'row',
  },
  logoContainer: {
    paddingLeft: 3,
  },
  bitcoinLogo: {
    width: 30,
    height: 30
  },
  bitcoinLogoMobile: {
    width: 25,
    height: 25
  }
});

// **Helper function to format Bitcoin Price**
const formatPrice = (price) => {
  if (isNaN(price)) return '0.00';
  return Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


export default HomeScreen;
