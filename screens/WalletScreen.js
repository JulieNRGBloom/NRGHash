import React, { useState, useEffect } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MyCustomButton from '../components/CustomButton';
import { useWindowDimensions } from 'react-native';
import BitcoinLogo from '../assets/bitcoin-logo.png'; // Import your PNG image
import axiosInstance from '../utils/axiosInstance';


function WalletScreen() {
  
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]); // Add this line


  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Price & equivalents
  const [bitcoinPriceNGN, setBitcoinPriceNGN] = useState(null);
  const [nairaEquivalent, setNairaEquivalent] = useState(null);
  const [pendingNairaEquivalent, setPendingNairaEquivalent] = useState(null);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNGN, setWithdrawalNGN] = useState('');
  const [updateBankDetails, setUpdateBankDetails] = useState(false);

  const [isWithdrawalValid, setIsWithdrawalValid] = useState(false);

  /**
   * Retrieves the stored authentication token.
   */
  const getToken = async () => {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (err) {
      console.error('Failed to retrieve token:', err);
      return null;
    }
  };

  /**
   * Fetches wallet data from the backend (GET /wallets).
   */
  const fetchWalletData = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('User not authenticated. Please log in.');

      const response = await axiosInstance.get('/wallets');

      if (response.data.success) {
        setWalletData(response.data.wallet);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch wallet data.');
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err.message);
      setError(err.message);
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
        const token = await getToken();
        if (!token) throw new Error('User not authenticated.');

        const response = await axiosInstance.get('/wallets/my-withdrawals');

        if (response.data.success) {
            if (Array.isArray(response.data.withdrawals)) {
                setWithdrawalRequests(response.data.withdrawals); // ✅ Normal case
            } else if (response.data.pending || response.data.processed || response.data.rejected) {
                // ✅ If API groups by status, merge them into a single array
                setWithdrawalRequests([
                    ...response.data.pending,
                    ...response.data.processed,
                    ...response.data.rejected
                ]);
            } else {
                setWithdrawalRequests([]); // Default to empty if unexpected response
            }
        } else {
            console.error("Unexpected API response:", response.data);
            setWithdrawalRequests([]);
        }
    } catch (err) {
        console.error('Error fetching withdrawals:', err.message);
        setWithdrawalRequests([]); // Prevent undefined issues
    }
  };

  const deleteWithdrawalRequest = async (withdrawalId) => {
    try {
      
        const response = await axiosInstance.delete(`/wallets/withdrawals/${withdrawalId}`);

        if (response.data.success) {
            Alert.alert('Success', 'Withdrawal request deleted successfully.');

            // Refresh withdrawals after deleting
            await Promise.all([fetchWalletData(), fetchWithdrawalRequests()]);

        } else {
            Alert.alert('Error', response.data.message || 'Failed to delete withdrawal.');
        }
    } catch (error) {
        console.error('Error deleting withdrawal:', error.response?.data || error.message);
        Alert.alert('Error', error.response?.data?.message || error.message);
    }
  };


  /**
   * Fetches the current Bitcoin price in NGN from Binance.
   */
  const fetchBitcoinPriceNGN = async () => {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCNGN');
      const priceNGN = parseFloat(response.data.price);
      if (isNaN(priceNGN)) {
        throw new Error('Invalid priceNGN fetched from Binance.');
      }
      setBitcoinPriceNGN(priceNGN);
    } catch (error) {
      console.error('Error fetching Bitcoin price in NGN:', error.message);
      Alert.alert('Error', 'Failed to fetch Bitcoin price. Naira equivalent will not be displayed.');
    }
  };

  /**
   * Fetch the user's existing bank details from GET /users/me (if stored).
   */
  const fetchUserBankDetails = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('User not authenticated.');

      const response = await axiosInstance.get('/users/me');


      if (response.data.success && response.data.user) {
        // Suppose your user table has bank_name, bank_account_number, account_holder_name columns
        setBankName(response.data.user.bank_name || '');
        setBankAccount(response.data.user.bank_account_number || '');
        setAccountHolderName(response.data.user.account_holder_name || '');
      }
    } catch (err) {
      console.error('Error fetching user bank info:', err.message);
      // It's not critical, so we won't throw an alert here
    }
  };

  /**
   * On mount, fetch wallet data, Bitcoin price, and user bank details.
   */
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchWalletData(),
        fetchBitcoinPriceNGN(),
        fetchUserBankDetails(),
      ]);
      setLoading(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    const initialize = async () => {
        await Promise.all([fetchWalletData(), fetchWithdrawalRequests()]);
        setLoading(false);
    };
    initialize();
  }, []);


  /**
   * Calculate Naira equivalents if wallet data & price are loaded.
   */
  useEffect(() => {
    if (walletData && bitcoinPriceNGN) {
      const available = parseFloat(walletData.available_btc) || 0;
      const pending = parseFloat(walletData.pending_withdrawal) || 0;

      setNairaEquivalent(available * bitcoinPriceNGN);
      setPendingNairaEquivalent(pending * bitcoinPriceNGN);
    }
  }, [walletData, bitcoinPriceNGN]);

  /**
   * Update local NGN equivalent whenever withdrawal amount changes.
   */
  useEffect(() => {
    if (withdrawalAmount && bitcoinPriceNGN) {
      const amount = parseFloat(withdrawalAmount);
      if (!isNaN(amount)) {
        setWithdrawalNGN((amount * bitcoinPriceNGN).toFixed(0));
      } else {
        setWithdrawalNGN('');
      }
    } else {
      setWithdrawalNGN('');
    }
  }, [withdrawalAmount, bitcoinPriceNGN]);


  useEffect(() => {
    const amount = parseFloat(withdrawalAmount);
    const availableBTC = parseFloat(walletData?.available_btc) || 0;
  
    if (!isNaN(amount) && amount > 0 && amount <= availableBTC) {
      setIsWithdrawalValid(true);
    } else {
      setIsWithdrawalValid(false);
    }
  }, [withdrawalAmount, walletData]);
  

  /**
   *  Handle user pressing "Withdraw" => open the modal.
   */
  const handleWithdraw = () => {
    setModalVisible(true);
  };

  /**
   *  Submit the withdrawal request to the backend:
   *  - Optionally update user's bank details if user toggles updateBankDetails.
   *  - Then create a withdrawal request with /wallets/withdraw.
   */
  const submitWithdrawalRequest = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('User not authenticated.');
  
      // Basic validation
      if (!bankName || !bankAccount || !accountHolderName) {
        Alert.alert(
          'Error',
          'Please fill in all bank details. Incorrect data may lead to loss of funds.'
        );
        return;
      }
  
      const amountBtc = parseFloat(withdrawalAmount);
      if (isNaN(amountBtc) || amountBtc <= 0) {
        Alert.alert('Error', 'Please enter a valid withdrawal amount in BTC.');
        return;
      }
  
  
      // Update stored bank details if required
      if (updateBankDetails) {
        await axiosInstance.put('/users/me', {
          bank_name: bankName,
          bank_account_number: bankAccount,
          account_holder_name: accountHolderName,
        });
        
      }
  
      // Log data before sending the request
      console.log('Submitting withdrawal request:', {
        amount_btc: amountBtc.toFixed(8),
        bank_name: bankName,
        bank_account_number: bankAccount,
        account_holder_name: accountHolderName,
      });
  
      // Send withdrawal request
      const response = await axiosInstance.post('/wallets/withdraw', {
        amount_btc: amountBtc.toFixed(8),
        bank_name: bankName,
        bank_account_number: bankAccount,
        account_holder_name: accountHolderName,
      });      
  
      // Log API response
      console.log('Withdrawal response:', response.data);
  
      if (response.data.success) {
        Alert.alert('Success', 'Withdrawal request created successfully.');
        setModalVisible(false);
        await Promise.all([fetchWalletData(), fetchWithdrawalRequests()]);

      } else {
        Alert.alert('Error', response.data.message || 'Withdrawal request failed.');
      }
    } catch (error) {
      console.error('Error creating withdrawal request:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || error.message);
    }
  };
  

  /**
   * Render loading or error states.
   */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14489b" />
        <Text style={styles.loadingText}>Loading Wallet...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <MyCustomButton
          title="Retry"
          onPress={fetchWalletData}
          style={styles.button}
        />
      </View>
    );
  }

  /**
   * Normal Wallet UI
   */
  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <Text style={[styles.title, isMobile && styles.titleMobile]}>Wallet</Text>

      {/* Row for Balance + Pending */}
      <View style={[styles.containersWrapper, !isMobile && styles.containersWrapperDesktop]}>
        {/* Available BTC */}
        <View style={[styles.balanceContainer, !isMobile && styles.balanceContainerDesktop]}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <View style={styles.balanceRow}>
            <View style={styles.logoContainer}>
              <Image source={BitcoinLogo} style={{ width: 30, height: 30 }} />
            </View>
            <Text style={styles.balanceValue}>
              {walletData.available_btc ? parseFloat(walletData.available_btc).toFixed(8) : "0.00000000"}
            </Text>
          </View>
          {nairaEquivalent !== null && (
            <Text style={styles.equivalent}>
              ₦ {nairaEquivalent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          )}
        </View>

        {/* Pending Withdrawals */}
        <View style={[styles.infoContainer, !isMobile && styles.infoContainerDesktop]}>
          <Text style={styles.withdrawalLabel}>Pending Withdrawal</Text>
          <View style={styles.balanceRow}>
            <View style={styles.logoContainer}>
              <Image source={BitcoinLogo} style={{ width: 30, height: 30 }} />
            </View>
            <Text style={styles.value}>
              {walletData.pending_withdrawal ? parseFloat(walletData.pending_withdrawal).toFixed(8) : "0.00000000"}
            </Text>
          </View>
          {pendingNairaEquivalent !== null && (
            <Text style={styles.withdrawalEquivalent}>
              ₦ {pendingNairaEquivalent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          )}
        </View>
      </View>


      {/* Withdraw Button */}
      <View style={styles.buttonContainer}>
      <MyCustomButton
        title="Withdraw"
        onPress={handleWithdraw}
        style={{ ...styles.button, ...(!isMobile ? styles.buttonDesktop : {}) }}
      />

      </View>

      {/* Withdrawals List */}
      <Text style={styles.subTitle}>Your Withdrawal Requests</Text>
      <ScrollView>
        {withdrawalRequests && withdrawalRequests.length > 0 ? (
          withdrawalRequests.map((request) => (
            <View key={request.id} style={styles.withdrawalItem}>
              <Text>Amount: {parseFloat(request.amount_btc).toFixed(8)} BTC</Text>
              <Text>Status: {request.is_processed ? 'Processed' : request.is_rejected ? 'Rejected' : 'Pending'}</Text>
              
              {!request.is_processed && !request.is_rejected && (
                <TouchableOpacity onPress={() => deleteWithdrawalRequest(request.id)} style={styles.deleteIcon}>
                  <Text style={styles.deleteText}>❌</Text>
                </TouchableOpacity>
              )}
            </View>

          ))
        ) : (
          <Text style={styles.noWithdrawals}>No withdrawals yet.</Text>
        )}
      </ScrollView>



      {/* Modal for withdrawal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Withdrawal Request</Text>

              <Text style={styles.modalInfo}>
                Please fill in your bank details. If incorrect, funds may be lost.
              </Text>

              {/* Bank name */}
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
              />
              {/* Bank account number */}
              <Text style={styles.inputLabel}>Bank Account Number</Text>
              <TextInput
                style={styles.input}
                value={bankAccount}
                onChangeText={setBankAccount}
                keyboardType="numeric"
              />
              {/* Account holder name */}
              <Text style={styles.inputLabel}>Account Holder Name</Text>             
              <TextInput
                style={styles.input}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
              />

              

              {/* BTC withdrawal amount */}
              <Text style={styles.inputLabel}>Withdrawal Amount (BTC)</Text>
              <View style={styles.inputRow}>
              {withdrawalAmount &&
              parseFloat(withdrawalAmount) > parseFloat(walletData?.available_btc) && (
                <Text style={{ color: 'red', marginTop: 5 }}>
                  Amount exceeds available BTC balance.
                </Text>
              )}

                <TextInput
                  style={styles.input}
                  value={withdrawalAmount}
                  onChangeText={setWithdrawalAmount}
                  keyboardType="numeric"
                />
                {withdrawalNGN !== null && (
                  <Text style={styles.modalEquiv}>
                    ₦ {parseFloat(withdrawalNGN).toLocaleString()}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.maxButton}
                  onPress={() => setWithdrawalAmount(
                    (parseFloat(walletData.available_btc)).toFixed(8)
                  )}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>

              </View>
              

              {/* Toggle row for updating bank details */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Update stored bank details?</Text>
                <View style={styles.toggleButtonGroup}>
                  <TouchableOpacity
                    style={[styles.toggleButton, updateBankDetails && styles.toggleButtonSelected]}
                    onPress={() => setUpdateBankDetails(true)}
                  >
                    <Text style={[styles.toggleButtonText, updateBankDetails && styles.toggleButtonTextSelected]}>Yes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleButton, !updateBankDetails && styles.toggleButtonSelected]}
                    onPress={() => setUpdateBankDetails(false)}
                  >
                    <Text style={[styles.toggleButtonText, !updateBankDetails && styles.toggleButtonTextSelected]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>


              {/* Submit + Cancel */}
              <MyCustomButton
                title="Submit Withdrawal Request"
                onPress={submitWithdrawalRequest}
                style={[
                  styles.modalButton,
                  !isWithdrawalValid && { backgroundColor: '#ccc' } // Gray out when invalid
                ]}
                disabled={!isWithdrawalValid}
              />


              <MyCustomButton
                title="Cancel"
                onPress={() => setModalVisible(false)}
                style={{ ...styles.modalButton, backgroundColor: '#888' }}
              />

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------
//       STYLES
// ---------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 40,
  },
  containerMobile: {
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#14489b',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
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
  },
  containersWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  containersWrapperDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    width: '100%',
  },
  balanceContainer: {
    alignItems: 'center',
    margin: 8,
    backgroundColor: '#14489b',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  balanceContainerDesktop: {
    width: '45%',
    maxWidth: 500,
    padding: 20,
    marginBottom: 30
  },
  infoContainer: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 24,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  infoContainerDesktop: {
    width: '45%',
    maxWidth: 500,
    padding: 20,
    marginBottom: 30,
  },
  logoContainer: {
    paddingRight: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 10,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    fontWeight: '100',
  },
  balanceValue: {
    fontSize: 26,
    fontWeight: '600',
    color: '#fff',
  },
  equivalent: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
    fontWeight: '100',
  },
  withdrawalLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    fontWeight: '100',
  },
  withdrawalEquivalent: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    fontWeight: '100',
  },
  value: {
    fontSize: 26,
    fontWeight: '600',
    color: '#333',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#14489b',
    padding: 5,
    borderRadius: 8,
    alignItems: 'center',
    width: '50%',
    padding: 8,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDesktop: {
    marginTop: 40,
    padding: 15,
    width: '20%',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInfo: {
    fontSize: 14,
    marginBottom: 35,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 6,
    marginVertical: 8,
    paddingHorizontal: 10,
  },
  inputLabel: {
    alignSelf: 'flex-start',
  },
  inputRow: {
    width: '100%',
  },
  maxButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#14489b',
    borderRadius: 6,
    width: 60,
  },
  maxButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalEquiv: {
    fontSize: 12,
    color: '#666',
    fontWeight: '100',
    paddingLeft: 8,
    marginBottom: 5,
    marginTop: -5,
  },
  toggleRow: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
  },
  
  toggleButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginHorizontal: 5,
  },
  
  toggleButtonSelected: {
    backgroundColor: '#14489b',
  },
  
  toggleButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  
  toggleButtonTextSelected: {
    color: '#FFF',
  },
  
  modalButton: {
    marginTop: 20,
    width: '100%',
  },

  subTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  noWithdrawals: { textAlign: 'center', marginTop: 10 },
  withdrawalItem: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ddd', 
    flexDirection: 'row', 
    justifyContent: 'space-between', // Aligns delete button to the right
    alignItems: 'center' 
  },
  deleteIcon: {
    padding: 5,
  },
  deleteText: { 
    fontSize: 16, 
    color: '#888' // Soft gray instead of bright red
  },
});

export default WalletScreen;
