module.exports = (app, pool, requireAuth) => {
  // Generate invoice from a PO
  app.post('/api/pos/:id/invoice', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const poId = req.params.id;

      const poRes = await client.query('SELECT * FROM pos WHERE id = $1', [poId]);
      if (!poRes.rows.length) throw new Error('PO not found');
      const po = poRes.rows[0];

      const existRes = await client.query('SELECT id FROM invoices WHERE po_id = $1', [poId]);
      if (existRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'ALREADY_INVOICED', message: 'Invoice already exists for this PO' });
      }

      const subtotal = Number(po.total);
      const tax = Math.round(subtotal * 0.18 * 100) / 100;
      const total = subtotal + tax;
      const invNum = 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));

      const invRes = await client.query(
        'INSERT INTO invoices (num, po_id, subtotal, tax, total, emailed, status, created_at) VALUES ($1, $2, $3, $4, $5, false, \'PENDING\', NOW()) RETURNING *',
        [invNum, poId, subtotal, tax, total]
      );

      await client.query('UPDATE pos SET status = \'INVOICED\' WHERE id = $1', [poId]);
      await client.query('UPDATE rfqs SET status = \'INVOICED\' WHERE id = $1', [po.rfq_id]);

      await client.query(
        'INSERT INTO logs (who, what, min, c) VALUES (\'System\', $1, 0, \'#E11900\')',
        ['generated invoice ' + invNum + ' (\u20b9' + total.toLocaleString('en-IN') + ')']
      );
      await client.query(
        'INSERT INTO notifs (t, min) VALUES ($1, 0)',
        ['Invoice ' + invNum + ' generated successfully']
      );

      await client.query('COMMIT');
      res.status(201).json(invRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      if (err.message === 'PO not found') return res.status(404).json({ error: err.message });
      res.status(500).json({ error: 'Failed to generate invoice' });
    } finally {
      client.release();
    }
  });

  // Mark invoice as emailed
  app.post('/api/invoices/:id/email', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const invId = req.params.id;

      const invRes = await client.query(
        'UPDATE invoices SET emailed = true, status = \'PAID\' WHERE id = $1 RETURNING *',
        [invId]
      );
      if (!invRes.rows.length) throw new Error('Invoice not found');
      const inv = invRes.rows[0];

      const poRes = await client.query(
        'SELECT v.email, v.name FROM pos p JOIN vendors v ON v.id = p.vendor_id WHERE p.id = $1',
        [inv.po_id]
      );
      const vendorEmail = poRes.rows[0] ? poRes.rows[0].email : '-';

      await client.query(
        'INSERT INTO logs (who, what, min, c) VALUES (\'System\', $1, 0, \'#E11900\')',
        ['emailed ' + inv.num + ' to ' + vendorEmail]
      );
      await client.query(
        'INSERT INTO notifs (t, min) VALUES ($1, 0)',
        ['Invoice ' + inv.num + ' emailed successfully']
      );

      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Failed to mark invoice as emailed' });
    } finally {
      client.release();
    }
  });
};
