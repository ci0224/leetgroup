import { useState } from 'react';

interface SignupFormProps {
  onSignupSuccess: (username: string) => void;
}

export default function SignupForm({ onSignupSuccess }: SignupFormProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !displayName.trim()) {
      setError('Both username and display name are required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          is_public: isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      setUsername('');
      setDisplayName('');
      setIsPublic(false);
      onSignupSuccess(username.trim());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-form">
      <h2>Join LeetCode Daily Tracker</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">LeetCode Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your LeetCode username"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="displayName">Display Name</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Choose a display name"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={loading}
            />
            Make my LeetCode username public (others can see @{username || 'your-username'})
          </label>
          <p className="checkbox-help">
            When public, your LeetCode username will be visible on the leaderboard. 
            When private, only your display name will be shown.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="signup-note">
        Your LeetCode username will be validated. You&apos;ll have 5 minutes after signup to edit your settings or delete your account.
      </p>
    </div>
  );
}
