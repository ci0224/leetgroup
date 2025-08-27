# LeetCode Daily Tracker

A modern web application to track daily LeetCode problem-solving progress with beautiful UI and comprehensive features.

## Features

- **Login-free tracking** - Users identified by LeetCode username only
- **Real-time stats** - Lifetime stats + past 24h delta
- **Smart refresh system** - Manual refresh with 5-min IP-ban if stats unchanged
- **Daily automated updates** - Cron job updates all users at 00:00 LAX time
- **Account management** - Edit display name, privacy settings, or delete account within 5 minutes of signup
- **Beautiful modern UI** - Responsive design with gradient backgrounds and smooth animations
- **Privacy controls** - Option to keep LeetCode username private

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: CSS with modern gradients and responsive design
- **LeetCode Integration**: GraphQL API

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file with:
   ```env
   DATABASE_URL=postgres://user:pass@host:port/dbname
   SUPABASE_URL=your_supabase_url (optional)
   SUPABASE_ANON_KEY=your_supabase_anon_key (optional)
   CRON_SECRET=your_secret_for_cron_endpoint (optional)
   ```

3. **Set up database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Database Schema

### Users Table
- `id` - Primary key
- `username` - LeetCode username (unique)
- `display_name` - Friendly display name
- `is_public` - Whether to show LeetCode username publicly
- `first_submission_at` - Timestamp for 5-minute edit window
- `created_at` - Account creation timestamp

### Stats Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `timestamp` - When stats were recorded
- `easy`, `medium`, `hard` - Problem counts by difficulty

### Refresh Bans Table
- `ip` - IP address
- `username` - Username
- `expires_at` - When the ban expires

## API Endpoints

- `POST /api/signup` - Register new user with LeetCode validation
- `GET /api/stats/[username]` - Get user stats with 24h delta
- `POST /api/refresh/[username]` - Manual refresh with IP-ban logic
- `POST /api/account/update` - Update display name/privacy (5-min window)
- `POST /api/account/delete` - Delete account (5-min window)
- `GET/POST /api/cron/update` - Daily automated stats update

## Key Features

### 5-Minute Edit Window
New users can edit their display name, privacy settings, or delete their account within 5 minutes of first submission.

### IP-Based Refresh Protection
Manual refresh requests that don't result in stat changes will ban the IP for 5 minutes to prevent spam.

### Privacy Controls
Users can choose whether their LeetCode username is visible publicly or keep it private while showing only their display name.

### Automated Daily Updates
A cron endpoint updates all user stats daily at midnight LAX time, handling timezone changes automatically.

## Deployment

The app is designed to be deployed on Vercel with a PostgreSQL database (Supabase recommended). Set up the environment variables and configure the cron job for daily updates.

## License

MIT License
