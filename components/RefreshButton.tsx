import { useState } from 'react';

interface RefreshButtonProps {
  username: string;
  onRefreshSuccess: () => void;
}

export default function RefreshButton({ username, onRefreshSuccess }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`/api/refresh/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // IP ban case
          if (data.banExpiresAt) {
            const expiresAt = new Date(data.banExpiresAt);
            const timeLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 1000 / 60);
            setError(`Refresh banned for ${timeLeft} more minutes. Stats were unchanged.`);
          } else {
            setError(data.error || 'Refresh rate limited');
          }
        } else {
          setError(data.error || 'Refresh failed');
        }
        return;
      }

      setMessage('Stats refreshed successfully!');
      onRefreshSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="refresh-section">
      <button 
        onClick={handleRefresh} 
        disabled={loading}
        className="refresh-button"
      >
        {loading ? 'Refreshing...' : 'Refresh Stats'}
      </button>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <p className="refresh-note">
        Manual refresh will ban your IP for 5 minutes if stats haven&apos;t changed since last update.
      </p>
    </div>
  );
}
