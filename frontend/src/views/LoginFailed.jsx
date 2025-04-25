import React from 'react';
import { Link, useLocation } from 'react-router-dom';
const LoginFailed = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const reason = queryParams.get('reason') || 'Unknown error';
    return (
        <div>
            <h1>Zerodha Login Failed</h1>
            <p style={{ color: 'red' }}>Reason: {reason.replace(/_/g, ' ')}</p>
            <Link to="/connect">Try connecting again</Link>
        </div>
    );
};
export default LoginFailed;