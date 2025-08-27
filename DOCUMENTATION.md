
# **LeetCode Daily Tracker – Finalized Documentation**

## **1. Overview**

* **Goal:** Track LeetCode problem-solving activity daily.
* **Features:**

  * Login-free; users are identified by their LeetCode username only.
  * Display friendly `display_name` in frontend instead of raw username.
  * Lifetime stats + past 24h delta.
  * Manual refresh with **5-min IP-ban** if stats unchanged.
  * Daily cron updates at **00:00 LAX time**.
  * Allow users to **edit display\_name, change public visibility, or delete account** within **5 minutes of first submission**.
  * Persistent storage with **Supabase PostgreSQL**.
  * ORM: **Drizzle**.
  * Optional caching for frontend and API efficiency.

---

## **2. Architecture**

```
Next.js App (Vercel)
 ├─ /pages/index.tsx                 → Frontend: signup, display stats
 ├─ /pages/api/signup.ts             → Register username + display_name
 ├─ /pages/api/stats/[username].ts   → Return lifetime + past 24h delta
 ├─ /pages/api/refresh/[username].ts → Refresh stats, enforce IP-ban
 ├─ /pages/api/account/update.ts     → Edit display_name / public flag
 ├─ /pages/api/account/delete.ts     → Delete account
 └─ /pages/api/cron/update.ts        → Scheduled daily update (00:00 LAX)

Supabase PostgreSQL
 ├─ users (id, username, display_name, is_public, first_submission_at, created_at)
 ├─ stats (id, user_id, timestamp, easy, medium, hard)
 └─ refresh_bans (ip, username, expires_at)
```

---

## **3. Database Schema**

**users**

* `id SERIAL PRIMARY KEY`
* `username TEXT UNIQUE` → LeetCode username
* `display_name TEXT NOT NULL` → frontend display
* `is_public BOOLEAN DEFAULT FALSE` → control username visibility
* `first_submission_at TIMESTAMP` → tracks first recorded submission
* `created_at TIMESTAMP DEFAULT NOW()`

**stats**

* `id SERIAL PRIMARY KEY`
* `user_id INT REFERENCES users(id)`
* `timestamp TIMESTAMP DEFAULT NOW()`
* `easy INT, medium INT, hard INT`

**refresh\_bans**

* `ip TEXT NOT NULL`
* `username TEXT NOT NULL`
* `expires_at TIMESTAMP NOT NULL`

---

## **4. API Routes**

### **/api/signup**

* **POST body:** `{ username, display_name }`
* Validates username exists on LeetCode.
* Saves user in `users` table.

### **/api/stats/\[username]**

* **GET:** Returns lifetime + past 24h delta.

### **/api/refresh/\[username]**

* **POST:**

  * Checks `refresh_bans` per IP.
  * Fetches latest stats from LeetCode.
  * Updates `stats` table if changed; otherwise adds 5-min IP-ban.

### **/api/account/update**

* **POST body:** `{ username, display_name?, is_public? }`
* Allowed **within 5 minutes of first submission**.
* Updates `display_name` or `is_public` flag.

### **/api/account/delete**

* **POST body:** `{ username }`
* Allowed **within 5 minutes of first submission**.
* Deletes account and related stats.

### **/api/cron/update**

* **GET/POST:** Updates stats for all users daily at **00:00 LAX time**.
* Time-zone aware to handle DST.

---

## **5. LeetCode GraphQL Integration**

**Endpoint:** `https://leetcode.com/graphql`

**Query:**

```graphql
query userStats($username: String!) {
  matchedUser(username: $username) {
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
}
```

* `matchedUser=null` → username does not exist.

---

## **6. Frontend**

* **Components:**

  * `SignupForm` → username + display\_name input, validates existence
  * `StatsCard` → lifetime + past 24h stats
  * `RefreshButton` → triggers refresh, shows IP-ban error
  * `AccountEditForm` → edit display\_name / is\_public / delete account (only within 5 min)

* **UX:**

  * Login-free, friendly display names, privacy enforced.
  * Only show edit/delete options if within 5-minute window.

---

## **7. Caching Strategy**

* Persistent: `stats` table snapshots.
* IP-ban: `refresh_bans` table.
* Optional in-memory caching (Node Map) for repeated LeetCode API calls.
* Frontend cache: SWR / React Query with 1–5 min TTL.

---

## **8. Security & Privacy**

* Only a user’s own stats are accessible; no way to query other users.
* 5-minute edit/delete window reduces timing-related risks.
* IP-bans prevent spam refreshes.
* SQL injection mitigated by **Drizzle ORM**.
* Minimal personal data stored (username + display\_name).

---

## **9. Environment Variables**

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgres://user:pass@host:port/dbname
```

---

## **10. Project Structure**

```
/leetcode-tracker
 ├─ /db/schema.ts
 ├─ /db/index.ts
 ├─ /pages/index.tsx
 └─ /pages/api
     ├─ signup.ts
     ├─ stats/[username].ts
     ├─ refresh/[username].ts
     ├─ account/update.ts
     ├─ account/delete.ts
     └─ cron/update.ts
 ├─ /components
     ├─ SignupForm.tsx
     ├─ StatsCard.tsx
     ├─ RefreshButton.tsx
     └─ AccountEditForm.tsx
 ├─ /styles/globals.css
 └─ package.json
```
