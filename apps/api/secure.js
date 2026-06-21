require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function secureDatabase() {
  console.log('Enabling Row Level Security (RLS) on all tables...');
  const tables = [
    'accounts', 'vendors', 'rfqs', 'rfq_items', 'rfq_vendors',
    'quotes', 'quote_items', 'approvals', 'pos', 'invoices',
    'logs', 'notifs'
  ];

  try {
    for (const table of tables) {
      await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      console.log(`✓ RLS enabled for ${table}`);
    }
    console.log('\nDatabase secured! The "UNRESTRICTED" warnings will now disappear.');
    console.log('Note: Our Node.js API connects as the "postgres" superuser, so it will continue to work perfectly while blocking public/anonymous access.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

secureDatabase();
