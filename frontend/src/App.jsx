import React from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

// --- Import your page/view components ---
// You'll need to create these basic component files if they don't exist yet
import Dashboard from './views/Dashboard'; // Create src/views/Dashboard.jsx
import ConnectZerodha from './components/ConnectZerodha'; // Your existing component
import LoginFailed from './views/LoginFailed'; // Create src/views/LoginFailed.jsx

// Basic Layout (Optional but recommended)
function Layout({ children }) {
    const location = useLocation(); // Get location to show messages

    // Check for query params from backend redirect (optional feedback)
    const queryParams = new URLSearchParams(location.search);
    const status = queryParams.get('status');
    const reason = queryParams.get('reason');

  return (
    <div>
        {status === 'connected' && <p style={{color: 'green', border: '1px solid green', padding: '5px'}}>Successfully connected to Zerodha!</p>}
        {reason && <p style={{color: 'red', border: '1px solid red', padding: '5px'}}>Connection Failed: {reason.replace(/_/g, ' ')}</p>}

      <nav style={{ background: '#eee', padding: '10px', marginBottom: '20px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '15px' }}>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/connect">Connect/Settings</Link></li>
          {/* Add other links */}
        </ul>
      </nav>
      <hr />
      <main style={{ padding: '20px' }}>{children}</main>
    </div>
  );
}

function App() {
  return (
    <Layout>
      <Routes>
        {/* Default route redirects to dashboard */}
        <Route path="/" element={<Navigate replace to="/dashboard" />} />

        {/* Your main application screen */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Route to show the connection component */}
        <Route path="/connect" element={<ConnectZerodha />} />

        {/* Route to show if login via Zerodha failed */}
        <Route path="/login-failed" element={<LoginFailed />} />

        {/* Catch-all for Not Found */}
        <Route path="*" element={<div><h2>404 Page Not Found</h2><Link to="/">Go Home</Link></div>} />
      </Routes>
    </Layout>
  );
}

// --- Create Placeholder Components (Important!) ---
// Create these files or routing will break

// Example: src/views/Dashboard.jsx
// const Dashboard = () => <h1>Dashboard Page (Portfolio will go here)</h1>;

// Example: src/views/LoginFailed.jsx
// const LoginFailed = () => {
//     const location = useLocation();
//     const queryParams = new URLSearchParams(location.search);
//     const reason = queryParams.get('reason');
//     return <h1>Zerodha Login Failed{reason ? `: ${reason.replace(/_/g, ' ')}` : ''}</h1>;
// };

export default App;