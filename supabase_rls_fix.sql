-- ============================================================
-- VendorBridge — Supabase RLS Fix
-- Run this in: Supabase Dashboard → SQL Editor
-- Purpose: Enable Row Level Security on all app tables,
--          then grant the service_role (server backend) full
--          access so your API continues to work normally.
-- ============================================================

-- 1. Enable RLS on every table (blocks public anon access)
ALTER TABLE vendors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts   ENABLE ROW LEVEL SECURITY;

-- 2. Allow your backend (service_role key) to bypass RLS
--    This is the server-only admin key — never exposed to the browser.
--    Your Node.js API uses DATABASE_URL (pg pool) which runs as
--    the postgres superuser, so it already bypasses RLS automatically.
--    These policies protect against anyone using the ANON key directly.

-- VENDORS
CREATE POLICY "service_role_all_vendors"    ON vendors    FOR ALL TO service_role USING (true) WITH CHECK (true);
-- RFQs
CREATE POLICY "service_role_all_rfqs"       ON rfqs       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_rfq_items"  ON rfq_items  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_rfq_vendors" ON rfq_vendors FOR ALL TO service_role USING (true) WITH CHECK (true);
-- QUOTES
CREATE POLICY "service_role_all_quotes"     ON quotes     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_quote_items" ON quote_items FOR ALL TO service_role USING (true) WITH CHECK (true);
-- PROCUREMENT
CREATE POLICY "service_role_all_pos"        ON pos        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_invoices"   ON invoices   FOR ALL TO service_role USING (true) WITH CHECK (true);
-- AUDIT
CREATE POLICY "service_role_all_logs"       ON logs       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_notifs"     ON notifs     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_approvals"  ON approvals  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- ACCOUNTS
CREATE POLICY "service_role_all_accounts"   ON accounts   FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Verify: RLS should be enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
