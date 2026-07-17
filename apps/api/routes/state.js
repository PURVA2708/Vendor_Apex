module.exports = (app, pool, requireAuth) => {
  app.get('/api/state', requireAuth, async (req, res) => {
    try {
      const [
        vendorsRes,
        rfqsRes,
        rfqItemsRes,
        rfqVendorsRes,
        quotesRes,
        quoteItemsRes,
        posRes,
        invoicesRes,
        logsRes,
        notifsRes,
        approvalsRes,
        accountsRes
      ] = await Promise.all([
        pool.query('SELECT * FROM vendors ORDER BY id DESC'),
        pool.query('SELECT * FROM rfqs ORDER BY id DESC'),
        pool.query('SELECT * FROM rfq_items ORDER BY id ASC'),
        pool.query('SELECT * FROM rfq_vendors'),
        pool.query('SELECT * FROM quotes ORDER BY id DESC'),
        pool.query('SELECT * FROM quote_items ORDER BY id ASC'),
        pool.query('SELECT * FROM pos ORDER BY id DESC'),
        pool.query('SELECT * FROM invoices ORDER BY id DESC'),
        pool.query('SELECT id, who, what, c, created_at AS min FROM logs ORDER BY id DESC LIMIT 100'),
        pool.query('SELECT id, t, created_at AS min FROM notifs ORDER BY id DESC LIMIT 50'),
        pool.query('SELECT * FROM approvals ORDER BY id DESC'),
        pool.query('SELECT id, email, name, role, label, vendor_id FROM accounts ORDER BY id DESC')
      ]);

      // Construct nested items and vendors array for rfqs
      const rfqs = rfqsRes.rows.map(r => {
        r.items = rfqItemsRes.rows.filter(i => i.rfq_id === r.id);
        r.vendors = rfqVendorsRes.rows.filter(v => v.rfq_id === r.id).map(v => v.vendor_id);
        // Rename keys to match frontend expectation (createdBy -> created_by, selectedQuote -> selected_quote)
        r.createdBy = r.created_by;
        r.selectedQuote = r.selected_quote;
        return r;
      });

      // Construct nested items for quotes
      const quotes = quotesRes.rows.map(q => {
        q.items = quoteItemsRes.rows.filter(i => i.quote_id === q.id);
        q.at = q.created_at;
        return q;
      });

      // Format others to match frontend `S` object
      const approvals = approvalsRes.rows.map(a => ({
        id: a.id, quote: a.quote_id, rfq: a.rfq_id, by: a.by_user, action: a.action, remark: a.remark, at: a.created_at
      }));

      const pos = posRes.rows.map(p => ({
        id: p.id, num: p.num, rfq: p.rfq_id, quote: p.quote_id, vendor: p.vendor_id, total: Number(p.total), status: p.status, at: p.created_at
      }));

      const invoices = invoicesRes.rows.map(i => ({
        id: i.id, num: i.num, po: i.po_id, subtotal: Number(i.subtotal), tax: Number(i.tax), total: Number(i.total), emailed: i.emailed, status: i.status, at: i.created_at
      }));

      const accounts = accountsRes.rows.map(a => ({
        id: a.id, email: a.email, name: a.name, role: a.role, label: a.label, vendorId: a.vendor_id
      }));

      const history = [ {m:'JAN',v:8.4},{m:'FEB',v:11.2},{m:'MAR',v:6.8},{m:'APR',v:13.5},{m:'MAY',v:9.7},{m:'JUN',v:14.6} ];

      const now = Date.now();
      const logs = logsRes.rows.map(l => ({
        id: l.id, who: l.who, what: l.what, c: l.c || '#121212',
        min: Math.round((now - new Date(l.min || l.created_at).getTime()) / 60000),
      }));
      const notifs = notifsRes.rows.map(n => ({
        id: n.id, t: n.t,
        min: Math.round((now - new Date(n.min || n.created_at).getTime()) / 60000),
      }));

      res.json({
        vendors: vendorsRes.rows,
        rfqs,
        quotes,
        pos,
        invoices,
        logs,
        notifs,
        approvals,
        accounts,
        history,
        seq: {rfq: 2000, quote: 2000, po: 2000, inv: 2000, appr: 2000, vendor: 2000} // Dummy sequences, as DB has auto-increment now
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load state' });
    }
  });
};
