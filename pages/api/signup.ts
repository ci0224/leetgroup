import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users, stats } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface LeetCodeUserStats {
  data: {
    matchedUser: {
      submitStatsGlobal: {
        acSubmissionNum: Array<{
          difficulty: string;
          count: number;
        }>;
      };
    } | null;
  };
}

async function validateLeetCodeUser(username: string): Promise<{ easy: number; medium: number; hard: number } | null> {
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
      console.error('LeetCode API response not ok:', response.status, response.statusText);
      return null;
    }

    const data: LeetCodeUserStats = await response.json();
    console.log('LeetCode API response:', JSON.stringify(data, null, 2));
    
    if (!data.data || !data.data.matchedUser || !data.data.matchedUser.submitStatsGlobal) {
      console.error('Invalid LeetCode response structure:', data);
      return null;
    }

    const submissions = data.data.matchedUser.submitStatsGlobal.acSubmissionNum;
    const statsMap = { easy: 0, medium: 0, hard: 0 };

    submissions.forEach((submission) => {
      const difficulty = submission.difficulty.toLowerCase();
      if (difficulty in statsMap) {
        statsMap[difficulty as keyof typeof statsMap] = submission.count;
      }
    });

    return statsMap;
  } catch (error) {
    console.error('Error validating LeetCode user:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, display_name, is_public } = req.body;

  if (!username || !display_name) {
    return res.status(400).json({ error: 'Username and display_name are required' });
  }

  if (typeof username !== 'string' || typeof display_name !== 'string') {
    return res.status(400).json({ error: 'Username and display_name must be strings' });
  }

  if (is_public !== undefined && typeof is_public !== 'boolean') {
    return res.status(400).json({ error: 'is_public must be a boolean' });
  }

  if (username.length > 50 || display_name.length > 100) {
    return res.status(400).json({ error: 'Username or display_name too long' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Validate username exists on LeetCode and get initial stats
    const leetcodeStats = await validateLeetCodeUser(username);
    
    if (!leetcodeStats) {
      return res.status(400).json({ error: 'LeetCode username not found or invalid' });
    }

    // Create user
    const [newUser] = await db.insert(users).values({
      username,
      displayName: display_name,
      isPublic: is_public ?? false,
      firstSubmissionAt: new Date(),
    }).returning();

    // Insert initial stats
    await db.insert(stats).values({
      userId: newUser.id,
      easy: leetcodeStats.easy,
      medium: leetcodeStats.medium,
      hard: leetcodeStats.hard,
    });

    return res.status(201).json({
      success: true,
      user: {
        username: newUser.username,
        displayName: newUser.displayName,
        isPublic: newUser.isPublic,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
