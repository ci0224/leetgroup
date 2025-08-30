import { db } from '@/db';
import { users, stats, dailyProgress } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Get the current LAX date in YYYY-MM-DD format
 */
export function getLAXDate(date: Date = new Date()): string {
  const laxFormatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
  return laxFormatter.format(date); // Returns "YYYY-MM-DD"
}

/**
 * Calculate and store daily progress for a user based on consecutive daily fetches
 */
export async function calculateDailyProgress(userId: number): Promise<void> {
  const today = getLAXDate();
  
  // Get user's latest 2 stats entries (today's and previous day's fetches)
  const latestStats = await db.select()
    .from(stats)
    .where(eq(stats.userId, userId))
    .orderBy(desc(stats.timestamp))
    .limit(2);

  if (latestStats.length === 0) {
    return; // No stats to calculate from
  }

  const currentStats = latestStats[0]; // Today's fetch
  const previousStats = latestStats.length > 1 ? latestStats[1] : null; // Previous fetch

  // Calculate problems solved since the last fetch
  // If no previous stats, this represents their first day (all problems solved "today")
  const dailyEasy = previousStats ? Math.max(0, currentStats.easy - previousStats.easy) : currentStats.easy;
  const dailyMedium = previousStats ? Math.max(0, currentStats.medium - previousStats.medium) : currentStats.medium;
  const dailyHard = previousStats ? Math.max(0, currentStats.hard - previousStats.hard) : currentStats.hard;

  // Check if we already have an entry for today
  const [existingEntry] = await db.select()
    .from(dailyProgress)
    .where(and(
      eq(dailyProgress.userId, userId),
      eq(dailyProgress.date, today)
    ))
    .limit(1);

  if (existingEntry) {
    // Update existing entry
    await db.update(dailyProgress)
      .set({
        easy: dailyEasy,
        medium: dailyMedium,
        hard: dailyHard,
      })
      .where(eq(dailyProgress.id, existingEntry.id));
  } else {
    // Create new entry
    await db.insert(dailyProgress).values({
      userId,
      date: today,
      easy: dailyEasy,
      medium: dailyMedium,
      hard: dailyHard,
    });
  }
}

/**
 * Calculate daily progress for all users
 */
export async function calculateAllUsersDailyProgress(): Promise<void> {
  const allUsers = await db.select().from(users);
  
  for (const user of allUsers) {
    try {
      await calculateDailyProgress(user.id);
    } catch (error) {
      console.error(`Error calculating daily progress for user ${user.id}:`, error);
    }
  }
}

/**
 * Get yesterday's date in LAX timezone
 */
export function getYesterdayLAX(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLAXDate(yesterday);
}
