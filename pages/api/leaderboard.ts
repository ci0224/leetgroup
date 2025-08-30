import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users, dailyProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLAXDate } from '@/lib/dailyProgress';

interface LeaderboardEntry {
  displayName: string;
  username: string | null;
  past24h: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
    score: number;
  };
  rank: number;
}

function calculateScore(easy: number, medium: number, hard: number): number {
  return 2 * easy + 3 * medium + 4 * hard;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if database environment is configured
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable is not set' 
      });
    }

    // Test database connection and table existence
    try {
      await db.select().from(users).limit(1);
    } catch (dbError) {
      if (dbError instanceof Error) {
        if (dbError.message.includes('relation') && dbError.message.includes('does not exist')) {
          return res.status(500).json({ 
            error: 'Database tables not found',
            message: 'Please run database migrations to create the required tables'
          });
        }
        if (dbError.message.includes('connection') || dbError.message.includes('connect')) {
          return res.status(500).json({ 
            error: 'Database connection failed',
            message: 'Unable to connect to the database. Please check your DATABASE_URL'
          });
        }
      }
      return res.status(500).json({ 
        error: 'Database error',
        message: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

    // Get today's date in LAX timezone (for past 24h progress)
    const todayDate = getLAXDate();

    // Get all users who have daily progress for today (past 24h)
    const todayProgressData = await db.select({
      userId: dailyProgress.userId,
      easy: dailyProgress.easy,
      medium: dailyProgress.medium,
      hard: dailyProgress.hard,
      displayName: users.displayName,
      username: users.username,
      isPublic: users.isPublic,
    })
    .from(dailyProgress)
    .innerJoin(users, eq(dailyProgress.userId, users.id))
    .where(eq(dailyProgress.date, todayDate));

    const leaderboardData: LeaderboardEntry[] = [];

    for (const progress of todayProgressData) {
      const total = progress.easy + progress.medium + progress.hard;
      const score = calculateScore(progress.easy, progress.medium, progress.hard);

      // Only include users who solved at least one problem in the past 24h
      if (total > 0) {
        leaderboardData.push({
          displayName: progress.displayName,
          username: progress.isPublic ? progress.username : null,
          past24h: {
            easy: progress.easy,
            medium: progress.medium,
            hard: progress.hard,
            total,
            score,
          },
          rank: 0, // Will be set after sorting
        });
      }
    }

    // Sort by score (descending), then by total problems (descending)
    leaderboardData.sort((a, b) => {
      if (b.past24h.score !== a.past24h.score) {
        return b.past24h.score - a.past24h.score;
      }
      return b.past24h.total - a.past24h.total;
    });

    // Assign ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return res.status(200).json({
      leaderboard: leaderboardData,
      timestamp: new Date().toISOString(),
      date: {
        todayLAX: todayDate,
        displayDate: new Date(todayDate + 'T00:00:00-07:00').toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          timeZone: 'America/Los_Angeles'
        }),
        description: "Problems solved since yesterday's update"
      },
      scoreSystem: {
        easy: 2,
        medium: 3,
        hard: 4,
        formula: "2×Easy + 3×Medium + 4×Hard"
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    
    // Return more detailed error in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
