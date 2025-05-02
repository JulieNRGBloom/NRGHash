// components/CustomButton.js

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';

export default function MyCustomButton({ title, onPress, disabled = false, style = {}, loading = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        disabled && styles.buttonDisabled, // Apply disabled style
      ]}
      onPress={onPress}
      disabled={disabled} // Disable press action
      activeOpacity={disabled ? 1 : 0.7} // Prevent opacity change when disabled
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            disabled && styles.buttonTextDisabled, // Apply disabled text style
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

MyCustomButton.propTypes = {
  title: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  style: PropTypes.object,
  loading: PropTypes.bool,
};

// Removed MyCustomButton.defaultProps as default parameters are used

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#14489b', // Indigo
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%', // Ensure button fills its container
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A0AEC0', // Gray color for disabled state
  },
  buttonTextDisabled: {
    color: '#E2E8F0', // Light gray text for disabled state
  },
});
