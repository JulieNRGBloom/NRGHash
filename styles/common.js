import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#4a90e2',
  secondary: '#f5a623',
  background: '#f0f0f0',
  text: '#333333',
  lightText: '#666666',
  white: '#ffffff',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderColor: colors.lightText,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

