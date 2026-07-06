# Supabase backend (optional cloud sync)

CA Studio is **offline-first**. It runs entirely in the browser against
`localStorage` and needs no backend to work. Supabase is an *optional* cloud
layer for multi-device sync and per-user auth. Until the environment variables
below are set, this schema stays **dormant** and the app never talks to Supabase.

The schema lives in [`migrations/0001_core.sql`](./migrations/0001_core.sql).

## Activation

### 1. Create a free Supabase project
Go to <https://supabase.com>, sign in, and create a new project. Pick a region
close to your users and save the database password somewhere safe.

### 2. Run the schema
In the project dashboard open **SQL Editor → New query**, then paste the full
contents of `migrations/0001_core.sql` and click **Run**. It is safe to re-run:
the script uses `create ... if not exists` and drops/recreates its triggers and
policies each time. You should see the five tables under **Table Editor**:
`companies`, `book_periods`, `journal_entries`, `custom_accounts`, `entity_data`.

### 3. Enable auth providers
Go to **Authentication → Providers** and enable:
- **Email** (email/password or magic link)
- **Google** (add your Google OAuth client ID + secret, and add the Supabase
  callback URL to the Google console)

Every signed-in user is their own tenant — see RLS below.

### 4. Wire the app to the project
In **Project Settings → API**, copy the **Project URL** and the **anon public**
key, then add them to the app's `.env` (create it at the repo root if missing):

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Restart the dev server / rebuild so Vite picks up the new variables.

### 5. Offline until configured
With **no** `VITE_SUPABASE_*` variables set, the app runs fully offline against
`localStorage` and this schema is dormant. Adding the variables switches on the
Supabase-backed path; removing them returns the app to pure offline mode.

## Row Level Security (RLS)

RLS is enabled on all five tables, so **each user sees only their own companies
and their children** (book periods, journal entries, custom accounts, entity
data) — even though everyone shares the same anon key.

- `companies.user_id` defaults to `auth.uid()` and is the tenant boundary. Its
  policies are simply `user_id = auth.uid()` for select/insert/update/delete.
- Child tables carry a **denormalised `user_id`** that a `BEFORE INSERT/UPDATE`
  trigger copies down from the parent company (`set_child_user_id()`). Because
  Postgres evaluates the RLS `WITH CHECK` on the final row — *after* `BEFORE`
  triggers fire — the child policy is likewise just `user_id = auth.uid()`, no
  join required. The trigger runs with the caller's privileges, so it can only
  read companies the caller owns; pointing a child at someone else's company
  yields a `NULL` user_id and trips the `NOT NULL` constraint.

## Other integrity guarantees (enforced in `0001_core.sql`)

- **Balanced vouchers** — a `BEFORE INSERT/UPDATE` trigger on `journal_entries`
  sums `debit` and `credit` across the JSONB `lines` array and rejects any entry
  where `abs(totalDebit - totalCredit) > 0.05`.
- **Immutable entry codes** — updating `journal_entries.entry_code` raises an
  exception; the code is a permanent identifier.
- **updated_at** is bumped automatically on `companies`, `journal_entries`, and
  `entity_data`.
- Uniqueness: `book_periods (company_id, period_label)`,
  `journal_entries (company_id, entry_code)`,
  `custom_accounts (company_id, lower(name))`,
  `entity_data (company_id, module, section)`.
