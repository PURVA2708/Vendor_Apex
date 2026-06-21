module.exports = (app, pool, requireAuth) => {
  app.post('/api/rfqs', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { title, desc, deadline, items, vendors, attach } = req.body;

      const { rows: rfqRows } = await client.query(
        'INSERT INTO rfqs (title, "desc", deadline, status, created_by, created, attach, selected_quote) VALUES ($1, $2, $3, \'SENT\', $4, NOW(), $5, null) RETURNING id',
        [title, desc, deadline, req.user.name, attach]
      );
      const rfqId = rfqRows[0].id;

      for (const item of items) {
        await client.query(
          'INSERT INTO rfq_items (rfq_id, name, qty, unit) VALUES ($1, $2, $3, $4)',
          [rfqId, item.name, item.qty, item.unit]
        );
      }

      for (const vId of vendors) {
        await client.query(
          'INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)',
          [rfqId, vId]
        );
      }

      await client.query(
        'INSERT INTO logs (who, what, min, c) VALUES ($1, $2, 0, \'#121212\')',
        [req.user.name, 'created RFQ #RFQ-' + rfqId + ' "' + title + '"']
      );

      await client.query(
        'INSERT INTO notifs (t, min) VALUES ($1, 0)',
        ['RFQ-' + rfqId + ' sent to ' + vendors.length + ' vendors']
      );

      await client.query('COMMIT');
      res.status(201).json({ id: rfqId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Failed to create RFQ' });
    } finally {
      client.release();
    }
  });
};
