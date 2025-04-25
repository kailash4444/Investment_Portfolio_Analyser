import React, { useState, useEffect } from 'react';
import { redirectToZerodhaLogin, checkAuthStatus } from '../services/api';

function ConnectZerodha() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check status when component mounts
    checkAuthStatus()
      .then(response => {
        setIsConnected(response.data.connected);
      })
      .catch(error => {
        console.error("Error checking auth status:", error);
        // Assume not connected if status check fails
        setIsConnected(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []); // Empty dependency array means run once on mount

  const handleConnectClick = () => {
    redirectToZerodhaLogin(); // This navigates the browser away
  };

  if (isLoading) {
    return <div>Loading connection status...</div>;
  }

  return (
    <div>
      <h2>Zerodha Connection</h2>
      {isConnected ? (
        <p style={{ color: 'green' }}>Connected to Zerodha.</p>
        // Optionally add a "Disconnect" button if needed (requires backend logic)
      ) : (
        <>
          <p style={{ color: 'red' }}>Not connected to Zerodha.</p>
          <button onClick={handleConnectClick}>
            Connect to Zerodha
          </button>
        </>
      )}
    </div>
  );
}

export default ConnectZerodha;