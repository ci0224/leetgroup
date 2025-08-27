import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users, stats, refreshBans } from '@/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';

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
        'User-Agent': 'LeetCode-Tracker/1.0',
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data: LeetCodeUserStats = await response.json();
    
    if (!data.matchedUser || !data.matchedUser.submitStatsGlobal) {
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
    console.error('Error fetching LeetCode stats:', error);
    return null;
  }
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;
  return ip || 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;
  const clientIP = getClientIP(req);

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Check for active IP ban
    const now = new Date();
    const activeBan = await db.select()
      .from(refreshBans)
      .where(
        and(
          eq(refreshBans.ip, clientIP),
          eq(refreshBans.username, username),
          gt(refreshBans.expiresAt, now)
        )
      )
      .limit(1);

    if (activeBan.length > 0) {
      const timeLeft = Math.ceil((activeBan[0].expiresAt.getTime() - now.getTime()) / 1000 / 60);
      return res.status(429).json({ 
        error: `Refresh banned. Try again in ${timeLeft} minutes.`,
        banExpiresAt: activeBan[0].expiresAt,
      });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get latest stats
    const [latestStats] = await db.select()
      .from(stats)
      .where(eq(stats.userId, user.id))
      .orderBy(desc(stats.timestamp))
      .limit(1);

    if (!latestStats) {
      return res.status(404).json({ error: 'No stats found for user' });
    }

    // Fetch current LeetCode stats
    const currentStats = await fetchLeetCodeStats(username);
    
    if (!currentStats) {
      return res.status(500).json({ error: 'Failed to fetch LeetCode stats' });
    }

    // Check if stats have changed
    const statsChanged = (
      currentStats.easy !== latestStats.easy ||
      currentStats.medium !== latestStats.medium ||
      currentStats.hard !== latestStats.hard
    );

    if (statsChanged) {
      // Insert new stats record
      await db.insert(stats).values({
        userId: user.id,
        easy: currentStats.easy,
        medium: currentStats.medium,
        hard: currentStats.hard,
      });

      return res.status(200).json({
        success: true,
        message: 'Stats updated successfully',
        stats: currentStats,
      });
    } else {
      // Stats unchanged, add IP ban for 5 minutes
      const banExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);
      
      await db.insert(refreshBans).values({
        ip: clientIP,
        username,
        expiresAt: banExpiresAt,
      });

      return res.status(429).json({
        error: 'Stats unchanged. Refresh banned for 5 minutes.',
        banExpiresAt,
      });
    }
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
