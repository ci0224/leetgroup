import { useState, useEffect } from 'react';

interface AccountEditFormProps {
  username: string;
  currentDisplayName: string;
  currentIsPublic: boolean;
  firstSubmissionAt: string;
  onUpdateSuccess: () => void;
  onDeleteSuccess: () => void;
}

export default function AccountEditForm({ 
  username, 
  currentDisplayName, 
  currentIsPublic, 
  firstSubmissionAt,
  onUpdateSuccess,
  onDeleteSuccess 
}: AccountEditFormProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [isPublic, setIsPublic] = useState(currentIsPublic);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const firstSubmission = new Date(firstSubmissionAt);
      const fiveMinutesLater = new Date(firstSubmission.getTime() + 5 * 60 * 1000);
      const now = new Date();
      const remaining = Math.max(0, Math.ceil((fiveMinutesLater.getTime() - now.getTime()) / 1000));
      setTimeLeft(remaining);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [firstSubmissionAt]);

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/account/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          display_name: displayName,
          is_public: isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Update failed');
        return;
      }

      setMessage('Account updated successfully!');
      onUpdateSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Delete failed');
        return;
      }

      onDeleteSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (timeLeft === 0) {
    return (
      <div className="account-edit-form">
        <h3>Account Settings</h3>
        <p className="edit-expired">
          The 5-minute edit window has expired. Account settings can no longer be modified.
        </p>
      </div>
    );
  }

  return (
    <div className="account-edit-form">
      <h3>Account Settings</h3>
      <p className="time-remaining">
        Edit window expires in: <strong>{formatTimeLeft(timeLeft)}</strong>
      </p>

      <form onSubmit={handleUpdate}>
        <div className="form-group">
          <label htmlFor="editDisplayName">Display Name</label>
          <input
            type="text"
            id="editDisplayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
            Make username public (others can see your LeetCode username)
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <div className="button-group">
          <button type="submit" disabled={loading} className="update-button">
            {loading ? 'Updating...' : 'Update Account'}
          </button>
          
          <button 
            type="button" 
            onClick={() => setShowDeleteConfirm(true)} 
            disabled={loading}
            className="delete-button"
          >
            Delete Account
          </button>
        </div>
      </form>

      {showDeleteConfirm && (
        <div className="delete-confirm-modal">
          <div className="modal-content">
            <h4>Confirm Account Deletion</h4>
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button 
                onClick={handleDelete} 
                disabled={loading}
                className="confirm-delete-button"
              >
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                disabled={loading}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
