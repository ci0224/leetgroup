import { useState, useEffect } from 'react';

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

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  timestamp: string;
  scoreSystem: {
    easy: number;
    medium: number;
    hard: number;
    formula: string;
  };

}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/leaderboard');
      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.message ? `${result.error}: ${result.message}` : (result.error || 'Failed to fetch leaderboard');
        setError(errorMsg);
        return;
      }

      setData(result);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'rank-default';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="leaderboard">
        <h2>Yesterday&apos;s Leaderboard</h2>
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard">
        <h2>Yesterday&apos;s Leaderboard</h2>
        <div className="error-message">{error}</div>
        <button onClick={fetchLeaderboard} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.leaderboard.length === 0) {
    return (
      <div className="leaderboard">
        <h2>Yesterday&apos;s Leaderboard</h2>
        <div className="no-data">
          No activity yesterday. Be the first to solve problems and claim the top spot!
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>🏆 Yesterday&apos;s Leaderboard</h2>
        <div className="score-info">
          <span className="score-formula">Scoring: {data.scoreSystem.formula}</span>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
            Based on problems solved yesterday (LAX timezone)
          </div>
        </div>
      </div>

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="rank-col">Rank</div>
          <div className="name-col">Player</div>
          <div className="stats-col">Easy</div>
          <div className="stats-col">Medium</div>
          <div className="stats-col">Hard</div>
          <div className="total-col">Total</div>
          <div className="score-col">Score</div>
        </div>

        {data.leaderboard.map((entry, index) => (
          <div 
            key={`${entry.displayName}-${index}`}
            className={`table-row ${getRankClass(entry.rank)}`}
          >
            <div className="rank-col">
              <span className="rank-badge">
                {getRankDisplay(entry.rank)}
              </span>
            </div>
            
            <div className="name-col">
              <div className="player-info">
                <span className="display-name">{entry.displayName}</span>
                {entry.username && (
                  <span className="username">@{entry.username}</span>
                )}
              </div>
            </div>
            
            <div className="stats-col easy-stat">
              {entry.yesterday.easy}
            </div>
            
            <div className="stats-col medium-stat">
              {entry.yesterday.medium}
            </div>
            
            <div className="stats-col hard-stat">
              {entry.yesterday.hard}
            </div>
            
            <div className="total-col">
              {entry.yesterday.total}
            </div>
            
            <div className="score-col">
              <strong>{entry.yesterday.score}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="leaderboard-footer">
        <p className="last-updated">
          Last updated: {formatTimestamp(data.timestamp)}
        </p>
        <button onClick={fetchLeaderboard} className="refresh-leaderboard">
          Refresh
        </button>
      </div>
    </div>
  );
}
