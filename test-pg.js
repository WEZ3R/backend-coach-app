import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'coaching_app',
  user: 'postgres',
  password: 'postgres',
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connected with pg client!');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Result:', res.rows);
    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
