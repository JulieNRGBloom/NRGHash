// app.config.js (plain JS)
import 'dotenv/config';

// pick the right .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'development'
  ? '.env.develop'
  : '.env';

require('dotenv').config({ path: envFile });

export default ({ config }) => ({
  ...config,
  extra: {
    apiUrl: process.env.API_URL,
  },
});
