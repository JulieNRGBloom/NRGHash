// AdminDashboardScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useWindowDimensions } from 'react-native';
import axios from 'axios';
import storage from '../storage';
import axiosInstance from '../utils/axiosInstance';


function AdminDashboard() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [processedWithdrawals, setProcessedWithdrawals] = useState([]);
  const [rejectedWithdrawals, setRejectedWithdrawals] = useState([]);

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationImportance, setNotificationImportance] = useState('normal'); // Default value
  const [userId, setUserId] = useState(''); // Empty means global notification
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isInterruptionActive, setIsInterruptionActive] = useState(false);
  const [interruptionStartDateTime, setInterruptionStartDateTime] = useState(new Date());
  const [interruptionEndDateTime, setInterruptionEndDateTime] = useState(new Date());

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUserCreationLoading, setIsUserCreationLoading] = useState(false);
  const [userCreationError, setUserCreationError] = useState('');
  const [userCreationSuccess, setUserCreationSuccess] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState(''); // NEW password field in edit form


  // 1) Fetch withdrawals on mount
  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
    
        // GET /wallets/withdrawals => returns { success, pending, processed, rejected }
        const response = await axiosInstance.get('/wallets/withdrawals');


        if (response.data.success) {
          setPendingWithdrawals(response.data.pending);
          setProcessedWithdrawals(response.data.processed);
          setRejectedWithdrawals(response.data.rejected);
        } else {
          console.error('Failed to fetch withdrawals:', response.data.message);
        }
      } catch (error) {
        console.error('Error fetching withdrawals:', error);
      }
    };

    fetchWithdrawals();
  }, []);

  // 2) Handle "Process" => from Pending => Processed
  const handleProcess = async (id) => {
    try {

      await axiosInstance.patch(`/wallets/withdrawals/${id}/process`);


      // Move item from "pending" to "processed"
      const updatedPending = pendingWithdrawals.filter((item) => item.id !== id);
      const processedItem = pendingWithdrawals.find((item) => item.id === id);

      setPendingWithdrawals(updatedPending);
      setProcessedWithdrawals([...processedWithdrawals, { ...processedItem, is_processed: true }]);
    } catch (error) {
      console.error('Error processing withdrawal:', error);
    }
  };

  // 3) Handle "Reject" => from Pending => Rejected
  const handleReject = async (id) => {
    try {
      await axiosInstance.patch(`/wallets/withdrawals/${id}/reject`);

      // Move item from "pending" to "rejected"
      const updatedPending = pendingWithdrawals.filter((item) => item.id !== id);
      const rejectedItem = pendingWithdrawals.find((item) => item.id === id);

      setPendingWithdrawals(updatedPending);
      setRejectedWithdrawals([...rejectedWithdrawals, { ...rejectedItem, is_rejected: true }]);
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    }
  };

  // 4) Handle "Review" => from Processed/Rejected => Pending
  const handleReset = async (id) => {
    try {
      const response = await axiosInstance.patch(`/wallets/withdrawals/${id}/reset`);
  
      if (response.data.success) {
        const updatedWithdrawal = response.data.withdrawal;
        
        if (!updatedWithdrawal) {
          console.error("Error: Reset withdrawal response is missing data.");
          return;
        }
  
        setProcessedWithdrawals(processedWithdrawals.filter(w => w.id !== id));
        setRejectedWithdrawals(rejectedWithdrawals.filter(w => w.id !== id));
  
        // ✅ Ensure we are adding a complete object to pendingWithdrawals
        setPendingWithdrawals(prev => [...prev, updatedWithdrawal]);
      }
    } catch (error) {
      console.error('Error resetting withdrawal:', error);
    }
  };

  const handleSendNotification = async () => {
    try {
      setIsSubmitting(true);
  
      const response = await axiosInstance.post('/notifications/create', {
        title: notificationTitle,
        message: notificationMessage,
        importance: notificationImportance,
        user_id: userId.trim() !== '' ? userId : null,
      });
      
  
      if (response.data.success) {
        alert('Notification sent successfully!');
        setNotificationTitle('');
        setNotificationMessage('');
        setNotificationImportance('normal');
        setUserId('');
      } else {
        alert('Failed to send notification.');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleStartInterruption = async () => {
    try {
      const response = await axiosInstance.post('/interruptions/start');

  
      if (response.data.success) {
        alert('Interruption started!');
        setIsInterruptionActive(true);
      } else {
        alert('Failed to start interruption');
      }
    } catch (error) {
      console.error('Error starting interruption:', error);
      alert('Error starting interruption');
    }
  };
  
  
  const handleEndInterruption = async () => {
    try {
      const response = await axiosInstance.patch('/interruptions/end');
  
      if (response.data.success) {
        alert('Interruption ended!');
        setIsInterruptionActive(false);
      } else {
        alert('Failed to end interruption');
      }
    } catch (error) {
      console.error('Error ending interruption:', error);
      alert('Error ending interruption');
    }
  };
  

  useEffect(() => {
    const fetchActiveInterruption = async () => {
      try {
        const API_BASE_URL = 'https://api.nrghash.nrgbloom.com/api';
        const token = await storage.getItem('authToken');
  
        const response = await axios.get(`${API_BASE_URL}/interruptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        if (response.data.success) {
          const activeInterruption = response.data.interruptions.find((int) => int.end_time === null);
          if (activeInterruption) {
            setIsInterruptionActive(true);
            setInterruptionStartDateTime(new Date(activeInterruption.start_time));
          } else {
            setIsInterruptionActive(false);
          }
        }
      } catch (error) {
        console.error('Error fetching active interruption:', error);
      }
    };
  
    fetchActiveInterruption();
  }, []);
  

  const handleCreateUser = async () => {
    try {
      setIsUserCreationLoading(true);
      setUserCreationError('');
      setUserCreationSuccess('');

      // Basic validation
      if (!newUsername || !newPassword) {
        setUserCreationError('Username and password are required.');
        setIsUserCreationLoading(false);
        return;
      }

      // Pass `email` as well, even if it's empty or a phone
      const response = await axiosInstance.post('/users', {
        username: newUsername,
        password_hash: newPassword,
        email: newEmail,         // <--- NEW
      });

      if (response.data.success) {
        setUserCreationSuccess('User created successfully!');
        // Clear fields
        setNewUsername('');
        setNewPassword('');
        setNewEmail('');       // clear email field
      } else {
        setUserCreationError(response.data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setUserCreationError(error.response?.data?.message || 'An error occurred while creating the user.');
    } finally {
      setIsUserCreationLoading(false);
    }
  };

  // 1) Fetch all users when admin dashboard loads
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // GET /users (admin only)
        const response = await axiosInstance.get('/users');
        if (response.data.success) {
          setAllUsers(response.data.users);
        }
      } catch (error) {
        console.error('Error fetching all users:', error);
      }
    };
    fetchUsers();
  }, []);

  // 2) When user selects a user to edit
  const handleSelectUser = (user) => {
    setSelectedUserId(user.user_id);
    setEditUsername(user.username);
    setEditEmail(user.email || '');
    setEditPassword(''); // Clear any previous password
  };

  // 3) Save updates
  const handleSaveUser = async () => {
    if (!selectedUserId) return;
    try {
      const response = await axiosInstance.patch(`/users/${selectedUserId}`, {
        username: editUsername,
        email: editEmail,
        password_hash: editPassword || undefined // Only send if user typed something
      });
      if (response.data.success) {
        alert('User updated successfully');
        // Optionally update the local allUsers state
        setAllUsers(prev => prev.map(u => 
          u.user_id === selectedUserId ? response.data.user : u
        ));
      } else {
        alert('Failed to update user: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    }
  };

  // 4) Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      const response = await axiosInstance.delete(`/users/${userId}`);
      if (response.data.success) {
        alert('User deleted');
        // remove from local state
        setAllUsers(prev => prev.filter(u => u.user_id !== userId));
        // if that was the selected user, clear selection
        if (selectedUserId === userId) {
          setSelectedUserId(null);
          setEditUsername('');
          setEditEmail('');
        }
      } else {
        alert('Failed to delete user: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  return (
    <ScrollView style={[styles.container, isMobile && styles.containerMobile]}>
      <Text style={[styles.title, isMobile && styles.titleMobile]}>Admin Dashboard</Text>

      <View style={styles.notificationContainer}>
        <Text style={styles.sectionTitle}>Send Notification</Text>

        <Text style={styles.label}>Notification Title</Text>
        <TextInput
          style={styles.input}
          value={notificationTitle}
          onChangeText={setNotificationTitle}
        />

        <Text style={styles.label}>Notification Message</Text>
        <TextInput
          style={styles.input}
          value={notificationMessage}
          onChangeText={setNotificationMessage}
          multiline
        />

        {/* Importance Selection */}
        <View style={styles.radioGroup}>
          <TouchableOpacity onPress={() => setNotificationImportance('normal')} style={styles.radioOption}>
            <Text style={[styles.radioText, notificationImportance === 'normal' && styles.radioSelectedNormal]}>Normal</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setNotificationImportance('important')} style={styles.radioOption}>
            <Text style={[styles.radioText, notificationImportance === 'important' && styles.radioSelectedImportant]}>Important</Text>
          </TouchableOpacity>
        </View>

        {/* User ID Input */}
        <Text style={styles.label}>User ID (Leave empty for all users)</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
        />


        <TouchableOpacity
          style={[styles.button, styles.sendButton, isSubmitting && styles.disabledButton, isMobile && styles.sendButtonMobile]}
          onPress={handleSendNotification}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Sending...' : 'Send Notification'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.interruptionContainer}>
        <Text style={styles.sectionTitle}>Hashrate Interruption</Text>

        <Text style={styles.interruptionStatus}>
          Status: {isInterruptionActive ? 'Active' : 'None'}
        </Text>

        {!isInterruptionActive ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.startButton, isMobile && styles.sendButtonMobile]}
              onPress={handleStartInterruption}
            >
              <Text style={styles.buttonText}>Start Interruption</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>            
            <TouchableOpacity
              style={[styles.button, styles.endButton]}
              onPress={handleEndInterruption}
            >
              <Text style={styles.buttonText}>End Interruption</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ====== NEW: CREATE USER FORM ====== */}
      <View style={styles.createUserContainer}>
        <Text style={styles.sectionTitle}>Create a New User</Text>

        {/* Show success or error messages inline */}
        {userCreationSuccess !== '' && (
          <Text style={styles.successText}>{userCreationSuccess}</Text>
        )}
        {userCreationError !== '' && (
          <Text style={styles.errorText}>{userCreationError}</Text>
        )}

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={newUsername}
          onChangeText={setNewUsername}
        />

        <Text style={styles.label}>Email or Phone (optional)</Text>
        <TextInput
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
        />


        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />


        <TouchableOpacity
          style={[styles.button, styles.sendButton, isUserCreationLoading && styles.disabledButton, isMobile && styles.sendButtonMobile]}
          onPress={handleCreateUser}
          disabled={isUserCreationLoading}
        >
          <Text style={styles.buttonText}>
            {isUserCreationLoading ? 'Creating...' : 'Create User'}
          </Text>
        </TouchableOpacity>
      </View>
      {/* ====== END CREATE USER FORM ====== */}

      
      <View style={styles.interruptionContainer}>
        {/* Pending Withdrawals */}
        <WithdrawalTable
          title="Pending Withdrawals"
          data={pendingWithdrawals}
          isMobile={isMobile}
          handleProcess={handleProcess}
          handleReject={handleReject}
        />

        {/* Processed Withdrawals */}
        <WithdrawalTable
          title="Processed Withdrawals"
          data={processedWithdrawals}
          isMobile={isMobile}
          handleReset={handleReset}   // "Review" button only
        />

        {/* Rejected Withdrawals */}
        <WithdrawalTable
          title="Rejected Withdrawals"
          data={rejectedWithdrawals}
          isMobile={isMobile}
          handleReset={handleReset}   // "Review" button only
        />
      </View>


      <View style={styles.interruptionContainer}>
        <Text style={styles.sectionTitle}>Manage Users</Text>

        {/* === List all users === */}
        {allUsers.map((u) => (
          <View key={u.user_id} style={styles.userRow}>
            <View style={styles.userEditButtons}>

              <Text>User #{u.user_id}: {u.username} ({u.email || 'No email'}) [role: {u.role}]</Text>

              <TouchableOpacity
                style={[styles.button]}
                onPress={() => handleSelectUser(u)}
              >
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button]}
                onPress={() => handleDeleteUser(u.user_id)}
              >
                <Text style={styles.deleteButton}>Delete</Text>
              </TouchableOpacity>
            </View>
            
          </View>
        ))}

        {/* === Edit form for selected user === */}
        {selectedUserId && (
          <View style={[styles.editUserContainer, isMobile && styles.editUserContainerMobile]}>
            <Text style={styles.label}>Editing user #{selectedUserId}</Text>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={editUsername}
              onChangeText={setEditUsername}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
            />

            <Text style={styles.label}>Password (Leave blank to keep current)</Text>
            <TextInput
              style={styles.input}
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveUser}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * Reusable Table Component
 * - Renders "Process"/"Reject" if this is the Pending table
 * - Renders "Review" if this is the Processed or Rejected table
 */
const WithdrawalTable = ({
  title,
  data,
  isMobile,
  handleProcess,
  handleReject,
  handleReset,
}) => {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>

      {/* Mobile Layout */}
      {isMobile ? (
        <ScrollView style={styles.mobileTableContainer}>
          {data.length > 0 ? (
            data.map((withdrawal) => (
              <View key={withdrawal.id} style={styles.mobileTableRow}>
                <Text style={styles.mobileTableCell}>
                  <Text style={styles.boldText}>User ID:</Text> {withdrawal.user_id}
                </Text>
                <Text style={styles.mobileTableCell}>
                  <Text style={styles.boldText}>Bank Name:</Text> {withdrawal.bank_name}
                </Text>
                <Text style={styles.mobileTableCell}>
                  <Text style={styles.boldText}>Account No.:</Text> {withdrawal.bank_account_number}
                </Text>
                <Text style={styles.mobileTableCell}>
                  <Text style={styles.boldText}>Holder:</Text> {withdrawal.account_holder_name}
                </Text>
                <Text style={styles.mobileTableCell}>
                  <Text style={styles.boldText}>BTC Amount:</Text> {withdrawal.amount_btc}
                </Text>
                <Text style={styles.mobileTableCell}>
                  <Text style={styles.boldText}>NGN Amount:</Text> {withdrawal.amount_ngn}
                </Text>

                {/* ACTIONS */}
                <View style={styles.actionButtons}>
                  {/* If pending => show "Process" & "Reject" */}
                  {title === 'Pending Withdrawals' && (
                    <>
                      <TouchableOpacity
                        style={[styles.button, styles.rejectButton]}
                        onPress={() => handleReject(withdrawal.id)}
                      >
                        <Text style={styles.buttonText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.button, styles.processButton]}
                        onPress={() => handleProcess(withdrawal.id)}
                      >
                        <Text style={styles.buttonText}>Process</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* If processed or rejected => show "Review" */}
                  {(title === 'Processed Withdrawals' || title === 'Rejected Withdrawals') && (
                    <TouchableOpacity
                      style={[styles.button, styles.reviewButton]}
                      onPress={() => handleReset(withdrawal.id)}
                    >
                      <Text style={styles.buttonText}>Review</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No records found</Text>
          )}
        </ScrollView>
      ) : (
        // Desktop Layout
        <View style={styles.desktopTableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>User ID</Text>
            <Text style={styles.tableHeaderText}>Bank Name</Text>
            <Text style={styles.tableHeaderText}>Account No.</Text>
            <Text style={styles.tableHeaderText}>Holder</Text>
            <Text style={styles.tableHeaderText}>BTC Amount</Text>
            <Text style={styles.tableHeaderText}>NGN Amount</Text>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>

          {data.length > 0 ? (
            data.map((withdrawal) => {
                if (!withdrawal || !withdrawal.user_id) {
                    console.error("Skipping invalid withdrawal entry:", withdrawal);
                    return null; // Skips this iteration if data is incomplete
                }

                return (
                    <View key={withdrawal.id} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{withdrawal.user_id}</Text>
                        <Text style={styles.tableCell}>{withdrawal.bank_name}</Text>
                        <Text style={styles.tableCell}>{withdrawal.bank_account_number}</Text>
                        <Text style={styles.tableCell}>{withdrawal.account_holder_name}</Text>
                        <Text style={styles.tableCell}>{withdrawal.amount_btc}</Text>
                        <Text style={styles.tableCell}>{withdrawal.amount_ngn}</Text>

                        <View style={styles.actionButtons}>
                            {handleProcess && handleReject && (
                                <>
                                <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => handleReject(withdrawal.id)}>
                                    <Text style={styles.buttonText}>Reject</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.button, styles.processButton]} onPress={() => handleProcess(withdrawal.id)}>
                                    <Text style={styles.buttonText}>Process</Text>
                                </TouchableOpacity>
                                </>
                            )}

                            {handleReset && (
                                <TouchableOpacity style={[styles.button, styles.reviewButton]} onPress={() => handleReset(withdrawal.id)}>
                                    <Text style={styles.buttonText}>Review</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            })
        ) : (
            <Text style={styles.noDataText}>No records found</Text>
        )}

        </View>
      )}
    </>
  );
};

//
// ------------------ STYLES ------------------
//
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6e7e8',
    padding: 40,
  },
  containerMobile: {
    padding: 15,
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
    fontSize: 22,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14489b',
    marginBottom: 15,
  },
  // --- MOBILE TABLE ---
  mobileTableContainer: {
    width: '100%', // Full width
  },
  mobileTableRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mobileTableCell: {
    fontSize: 14,
    color: '#333',
    paddingBottom: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  // --- DESKTOP TABLE ---
  desktopTableContainer: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#14489b',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    flex: 1,
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 5,
  },
  // --- ACTIONS ---
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 5,
    marginHorizontal: 5,
    elevation: 2,
  },
  rejectButton: {
    backgroundColor: '#d9534f',
  },
  processButton: {
    backgroundColor: '#5cb85c',
  },
  reviewButton: {
    backgroundColor: '#f0ad4e', // Orange for review
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  noDataText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 16,
    padding: 10,
    fontStyle: 'italic',
  },
  notificationContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  label: {
    alignSelf: 'flex-start',
    color: '#0F172A',         // Dark navy color
    marginLeft: 4,            // Slight left padding
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    fontSize: 16,
  },
  
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  radioOption: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  
  radioText: {
    fontSize: 16,
    color: '#555',
  },
  
  radioSelectedNormal: {
    color: '#14489b',
    fontWeight: 'bold',
  },

  radioSelectedImportant: {
    color: 'red',
    fontWeight: 'bold',
  },
  
  
  sendButton: {
    backgroundColor: '#14489b',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '30%',
    alignSelf: 'center',
  },

  sendButtonMobile: {
    width: '85%',
  },
  
  disabledButton: {
    backgroundColor: '#ccc',
  },
  
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  createUserContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  successText: {
    color: 'green',
    marginBottom: 10,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    fontWeight: '600',
  },
  label: {
    color: '#0F172A',
    marginLeft: 4,
    marginBottom: 6,
  },
  
  createUserButton: {
    backgroundColor: '#14489b',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  
  interruptionContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  
  interruptionStatus: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
    fontWeight: '700'
  },
  
  startButton: {
    backgroundColor: '#d9534f', // Red
    alignItems: 'center',
    width: '30%',
    alignSelf: 'center',
  },
  
  endButton: {
    backgroundColor: '#5cb85c', // Green
    alignItems: 'center',
    width: '30%',
    alignSelf: 'center',
  },
  
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    fontSize: 16,
  },
  deleteButton: {
    color: '#d9534f',
    fontWeight: "700",
    fontSize: 16
  },
  editButton: {
    color: '#5cb85c',
    fontWeight: "700",
    fontSize: 16
  },
  userEditButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  editUserContainer: {
    margin: 5,
    borderWidth: 1,
    borderRadius: 10,
    padding: 5,
    backgroundColor: '#f9fafb',
    borderColor: '#ccc',
  },
  editUserContainerMobile: {
    borderWidth: 0,
    backgroundColor: '#fff',
    padding: 6,
  },
  saveButton: {
    backgroundColor: '#14489b',
    width: 'fit-content'
  }
});

export default AdminDashboard;
