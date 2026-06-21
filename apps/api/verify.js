require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('TABLES IN DATABASE:');
  tables.rows.forEach(r => console.log('  -', r.tablename));

  const v = await pool.query('SELECT COUNT(*) as count FROM vendors');
  const a = await pool.query('SELECT COUNT(*) as count FROM accounts');
  const r = await pool.query('SELECT COUNT(*) as count FROM rfqs');
  const q = await pool.query('SELECT COUNT(*) as count FROM quotes');
  const p = await pool.query('SELECT COUNT(*) as count FROM pos');
  const i = await pool.query('SELECT COUNT(*) as count FROM invoices');
  const l = await pool.query('SELECT COUNT(*) as count FROM logs');

  console.log('\nROW COUNTS:');
  console.log('  vendors:   ', v.rows[0].count);
  console.log('  accounts:  ', a.rows[0].count);
  console.log('  rfqs:      ', r.rows[0].count);
  console.log('  quotes:    ', q.rows[0].count);
  console.log('  pos:       ', p.rows[0].count);
  console.log('  invoices:  ', i.rows[0].count);
  console.log('  logs:      ', l.rows[0].count);

  pool.end();
  console.log('\nAll checks passed!');
}

check().catch(console.error);
