module.exports = (app, pool, requireAuth) => {
  // Vendor submits a quote
  app.post('/api/quotes', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rfq, days, notes, items } = req.body;
      const vendorId = req.user.vendor_id;

      if (!vendorId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'User is not a vendor' });
      }

      const exist = await client.query('SELECT id FROM quotes WHERE rfq_id = $1 AND vendor_id = $2', [rfq, vendorId]);

      let quoteId;
      if (exist.rows.length) {
        quoteId = exist.rows[0].id;
        await client.query('UPDATE quotes SET days = $1, notes = $2, created_at = NOW() WHERE id = $3', [days, notes, quoteId]);
        await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);
      } else {
        const qRes = await client.query(
          'INSERT INTO quotes (rfq_id, vendor_id, days, notes, status, created_at) VALUES ($1, $2, $3, $4, \'SUBMITTED\', NOW()) RETURNING id',
          [rfq, vendorId, days, notes]
        );
        quoteId = qRes.rows[0].id;
      }

      let totalVal = 0;
      for (const i of items) {
        totalVal += (i.price * i.qty);
        await client.query(
          'INSERT INTO quote_items (quote_id, name, price, qty) VALUES ($1, $2, $3, $4)',
          [quoteId, i.name, i.price, i.qty]
        );
      }

      await client.query('UPDATE rfqs SET status = \'QUOTED\' WHERE id = $1 AND status = \'SENT\'', [rfq]);

      await client.query(
        'INSERT INTO logs (who, what, min, c) VALUES ($1, $2, 0, \'#B45309\')',
        [req.user.name, 'submitted quotation for RFQ-' + rfq + ' (\u20b9' + totalVal.toLocaleString('en-IN') + ')']
      );

      await client.query('COMMIT');
      res.status(200).json({ id: quoteId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Failed to submit quote' });
    } finally {
      client.release();
    }
  });

  // Approve Quote
  app.post('/api/quotes/:id/approve', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quoteId = req.params.id;
      const { remark } = req.body;

      const qRes = await client.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
      if (!qRes.rows.length) throw new Error('Quote not found');
      const quote = qRes.rows[0];

      await client.query(
        'INSERT INTO approvals (quote_id, rfq_id, by_user, action, remark, created_at) VALUES ($1, $2, $3, \'APPROVED\', $4, NOW())',
        [quoteId, quote.rfq_id, req.user.name, remark]
      );

      await client.query('UPDATE quotes SET status = \'APPROVED\' WHERE id = $1', [quoteId]);
      await client.query('UPDATE rfqs SET selected_quote = $1, status = \'PO_GENERATED\' WHERE id = $2', [quoteId, quote.rfq_id]);
      await client.query('UPDATE quotes SET status = \'REJECTED\' WHERE rfq_id = $1 AND id != $2', [quote.rfq_id, quoteId]);

      const qiRes = await client.query('SELECT price, qty FROM quote_items WHERE quote_id = $1', [quoteId]);
      let total = 0;
      for (const qi of qiRes.rows) total += (qi.price * qi.qty);

      const poNum = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      await client.query(
        'INSERT INTO pos (num, rfq_id, quote_id, vendor_id, total, status, created_at) VALUES ($1, $2, $3, $4, $5, \'ISSUED\', NOW())',
        [poNum, quote.rfq_id, quoteId, quote.vendor_id, total]
      );

      const vRes = await client.query('SELECT name FROM vendors WHERE id = $1', [quote.vendor_id]);
      const vName = vRes.rows[0] ? vRes.rows[0].name : 'vendor';

      await client.query(
        'INSERT INTO logs (who, what, min, c) VALUES ($1, $2, 0, \'#0B8A4B\')',
        [req.user.name, 'APPROVED quotation for RFQ-' + quote.rfq_id + ' - "' + remark + '"']
      );
      await client.query(
        'INSERT INTO logs (who, what, min, c) VALUES (\'System\', $1, 0, \'#0B8A4B\')',
        ['auto-created ' + poNum + ' for ' + vName]
      );

      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Failed to approve' });
    } finally {
      client.release();
    }
  });

  // Reject Quote
  app.post('/api/quotes/:id/reject', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quoteId = req.params.id;
      const { remark } = req.body;

      const qRes = await client.query('SELECT rfq_id FROM quotes WHERE id = $1', [quoteId]);
      if (!qRes.rows.length) throw new Error('Quote not found');

      await client.query(
        'INSERT INTO approvals (quote_id, rfq_id, by_user, action, remark, created_at) VALUES ($1, $2, $3, \'REJECTED\', $4, NOW())',
        [quoteId, qRes.rows[0].rfq_id, req.user.name, remark]
      );

      await client.query('UPDATE quotes SET status = \'REJECTED\' WHERE id = $1', [quoteId]);

      await client.query(
        'INSERT INTO logs (who, what, min, c) VALUES ($1, $2, 0, \'#E11900\')',
        [req.user.name, 'REJECTED quotation for RFQ-' + qRes.rows[0].rfq_id + ' - "' + remark + '"']
      );

      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Failed to reject' });
    } finally {
      client.release();
    }
  });

  // Select quote for approval (Officer action)
  app.post('/api/quotes/:id/select', requireAuth, async (req, res) => {
    try {
      const quoteId = req.params.id;
      const qRes = await client.query('SELECT rfq_id FROM quotes WHERE id = $1', [quoteId]);
      if (!qRes.rows.length) return res.status(404).json({ error: 'Not found' });
      await pool.query('UPDATE quotes SET status = \'SELECTED\' WHERE id = $1', [quoteId]);
      await pool.query('UPDATE rfqs SET status = \'UNDER_APPROVAL\' WHERE id = $1', [qRes.rows[0].rfq_id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to select quote' });
    }
  });
};
