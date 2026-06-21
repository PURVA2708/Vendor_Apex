module.exports = (app, pool, requireAuth) => {
  // Add a new vendor
  app.post('/api/vendors', requireAuth, async (req, res) => {
    try {
      const { name, cat, gst, email, phone } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO vendors (name, cat, gst, email, phone, status, rating) VALUES ($1, $2, $3, $4, $5, \'active\', 4.0) RETURNING *',
        [name, cat, gst, email, phone]
      );

      await pool.query(
        'INSERT INTO logs (who, what, min, c) VALUES ($1, $2, 0, \'#121212\')',
        [req.user.name, 'registered vendor "' + name + '"']
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  });

  // Toggle vendor status
  app.put('/api/vendors/:id/status', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { rows } = await pool.query(
        'UPDATE vendors SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });

      await pool.query(
        'INSERT INTO logs (who, what, min, c) VALUES ($1, $2, 0, \'#121212\')',
        [req.user.name, 'set vendor "' + rows[0].name + '" to ' + status]
      );

      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update vendor' });
    }
  });
};
