import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/db';
import { users } from '@/db/schema';
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

  const { username, display_name, is_public } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (display_name !== undefined && (typeof display_name !== 'string' || display_name.length === 0)) {
    return res.status(400).json({ error: 'Display name must be a non-empty string' });
  }

  if (is_public !== undefined && typeof is_public !== 'boolean') {
    return res.status(400).json({ error: 'is_public must be a boolean' });
  }

  if (display_name && display_name.length > 100) {
    return res.status(400).json({ error: 'Display name too long' });
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
        error: 'Account can only be edited within 5 minutes of first submission',
        editWindowExpired: true,
      });
    }

    // Prepare update data
    const updateData: Partial<{ displayName: string; isPublic: boolean }> = {};
    
    if (display_name !== undefined) {
      updateData.displayName = display_name;
    }
    
    if (is_public !== undefined) {
      updateData.isPublic = is_public;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Update user
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.username, username))
      .returning();

    return res.status(200).json({
      success: true,
      user: {
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        isPublic: updatedUser.isPublic,
      },
    });
  } catch (error) {
    console.error('Account update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
