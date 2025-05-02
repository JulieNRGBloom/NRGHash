import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    apiUrl: process.env.API_URL,  // This gets the API URL from your .env file
  },
});
