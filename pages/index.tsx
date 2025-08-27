import { useState, useEffect } from 'react';
import Head from 'next/head';
import SignupForm from '@/components/SignupForm';
import StatsCard from '@/components/StatsCard';
import RefreshButton from '@/components/RefreshButton';
import AccountEditForm from '@/components/AccountEditForm';
import Leaderboard from '@/components/Leaderboard';

interface StatsData {
  user: {
    displayName: string;
    username: string | null;
  };
  lifetime: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
  };
  past24h: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
  };
  lastUpdated: string;
}

interface UserData {
  username: string;
  displayName: string;
  isPublic: boolean;
  firstSubmissionAt: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUserStats = async (username: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/stats/${encodeURIComponent(username)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch stats');
        return;
      }

      setStats(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSuccess = (username: string) => {
    setCurrentUser(username);
    // Set initial user data for new signup (we know they just signed up)
    setUserData({
      username,
      displayName: '', // Will be updated when we fetch stats
      isPublic: false,
      firstSubmissionAt: new Date().toISOString(),
    });
    fetchUserStats(username);
  };

  const handleRefreshSuccess = () => {
    if (currentUser) {
      fetchUserStats(currentUser);
    }
  };

  const handleUpdateSuccess = () => {
    if (currentUser) {
      fetchUserStats(currentUser);
    }
  };

  const handleDeleteSuccess = () => {
    setCurrentUser(null);
    setUserData(null);
    setStats(null);
  };

  // Load saved user from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('leetcode-tracker-user');
    if (savedUser) {
      setCurrentUser(savedUser);
      fetchUserStats(savedUser);
    }
  }, []);

  // Save current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('leetcode-tracker-user', currentUser);
    } else {
      localStorage.removeItem('leetcode-tracker-user');
    }
  }, [currentUser]);

  // Update userData when stats are fetched
  useEffect(() => {
    if (stats && currentUser) {
      setUserData({
        username: currentUser,
        displayName: stats.user.displayName,
        isPublic: stats.user.username !== null,
        firstSubmissionAt: userData?.firstSubmissionAt || new Date().toISOString(),
      });
    }
  }, [stats, currentUser, userData?.firstSubmissionAt]);

  const isWithinEditWindow = (firstSubmissionAt: string) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(firstSubmissionAt) > fiveMinutesAgo;
  };

  return (
    <>
      <Head>
        <title>LeetCode Daily Tracker</title>
        <meta name="description" content="Track your daily LeetCode problem-solving progress" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="main">
        <div className="container">
          <header className="header">
            <h1>LeetCode Daily Tracker</h1>
            <p className="subtitle">Track your daily progress and stay motivated!</p>
          </header>

          {!currentUser ? (
            <>
              <Leaderboard />
              <SignupForm onSignupSuccess={handleSignupSuccess} />
            </>
          ) : (
            <div className="dashboard">
              <div className="dashboard-header">
                <button 
                  onClick={() => setCurrentUser(null)} 
                  className="logout-button"
                >
                  Switch User
                </button>
              </div>

              {loading && <div className="loading">Loading stats...</div>}
              {error && <div className="error-message">{error}</div>}

              {stats && (
                <>
                  <StatsCard stats={stats} />
                  
                  <RefreshButton 
                    username={currentUser} 
                    onRefreshSuccess={handleRefreshSuccess}
                  />

                  {userData && isWithinEditWindow(userData.firstSubmissionAt) && (
                    <AccountEditForm
                      username={currentUser}
                      currentDisplayName={userData.displayName}
                      currentIsPublic={userData.isPublic}
                      firstSubmissionAt={userData.firstSubmissionAt}
                      onUpdateSuccess={handleUpdateSuccess}
                      onDeleteSuccess={handleDeleteSuccess}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
