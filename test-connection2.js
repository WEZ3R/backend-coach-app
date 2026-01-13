import { config } from 'dotenv';
import pg from 'pg';

const { Client } = pg;

config();

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'coaching_app'
});

async function test() {
  try {
    await client.connect();
    const res = await client.query('SELECT version()');
    console.log('✅ PostgreSQL connection successful!');
    console.log('Version:', res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

test();
