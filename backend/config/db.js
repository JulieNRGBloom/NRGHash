// config/db.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

import fs from 'fs';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const caPath = join(__dirname, '..', 'certs', 'rds-ca-2019-root.pem');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pkg;

const pool = new Pool({
  user:     process.env.PG_USER,
  host:     process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port:     Number(process.env.PG_PORT),
  ssl: {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: false,
  },
});

export default pool;
