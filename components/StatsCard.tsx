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

interface StatsCardProps {
  stats: StatsData;
}

export default function StatsCard({ stats }: StatsCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeltaDisplay = (delta: number) => {
    if (delta === 0) return '—';
    return delta > 0 ? `+${delta}` : `${delta}`;
  };

  const getDeltaClass = (delta: number) => {
    if (delta > 0) return 'delta-positive';
    if (delta < 0) return 'delta-negative';
    return 'delta-neutral';
  };

  return (
    <div className="stats-card">
      <div className="stats-header">
        <h2>{stats.user.displayName}</h2>
        {stats.user.username && (
          <p className="username">@{stats.user.username}</p>
        )}
      </div>

      <div className="stats-grid">
        <div className="stats-section">
          <h3>Lifetime Stats</h3>
          <div className="stats-row">
            <div className="stat-item easy">
              <span className="stat-label">Easy</span>
              <span className="stat-value">{stats.lifetime.easy}</span>
            </div>
            <div className="stat-item medium">
              <span className="stat-label">Medium</span>
              <span className="stat-value">{stats.lifetime.medium}</span>
            </div>
            <div className="stat-item hard">
              <span className="stat-label">Hard</span>
              <span className="stat-value">{stats.lifetime.hard}</span>
            </div>
            <div className="stat-item total">
              <span className="stat-label">Total</span>
              <span className="stat-value">{stats.lifetime.total}</span>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h3>Past 24 Hours</h3>
          <div className="stats-row">
            <div className="stat-item easy">
              <span className="stat-label">Easy</span>
              <span className={`stat-value delta ${getDeltaClass(stats.past24h.easy)}`}>
                {getDeltaDisplay(stats.past24h.easy)}
              </span>
            </div>
            <div className="stat-item medium">
              <span className="stat-label">Medium</span>
              <span className={`stat-value delta ${getDeltaClass(stats.past24h.medium)}`}>
                {getDeltaDisplay(stats.past24h.medium)}
              </span>
            </div>
            <div className="stat-item hard">
              <span className="stat-label">Hard</span>
              <span className={`stat-value delta ${getDeltaClass(stats.past24h.hard)}`}>
                {getDeltaDisplay(stats.past24h.hard)}
              </span>
            </div>
            <div className="stat-item total">
              <span className="stat-label">Total</span>
              <span className={`stat-value delta ${getDeltaClass(stats.past24h.total)}`}>
                {getDeltaDisplay(stats.past24h.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-footer">
        <p className="last-updated">
          Last updated: {formatDate(stats.lastUpdated)}
        </p>
      </div>
    </div>
  );
}
