# Database migrations (GraniteOS → Supabase Postgres)

GraniteOS stores its schema as numbered SQL files in `supabase/migrations/`.
`scripts/migrate.mjs` applies them **directly over a Postgres connection** so we
never hand-paste SQL into the Supabase dashboard again.

## One-time setup — add the connection string

The DB password is a secret only you have, so add it once to `.env.local`:

1. Supabase dashboard → **Project Settings → Database → Connection string**.
2. Choose the **Session pooler** tab (IPv4-friendly, port **5432**).
   - Do **not** use the *Transaction* pooler (`:6543`) — it breaks multi-statement
     migrations. Direct connection works too if your network has IPv6.
3. Copy the URI and replace `[YOUR-PASSWORD]` with your database password.
4. Add it to `.env.local` (already git-ignored):

```
DATABASE_URL=postgresql://postgres.zcmolxcdgefcaithosmy:YOUR_DB_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
```

## Commands

```
npm run migrate:status     # list every migration as applied / PENDING
npm run migrate:up         # run all pending migrations, each in its own transaction
node scripts/migrate.mjs up --dry-run    # show what would run, change nothing
```

## First run on this existing database (adoption)

Migrations `0001`–`0017` were already applied by hand in the dashboard, so tell
the tracker to treat them as done **without re-running** them, then apply the rest:

```
npm run migrate:baseline   # marks 0001–0017 as applied (no SQL executed)
npm run migrate:up         # runs 0018, 0019, 0020, 0021, 0022
```

`0018`/`0019` are idempotent, so re-running them (if already applied) is harmless;
`0020`/`0021`/`0022` are the genuinely new ones.

After that, every future change is just: add `00NN_name.sql`, run `npm run migrate:up`.

## Verify after applying

```
node scripts/probe-delivery-migrations.mjs   # expect all APPLIED
node scripts/verify-isolation.mjs            # expect 39/39 PASS (0022 closes the gap)
```
