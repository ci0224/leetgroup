import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users, stats } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Get user
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all stats for this user, ordered by timestamp desc
    const userStats = await db.select()
      .from(stats)
      .where(eq(stats.userId, user.id))
      .orderBy(desc(stats.timestamp));

    if (userStats.length === 0) {
      return res.status(404).json({ error: 'No stats found for user' });
    }

    // Latest stats (lifetime)
    const latestStats = userStats[0];
    
    // Find stats from 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find the closest stats entry from 24+ hours ago
    let past24hStats = null;
    for (const stat of userStats) {
      if (new Date(stat.timestamp) <= twentyFourHoursAgo) {
        past24hStats = stat;
        break;
      }
    }

    // If no stats from 24h ago, use the oldest available stats
    if (!past24hStats && userStats.length > 1) {
      past24hStats = userStats[userStats.length - 1];
    }

    // Calculate deltas
    const delta = past24hStats ? {
      easy: latestStats.easy - past24hStats.easy,
      medium: latestStats.medium - past24hStats.medium,
      hard: latestStats.hard - past24hStats.hard,
    } : {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    return res.status(200).json({
      user: {
        displayName: user.displayName,
        username: user.isPublic ? user.username : null,
      },
      lifetime: {
        easy: latestStats.easy,
        medium: latestStats.medium,
        hard: latestStats.hard,
        total: latestStats.easy + latestStats.medium + latestStats.hard,
      },
      past24h: {
        easy: delta.easy,
        medium: delta.medium,
        hard: delta.hard,
        total: delta.easy + delta.medium + delta.hard,
      },
      lastUpdated: latestStats.timestamp,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
