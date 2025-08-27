import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users, stats } from '@/db/schema';
import { eq } from 'drizzle-orm';

function isWithinFiveMinutes(firstSubmissionAt: Date | null): boolean {
  if (!firstSubmissionAt) return false;
  
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  return firstSubmissionAt > fiveMinutesAgo;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Get user
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if within 5-minute edit window
    if (!isWithinFiveMinutes(user.firstSubmissionAt)) {
      return res.status(403).json({ 
        error: 'Account can only be deleted within 5 minutes of first submission',
        editWindowExpired: true,
      });
    }

    // Delete related stats first (due to foreign key constraint)
    await db.delete(stats).where(eq(stats.userId, user.id));

    // Delete user
    await db.delete(users).where(eq(users.username, username));

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
