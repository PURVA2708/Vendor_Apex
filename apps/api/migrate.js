require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Running migration: adding profiles table...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id          UUID        PRIMARY KEY,            -- Supabase Auth user UUID
        email       VARCHAR(255) UNIQUE NOT NULL,
        name        VARCHAR(255) NOT NULL,
        role        VARCHAR(50)  NOT NULL CHECK (role IN ('officer','manager','vendor','admin')),
        label       VARCHAR(100) NOT NULL,
        gst         VARCHAR(50),
        vendor_id   INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- Index for quick lookup by email
      CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
    `);
    console.log('Migration complete — profiles table ready.');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    pool.end();
  }
}

migrate();
