-- Grant access to public schema so the Supabase API (anon + service_role) can read/write.
-- Run this in Supabase Dashboard → SQL Editor if you get "permission denied for schema public" (42501).
-- Safe to run multiple times.

-- 1. Allow both API roles to use the public schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Grant full access on all existing tables in public (NextAuth + app tables)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. Grant usage on sequences (e.g. accounts.id uses bigserial)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Default privileges for future tables (optional; so new tables get the same grants)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, service_role, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, service_role, authenticated;
