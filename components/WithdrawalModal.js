// components/WithdrawalModal.js
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const WithdrawalModal = ({
  visible,
  onClose,
  currentBankInfo,
  currentBTCPriceNGN,
  onSubmitWithdrawal,
}) => {
  // Pre-fill fields with currentBankInfo (if any)
  const [bankName, setBankName] = useState(currentBankInfo.bank_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentBankInfo.bank_account_number || '');
  const [accountHolderName, setAccountHolderName] = useState(currentBankInfo.account_holder_name || '');
  const [withdrawalBTC, setWithdrawalBTC] = useState('');
  const [withdrawalNGN, setWithdrawalNGN] = useState('');

  // Update NGN equivalent when withdrawal amount changes
  useEffect(() => {
    const amountBTC = parseFloat(withdrawalBTC);
    if (!isNaN(amountBTC) && currentBTCPriceNGN) {
      setWithdrawalNGN((amountBTC * currentBTCPriceNGN).toFixed(0));
    } else {
      setWithdrawalNGN('');
    }
  }, [withdrawalBTC, currentBTCPriceNGN]);

  const handleSubmit = () => {
    // Validate bank info; if missing, force user to fill them in.
    if (!bankName || !bankAccountNumber || !accountHolderName) {
      Alert.alert('Error', 'Please fill in all bank details. Incorrect data may lead to loss of funds.');
      return;
    }
    // Validate withdrawal amount
    const amountBTC = parseFloat(withdrawalBTC);
    if (isNaN(amountBTC) || amountBTC <= 0) {
      Alert.alert('Error', 'Please enter a valid withdrawal amount.');
      return;
    }
    // Confirm submission
    Alert.alert(
      'Confirm Withdrawal',
      'Please confirm that your bank details are correct. Incorrect information may lead to loss of funds.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => onSubmitWithdrawal({ bankName, bankAccountNumber, accountHolderName, withdrawalBTC, withdrawalNGN }) },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Withdrawal Request</Text>
          <Text>Bank Name:</Text>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="Enter bank name"
          />
          <Text>Bank Account Number:</Text>
          <TextInput
            style={styles.input}
            value={bankAccountNumber}
            onChangeText={setBankAccountNumber}
            placeholder="Enter account number"
          />
          <Text>Account Holder Name:</Text>
          <TextInput
            style={styles.input}
            value={accountHolderName}
            onChangeText={setAccountHolderName}
            placeholder="Enter account holder name"
          />
          <Text>Withdrawal Amount (BTC):</Text>
          <TextInput
            style={styles.input}
            value={withdrawalBTC}
            onChangeText={setWithdrawalBTC}
            placeholder="Enter amount in BTC"
            keyboardType="numeric"
          />
          {withdrawalNGN !== '' && (
            <Text>Equivalent in NGN: ₦ {withdrawalNGN}</Text>
          )}
          <View style={styles.buttonRow}>
            <Button title="Cancel" onPress={onClose} />
            <Button title="Submit" onPress={handleSubmit} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
});

export default WithdrawalModal;
