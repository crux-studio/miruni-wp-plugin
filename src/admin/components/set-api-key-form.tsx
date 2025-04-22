import { useState } from 'react';

export const APIKeySettings = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('');

    try {
      const formData = new FormData();
      formData.append('action', 'update_miruni_api_key');
      formData.append('nonce', window.miruniData.nonce);
      formData.append('api_key', apiKey);

      const response = await fetch(window.miruniData.ajaxUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      const data = await response.json();

      if (data.success) {
        setStatus('API key updated successfully!');
      } else {
        setStatus('Failed to update API key. Please try again.');
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      setStatus('An error occurred while updating the API key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wrap">
      <form onSubmit={handleSubmit}>
        <table className="form-table">
          <tbody>
            <tr>
              <th scope="row">
                <label htmlFor="miruni-api-key">API Key</label>
              </th>
              <td>
                <input
                  type="text"
                  id="miruni-api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="regular-text"
                  placeholder="Enter your API key"
                />
                <p className="description">Enter the API key for the Miruni snippet.</p>
              </td>
            </tr>
          </tbody>
        </table>

        <button type="submit" className="button button-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save API Key'}
        </button>

        {status && (
          <div
            className={`notice ${status.includes('success') ? 'notice-success' : 'notice-error'}`}
          >
            <p>{status}</p>
          </div>
        )}
      </form>
    </div>
  );
};
