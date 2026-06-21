require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }

// Inline the mock data from data.js
const S = {
  accounts: [
    { email: 'officer@vb.com', pass: 'officer123', name: 'Raj Mehta', role: 'officer', label: 'Procurement Officer' },
    { email: 'manager@vb.com', pass: 'manager123', name: 'Meera Iyer', role: 'manager', label: 'Manager / Approver' },
    { email: 'v1@vendor.com',  pass: 'vendor123',  name: 'Apex Furniture', role: 'vendor', label: 'Vendor', vendorId: 1 },
    { email: 'admin@vb.com',   pass: 'admin123',   name: 'Arjun Rao', role: 'admin', label: 'Administrator' },
  ],
  vendors: [
    { id: 1, name: 'Apex Furniture Pvt Ltd', cat: 'Furniture', gst: '24AAPCA1234F1Z5', email: 'sales@apexfurniture.in', phone: '+91 98250 11223', status: 'active', rating: 4.5 },
    { id: 2, name: 'Crestwood Supplies', cat: 'Furniture', gst: '24BBQCW5678G1Z2', email: 'hello@crestwood.in', phone: '+91 99090 44556', status: 'active', rating: 4.2 },
    { id: 3, name: 'Bharat Office Co', cat: 'Furniture', gst: '27CCRBO9012H1Z9', email: 'orders@bharatoffice.com', phone: '+91 98700 77889', status: 'active', rating: 3.8 },
    { id: 4, name: 'Zenith Electronics', cat: 'Electronics', gst: '29DDSZE3456J1Z4', email: 'biz@zenithelec.in', phone: '+91 96320 12340', status: 'active', rating: 4.7 },
    { id: 5, name: 'Omni Traders', cat: 'Stationery', gst: '24EEOMT7890K1Z1', email: 'omni@traders.in', phone: '+91 97250 90901', status: 'inactive', rating: 4.0 },
  ],
  rfqs: [
    {
      id: 1024, title: '50 Office Chairs — Ergonomic', desc: 'High-back mesh chairs with lumbar support for the new Ahmedabad office floor.', deadline: addDays(6), status: 'QUOTED', createdBy: 'Raj Mehta', created: addDays(-3),
      items: [{ name: 'Ergonomic Mesh Chair', qty: 50, unit: 'pcs' }], vendors: [1, 2, 3], attach: 'chair-specs.pdf', selectedQuote: null
    },
    {
      id: 1025, title: '20 Developer Laptops', desc: '16GB RAM / 512GB SSD laptops for engineering team.', deadline: addDays(-2), status: 'INVOICED', createdBy: 'Raj Mehta', created: addDays(-12),
      items: [{ name: 'Laptop 16GB/512GB', qty: 20, unit: 'pcs' }], vendors: [4], attach: null, selectedQuote: 104
    },
    {
      id: 1026, title: 'A4 Printer Paper — 500 reams', desc: '75 GSM A4 paper, quarterly stock.', deadline: addDays(4), status: 'SENT', createdBy: 'Raj Mehta', created: addDays(-1),
      items: [{ name: 'A4 Paper 75GSM Ream', qty: 500, unit: 'reams' }], vendors: [1, 5], attach: null, selectedQuote: null
    },
  ],
  quotes: [
    { id: 101, rfq: 1024, vendor: 1, items: [{ name: 'Ergonomic Mesh Chair', price: 2000, qty: 50 }], days: 12, notes: 'Free installation & 2-yr warranty.', status: 'SUBMITTED', at: addDays(-2) },
    { id: 102, rfq: 1024, vendor: 2, items: [{ name: 'Ergonomic Mesh Chair', price: 1800, qty: 50 }], days: 15, notes: 'Bulk price. Freight included.', status: 'SUBMITTED', at: addDays(-1) },
    { id: 103, rfq: 1024, vendor: 3, items: [{ name: 'Ergonomic Mesh Chair', price: 2200, qty: 50 }], days: 8, notes: 'Fastest delivery, premium build.', status: 'SUBMITTED', at: addDays(-1) },
    { id: 104, rfq: 1025, vendor: 4, items: [{ name: 'Laptop 16GB/512GB', price: 62000, qty: 20 }], days: 10, notes: 'Onsite warranty.', status: 'APPROVED', at: addDays(-10) },
  ],
  approvals: [{ id: 1, quote: 104, rfq: 1025, by: 'Meera Iyer', action: 'APPROVED', remark: 'Within IT budget. Proceed.', at: addDays(-9) }],
  pos: [{ id: 1, num: 'PO-2026-0001', rfq: 1025, quote: 104, vendor: 4, total: 1240000, status: 'INVOICED', at: addDays(-9) }],
  invoices: [{ id: 1, num: 'INV-2026-0001', po: 1, subtotal: 1240000, tax: 223200, total: 1463200, emailed: true, status: 'PAID', at: addDays(-8) }],
  logs: [
    { who: 'Raj Mehta', what: 'created RFQ #RFQ-1026 “A4 Printer Paper — 500 reams”', min: 1440, c: '#121212' },
    { who: 'Bharat Office Co', what: 'submitted quotation for RFQ-1024 (₹1,10,000)', min: 1500, c: '#B45309' },
    { who: 'Crestwood Supplies', what: 'submitted quotation for RFQ-1024 (₹90,000)', min: 1560, c: '#B45309' },
    { who: 'Apex Furniture', what: 'submitted quotation for RFQ-1024 (₹1,00,000)', min: 2880, c: '#B45309' },
    { who: 'System', what: 'emailed INV-2026-0001 to biz@zenithelec.in', min: 11520, c: '#E11900' },
    { who: 'System', what: 'generated invoice INV-2026-0001 (₹14,63,200)', min: 11530, c: '#E11900' },
    { who: 'System', what: 'auto-created PO-2026-0001 for Zenith Electronics', min: 12950, c: '#0B8A4B' },
    { who: 'Meera Iyer', what: 'APPROVED quotation for RFQ-1025 — “Within IT budget. Proceed.”', min: 12960, c: '#0B8A4B' },
    { who: 'Raj Mehta', what: 'created RFQ #RFQ-1025 “20 Developer Laptops”', min: 17280, c: '#121212' },
  ],
  notifs: [
    { t: '3 quotations received for RFQ-1024 — ready to compare', min: 1500 },
    { t: 'RFQ-1026 sent to 2 vendors', min: 1440 },
    { t: 'Invoice INV-2026-0001 emailed successfully', min: 11520 },
  ]
};

