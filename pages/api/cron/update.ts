import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users, stats } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { calculateAllUsersDailyProgress } from '@/lib/dailyProgress';

interface LeetCodeUserStats {
  matchedUser: {
    submitStatsGlobal: {
      acSubmissionNum: Array<{
        difficulty: string;
        count: number;
      }>;
    };
  } | null;
}

async function fetchLeetCodeStats(username: string): Promise<{ easy: number; medium: number; hard: number } | null> {
  try {
    const query = `
      query userStats($username: String!) {
        matchedUser(username: $username) {
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
      }
    `;

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LeetCode-Tracker-Cron/1.0',
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
    });

    if (!response.ok) {
      console.error(`Failed to fetch stats for ${username}: ${response.status}`);
      return null;
    }

    const data: LeetCodeUserStats = await response.json();
    
    if (!data.matchedUser || !data.matchedUser.submitStatsGlobal) {
      console.error(`No stats found for ${username}`);
      return null;
    }

    const submissions = data.matchedUser.submitStatsGlobal.acSubmissionNum;
    const statsMap = { easy: 0, medium: 0, hard: 0 };

    submissions.forEach((submission) => {
      const difficulty = submission.difficulty.toLowerCase();
      if (difficulty in statsMap) {
        statsMap[difficulty as keyof typeof statsMap] = submission.count;
      }
    });

    return statsMap;
  } catch (error) {
    console.error(`Error fetching LeetCode stats for ${username}:`, error);
    return null;
  }
}

// function isLAXMidnight(): boolean {
//   // Check if current time is midnight (00:00) in Los Angeles timezone
//   const now = new Date();
//   const laxTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
//   
//   return laxTime.getHours() === 0 && laxTime.getMinutes() < 5; // 5-minute window for cron execution
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both GET and POST for flexibility with cron services
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple authentication for cron endpoint
  const authHeader = req.headers.authorization;
  const expectedAuth = process.env.CRON_SECRET;
  
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all users
    const allUsers = await db.select().from(users);
    
    console.log(`Starting daily update for ${allUsers.length} users`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        // Get user's latest stats to check if update is needed
        const [latestStats] = await db.select()
          .from(stats)
          .where(eq(stats.userId, user.id))
          .orderBy(desc(stats.timestamp))
          .limit(1);

        // Fetch current LeetCode stats
        const currentStats = await fetchLeetCodeStats(user.username);
        
        if (!currentStats) {
          console.error(`Failed to fetch stats for user: ${user.username}`);
          errorCount++;
          continue;
        }

        // Only insert new record if stats have changed or if it's been more than 23 hours
        const shouldUpdate = !latestStats || 
          currentStats.easy !== latestStats.easy ||
          currentStats.medium !== latestStats.medium ||
          currentStats.hard !== latestStats.hard ||
          (new Date().getTime() - new Date(latestStats.timestamp).getTime() > 23 * 60 * 60 * 1000);

        if (shouldUpdate) {
          await db.insert(stats).values({
            userId: user.id,
            easy: currentStats.easy,
            medium: currentStats.medium,
            hard: currentStats.hard,
          });
          
          console.log(`Updated stats for user: ${user.username}`);
          successCount++;
        } else {
          console.log(`No update needed for user: ${user.username}`);
          successCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error updating user ${user.username}:`, error);
        errorCount++;
      }
    }

    console.log(`Daily update completed. Success: ${successCount}, Errors: ${errorCount}`);

    // Calculate daily progress for all users after updating stats
    console.log('Calculating daily progress for all users...');
    try {
      await calculateAllUsersDailyProgress();
      console.log('Daily progress calculation completed');
    } catch (error) {
      console.error('Error calculating daily progress:', error);
    }

    return res.status(200).json({
      success: true,
      message: 'Daily update completed',
      results: {
        totalUsers: allUsers.length,
        successCount,
        errorCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
