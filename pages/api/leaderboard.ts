import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users, dailyProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getYesterdayLAX } from '@/lib/dailyProgress';

interface LeaderboardEntry {
  displayName: string;
  username: string | null;
  yesterday: {
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

    // Get yesterday's date in LAX timezone
    const yesterdayDate = getYesterdayLAX();

    // Get all users who have daily progress for yesterday
    const yesterdayProgressData = await db.select({
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
    .where(eq(dailyProgress.date, yesterdayDate));

    const leaderboardData: LeaderboardEntry[] = [];

    for (const progress of yesterdayProgressData) {
      const total = progress.easy + progress.medium + progress.hard;
      const score = calculateScore(progress.easy, progress.medium, progress.hard);

      // Only include users who solved at least one problem yesterday
      if (total > 0) {
        leaderboardData.push({
          displayName: progress.displayName,
          username: progress.isPublic ? progress.username : null,
          yesterday: {
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
      if (b.yesterday.score !== a.yesterday.score) {
        return b.yesterday.score - a.yesterday.score;
      }
      return b.yesterday.total - a.yesterday.total;
    });

    // Assign ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return res.status(200).json({
      leaderboard: leaderboardData,
      timestamp: new Date().toISOString(),
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
