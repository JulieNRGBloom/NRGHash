// utils/api.mjs

import axiosInstance from '../utils/axiosInstance';


export const poolFeesperTHPercentage = 2.5;

// Define and export ASIC-related constants
export const ASIC_POWER_CONSUMPTION_WATTS = 3420; // Example value
export const TH_PER_ASIC = 88; // Example value

export const hostingFeePerKWH = 0.055; // Ensure this is also exported


export const fetchCostData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        asicPowerConsumptionWatts: ASIC_POWER_CONSUMPTION_WATTS,
        energyShare: 0.7143,
        internetShare: 0.0213,
        manpowerShare: 0.2088,
        insuranceShare: 0.0130,
        maintenanceShare: 0.0426,
        ThPerAsic: TH_PER_ASIC, // HR for M30S++
        asicPricePerTH: 2.97, // Luxor index rates
        asicBrokerFee: 50, // Broker fee per ASIC
        asicLifetimeDays: 700, // Estimated <2y
        poolFeesperTHPercentage: poolFeesperTHPercentage, 
        hostingFeePerKWH: hostingFeePerKWH
      });
    }, 1000);
  });
};

export const fetchSubscriptionData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        subscriptionPeriodDays: 30,
        estimatedBTC: 0.00000059,
      });
    }, 1000);
  });
};


export const fetchAppData = async () => {
  try {
    const userCountResponse = await axiosInstance.get('/users/count');
    const userCount = userCountResponse.data?.count || 0;

    const hashrateResponse = await axiosInstance.get('/hashrate');
    const hashrateData = hashrateResponse.data?.data || {};

    return {
      totalHashrateTH: hashrateData.total_hashrate_th ?? 0,
      dedicatedHashratePercentage: 100,
      clients: userCount,
      miningPool: 'Luxor Pool',
      asic: 'Avalon 1246',
    };
  } catch (error) {
    console.error('Error fetching app data:', error);
    throw error; // Let the caller handle errors
  }
};
