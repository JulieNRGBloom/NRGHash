// backend/config/db.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pkg from 'pg';

// ← this loads .env + .env.{development|production} for you:
import 'dotenv-flow/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const { Pool } = pkg;

// Detect dev vs prod:
const isDev = process.env.NODE_ENV === 'development';

const commonConfig = {
  user:     process.env.PG_USER,
  host:     process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port:     Number(process.env.PG_PORT),
};

const pool = new Pool(
  isDev
    ? commonConfig
    : {
        ...commonConfig,
        ssl: {
          ca: fs.readFileSync(join(__dirname, '..', 'certs', 'rds-ca-2019-root.pem')),
          rejectUnauthorized: false,
        },
      }
);

// Optional: log which database you’re connecting to:
pool.on('connect', () => {
  console.log(`🗄  Connected to ${isDev ? 'LOCAL Postgres' : 'RDS Postgres'} at ${process.env.PG_HOST}`);
});

export default pool;