async function seed() {
  console.log('Connecting to database and executing seed...');

  try {
    await pool.query(`
      DROP TABLE IF EXISTS notifs CASCADE;
      DROP TABLE IF EXISTS logs CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS pos CASCADE;
      DROP TABLE IF EXISTS approvals CASCADE;
      DROP TABLE IF EXISTS quote_items CASCADE;
      DROP TABLE IF EXISTS quotes CASCADE;
      DROP TABLE IF EXISTS rfq_vendors CASCADE;
      DROP TABLE IF EXISTS rfq_items CASCADE;
      DROP TABLE IF EXISTS rfqs CASCADE;
      DROP TABLE IF EXISTS accounts CASCADE;
      DROP TABLE IF EXISTS vendors CASCADE;

      CREATE TABLE vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        cat VARCHAR(100),
        gst VARCHAR(50),
        email VARCHAR(255),
        phone VARCHAR(50),
        status VARCHAR(50),
        rating NUMERIC(3,1)
      );

      CREATE TABLE accounts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        pass VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50),
        label VARCHAR(100),
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL
      );

      CREATE TABLE rfqs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        "desc" TEXT,
        deadline TIMESTAMP,
        status VARCHAR(50),
        created_by VARCHAR(100),
        created TIMESTAMP,
        attach VARCHAR(255),
        selected_quote INTEGER
      );

      CREATE TABLE rfq_items (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
        name VARCHAR(255),
        qty INTEGER,
        unit VARCHAR(50)
      );

      CREATE TABLE rfq_vendors (
        rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        PRIMARY KEY (rfq_id, vendor_id)
      );

      CREATE TABLE quotes (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        days INTEGER,
        notes TEXT,
        status VARCHAR(50),
        created_at TIMESTAMP
      );

      CREATE TABLE quote_items (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
        name VARCHAR(255),
        price NUMERIC(10,2),
        qty INTEGER
      );

      CREATE TABLE approvals (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
        rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
        by_user VARCHAR(100),
        action VARCHAR(50),
        remark TEXT,
        created_at TIMESTAMP
      );

      CREATE TABLE pos (
        id SERIAL PRIMARY KEY,
        num VARCHAR(100),
        rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
        quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        total NUMERIC(12,2),
        status VARCHAR(50),
        created_at TIMESTAMP
      );

      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        num VARCHAR(100),
        po_id INTEGER REFERENCES pos(id) ON DELETE CASCADE,
        subtotal NUMERIC(12,2),
        tax NUMERIC(12,2),
        total NUMERIC(12,2),
        emailed BOOLEAN,
        status VARCHAR(50),
        created_at TIMESTAMP
      );

      CREATE TABLE logs (
        id SERIAL PRIMARY KEY,
        who VARCHAR(100),
        what TEXT,
        min INTEGER,
        c VARCHAR(20)
      );

      CREATE TABLE notifs (
        id SERIAL PRIMARY KEY,
        t TEXT,
        min INTEGER
      );
    `);

    console.log('Tables created successfully.');

    // Seed Vendors
    for (const v of S.vendors) {
      await pool.query(
        'INSERT INTO vendors (id, name, cat, gst, email, phone, status, rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [v.id, v.name, v.cat, v.gst, v.email, v.phone, v.status, v.rating]
      );
    }

    // Seed Accounts (with bcrypt-hashed passwords)
    for (const a of S.accounts) {
      const hash = await bcrypt.hash(a.pass, 10);
      await pool.query(
        'INSERT INTO accounts (email, pass, name, role, label, vendor_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [a.email, hash, a.name, a.role, a.label, a.vendorId || null]
      );
    }

    // Seed RFQs
    for (const r of S.rfqs) {
      await pool.query(
        'INSERT INTO rfqs (id, title, "desc", deadline, status, created_by, created, attach, selected_quote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [r.id, r.title, r.desc, r.deadline, r.status, r.createdBy, r.created, r.attach, r.selectedQuote]
      );

      for (const i of r.items) {
        await pool.query(
          'INSERT INTO rfq_items (rfq_id, name, qty, unit) VALUES ($1, $2, $3, $4)',
          [r.id, i.name, i.qty, i.unit]
        );
      }

      for (const vId of r.vendors) {
        await pool.query(
          'INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)',
          [r.id, vId]
        );
      }
    }

    // Seed Quotes
    for (const q of S.quotes) {
      await pool.query(
        'INSERT INTO quotes (id, rfq_id, vendor_id, days, notes, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [q.id, q.rfq, q.vendor, q.days, q.notes, q.status, q.at]
      );

      for (const i of q.items) {
        await pool.query(
          'INSERT INTO quote_items (quote_id, name, price, qty) VALUES ($1, $2, $3, $4)',
          [q.id, i.name, i.price, i.qty]
        );
      }
    }

    // Seed Approvals
    for (const a of S.approvals) {
      await pool.query(
        'INSERT INTO approvals (id, quote_id, rfq_id, by_user, action, remark, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [a.id, a.quote, a.rfq, a.by, a.action, a.remark, a.at]
      );
    }

    // Seed POs
    for (const p of S.pos) {
      await pool.query(
        'INSERT INTO pos (id, num, rfq_id, quote_id, vendor_id, total, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [p.id, p.num, p.rfq, p.quote, p.vendor, p.total, p.status, p.at]
      );
    }

    // Seed Invoices
    for (const i of S.invoices) {
      await pool.query(
        'INSERT INTO invoices (id, num, po_id, subtotal, tax, total, emailed, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [i.id, i.num, i.po, i.subtotal, i.tax, i.total, i.emailed, i.status, i.at]
      );
    }

    // Seed Logs
    for (const l of S.logs) {
      await pool.query(
        'INSERT INTO logs (who, what, min, c) VALUES ($1, $2, $3, $4)',
        [l.who, l.what, l.min, l.c]
      );
    }

    // Seed Notifs
    for (const n of S.notifs) {
      await pool.query(
        'INSERT INTO notifs (t, min) VALUES ($1, $2)',
        [n.t, n.min]
      );
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    pool.end();
  }
}

seed();
