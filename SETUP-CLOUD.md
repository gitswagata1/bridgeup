# BridgeUp — Campus deployment (5-minute setup)

Out of the box BridgeUp runs in **local demo mode** (accounts live in each
browser). Follow these steps once to switch on **campus mode**: real accounts,
progress, tests, marks and materials shared across every device — sized
comfortably for ~1,000 students and 15+ faculty on Supabase's free tier.

## 1 · Create the database (≈3 min)

1. Go to **[supabase.com](https://supabase.com)** → sign up (GitHub login works) → **New project**.
   Pick any name (e.g. `bridgeup`), a strong database password, and a region near campus (Mumbai).
2. In the left sidebar open **SQL Editor** → **New query**, paste the entire
   contents of [`supabase/schema.sql`](supabase/schema.sql), and **Run**.
   - *Optional:* before running, change `admin_email` near the top if the
     admin should be someone other than `theswagata1@gmail.com`.
3. In **Authentication → Sign In / Providers → Email**, turn **off**
   “Confirm email” for a friction-free pilot (or leave it on — students then
   confirm their VIT inbox before first login).

## 2 · Connect the site (≈1 min)

1. In Supabase: **Project Settings → API** — copy the **Project URL** and the
   **anon public** key.
2. Edit [`js/config.js`](js/config.js) in this repo:

```js
window.BRIDGEUP_CONFIG = {
  supabaseUrl: "https://YOURPROJECT.supabase.co",
  supabaseAnonKey: "eyJhbGciOi…",          // the long anon/public key
  adminEmail: "theswagata1@gmail.com"
};
```

3. Commit and push — GitHub Pages redeploys in about a minute.

> The anon key is *designed* to be public. Every read and write is enforced
> by Postgres row-level security (see `schema.sql`), not by hiding the key.

## 3 · First run (≈1 min)

1. Open the site → **New account** → sign up with the admin email — you land
   in the admin console automatically (the database assigns roles).
2. Faculty sign up with `@vit.ac.in`; students with `@vitstudent.ac.in`.
   Roles are assigned server-side from the domain — nobody can self-promote.

## How campus mode differs from the demo

| | Local demo | Campus mode |
|---|---|---|
| Accounts & progress | per-browser | real, synced across devices |
| Demo cohort seeding | yes | off |
| Test approval | client rule | enforced by `vote_test()` in the database |
| Marks | same browser only | faculty see the whole class live |
| Admin delete/reset/role | local | server-enforced RPCs (admins can't be demoted) |
| Data export | localStorage dump | full cloud snapshot (accounts, progress, tests, marks, materials) |

## Capacity (Supabase free tier)

- 500 MB database — a student's progress blob is ~5–10 KB, so 1,000 students
  ≈ 10 MB; tests/marks/materials are trivial on top.
- 50,000 monthly active users on auth — far above 1,015.
- If the pilot outgrows free tier limits (unlikely), the Pro tier is a
  drop-in upgrade with no code changes.

## Troubleshooting

- **“Signed in, but no profile was found”** — `schema.sql` wasn't run (the
  `on_auth_user_created` trigger creates profiles). Run it, then sign up again.
- **Sign-ups say “confirm your email”** — that's the Supabase confirmation
  setting from step 1.3; disable it or have users confirm.
- **Changed `js/config.js` but the site still shows demo logins** — hard-refresh
  (Cmd/Ctrl+Shift+R); GitHub Pages caches assets for up to 10 minutes.
