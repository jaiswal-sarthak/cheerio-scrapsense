# Fix: Google Sign-In `error=Callback` on Vercel

If after clicking "Continue with Google" you land back on the signin page with:

`/signin?callbackUrl=...&error=Callback`

follow this checklist. The codebase already has `trustHost: true`; the rest is configuration.

---

## 1. Vercel environment variables

In **Vercel** → your project → **Settings** → **Environment Variables**, set:

| Variable | Value | Environment |
|----------|--------|-------------|
| `NEXTAUTH_URL` | `https://cheerio-scrapsense.vercel.app` | Production (and Preview if you use that domain) |
| `NEXTAUTH_SECRET` | A long random string (e.g. `openssl rand -base64 32`) | Production, Preview |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | Production, Preview |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (not anon) | Production, Preview |

**Important:** No trailing slash in `NEXTAUTH_URL`.

Redeploy after changing env vars (Vercel → Deployments → … → Redeploy).

---

## 2. Google Cloud Console – redirect URI

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Open your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, add exactly:
   - `https://cheerio-scrapsense.vercel.app/api/auth/callback/google`
4. Save.

If this URI is missing or different, Google may still redirect but NextAuth will fail and show `error=Callback`.

---

## 3. "Permission denied for schema public" (code 42501)

If the server logs or `/api/auth/check-db` show:

```text
permission denied for schema public
code: '42501'
```

then the API role cannot access the `public` schema. Do **both** steps below.

### Step A – Grant permissions in Supabase (fix schema access)

1. Open **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
2. Copy the **entire** contents of `supabase/migrations/0003_grant_public_schema.sql`.
3. Paste into the SQL Editor and click **Run**.
4. You should see “Success” or “No rows returned”. That grants `anon`, `service_role`, and `authenticated` access to the public schema and tables.

### Step B – Use the service_role key in .env

- In Supabase: **Project Settings** → **API**.
- Under **Project API keys**:
  - **anon** / **public** → do **not** use for the adapter.
  - **service_role** → copy this value (click “Reveal” if needed).
- In your `.env` set: `SUPABASE_SERVICE_ROLE_KEY=<paste service_role key here>`.
- Restart the dev server (`npm run dev`). Then open **http://localhost:3000/api/auth/check-db** again; it should show `ok: true`.

---

## 4. Auth schema vs public schema (which tables we use)

This app **does not use Supabase Auth** (`auth.users`). It uses **NextAuth** with tables in the **public** schema.

| In Supabase Dashboard | Used by this app? |
|------------------------|-------------------|
| **auth** schema (e.g. `auth.users`) | **No** – that’s Supabase’s built-in Auth; ignore it for this project. |
| **public** schema: `public.users`, `public.accounts`, `public.sessions`, `public.verification_tokens` | **Yes** – this is what the NextAuth adapter uses. |

- In **Table Editor**, switch the schema dropdown from **auth** to **public** to see `users`, `accounts`, `sessions`, `verification_tokens`.
- **Empty `public.accounts` (and empty `public.users`) is normal** before anyone signs in; after the first successful Google (or email) login, rows will appear.
- If those **public** tables don’t exist, run the migration: Supabase **SQL Editor** → New query → paste the contents of `supabase/migrations/0001_init.sql` → Run.

---

## 5. Supabase (optional check)

The app uses **Supabase service role** in the NextAuth adapter; it bypasses RLS. If something still fails:

- In Supabase **SQL Editor**, confirm tables exist in **public**: `public.users`, `public.accounts`, `public.sessions`, `public.verification_tokens`.
- If you can share the schema (or a screenshot of **Table Editor** for **public** `users` and `accounts`), we can double-check column names and constraints.

---

## 6. Clear browser state and retry

1. Clear cookies (and site data) for `cheerio-scrapsense.vercel.app`.
2. Try sign-in again in an incognito/private window.

---

## Summary

- **Code:** `trustHost: true` is set in `lib/auth/options.ts` so callbacks work behind Vercel’s proxy.
- **You must set:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google env vars, and Supabase env vars in Vercel.
- **You must set:** Google OAuth redirect URI to `https://cheerio-scrapsense.vercel.app/api/auth/callback/google`.

---

## 7. Still not working? Get the exact error

**Step A – Check Supabase access (local dev only)**  
With the dev server running (`npm run dev`), open in the browser:

- **http://localhost:3000/api/auth/check-db**

You should see JSON with `ok: true` and "OK" for `users` and `accounts`. If you see `ok: false` and an error (e.g. "permission denied", "relation does not exist"):

- "permission denied" → use the **service_role** key in `.env`, not the anon key.
- "relation ... does not exist" → run `supabase/migrations/0001_init.sql` in Supabase SQL Editor.

**Step B – Reproduce and read the terminal**  
1. Try "Continue with Google" again.  
2. In the **terminal** where `npm run dev` is running, look for lines like:
   - `[NextAuth] Auth error: ...`
   - `[next-auth][error][adapter_error_...]`  
3. Copy that full error message; it tells you which step failed (e.g. `createUser`, `linkAccount`, `getUserByAccount`).

If it still fails after this, share the **exact error** from the terminal (or from `/api/auth/check-db`) so we can target the next fix.
