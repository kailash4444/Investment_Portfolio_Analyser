import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// Import the function to fetch portfolio data from your API service file
import { fetchPortfolio } from '../services/api';
import HistoryChartPopup from '../components/HistoryChartPopup'; // Import the modal component

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const [error, setError] = useState(null);

  // --- State for Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null); // Stock to show in modal

  useEffect(() => {
    // Define an async function inside useEffect to fetch the data
    const loadPortfolio = async () => {
      try {
        console.log('Dashboard: Setting loading true, clearing error.');
        setIsLoading(true); // Set loading before fetch
        setError(null); // Clear previous errors

        console.log('Dashboard: Calling fetchPortfolio...');
        const response = await fetchPortfolio(); // Actually call the API function

        // Check if response and response.data exist and if it's an array
        if (response && Array.isArray(response.data)) {
          console.log('Dashboard: Portfolio data received:', response.data);
          setPortfolio(response.data); // Store the fetched array in state
        } else {
           console.warn('Dashboard: Received non-array or invalid data:', response);
           setPortfolio([]); // Set empty array if data is not as expected
           // Optionally set an error message here if needed
           // setError("Received invalid portfolio data format from server.");
        }

      } catch (err) {
        console.error("Dashboard: Error fetching portfolio:", err);
        // Set a user-friendly error message based on the error received
        if (err.response && err.response.status === 401) {
          setError("Authentication error. Your Zerodha session might have expired. Please reconnect.");
          setPortfolio([]); // Clear potentially stale data on auth error
        } else if (err.message.includes('Network Error')) {
             setError("Network Error: Could not connect to the backend server. Is it running?");
        } else {
          // Use error message from backend if available, otherwise generic message
          setError(err.response?.data?.detail || err.message || "Failed to load portfolio data. Please try again later.");
        }
      } finally {
        console.log('Dashboard: Setting loading false.');
        setIsLoading(false); // Set loading to false after fetch attempt (success or fail)
      }
    };

    loadPortfolio(); // Execute the fetch function when component mounts

    // Cleanup function (optional) - runs when component unmounts
    return () => {
        console.log("Dashboard: Component unmounting");
        // You could cancel ongoing requests here if needed
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  // --- Handlers for Modal ---
  const handleHistoryClick = (stock) => {
    console.log("Dashboard: Opening history for:", stock);
    setSelectedStock(stock); // Set the stock data for the modal
    setIsModalOpen(true);   // Open the modal
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);  // Close the modal
    setSelectedStock(null); // Clear the selected stock
  };


  // --- Conditional Rendering Logic ---

  // 1. Show Loading State
  if (isLoading) {
    return (
        <div>
            <h1>Dashboard</h1>
            <p>Loading your portfolio...</p>
        </div>
    );
  }

  // 2. Show Error State (if loading is finished and error exists)
  if (error) {
    return (
        <div>
            <h1>Dashboard</h1>
            <p style={{ color: 'red' }}>Error: {error}</p>
            {/* Show reconnect button specifically for auth errors */}
            {error.includes("Authentication error") && (
                <Link to="/connect">
                    <button>Reconnect to Zerodha</button>
                </Link>
            )}
            {/* You could add a general retry button here too */}
        </div>
    );
  }

  // 3. Show Empty Portfolio State (if loading finished, no error, but portfolio is empty)
  if (!isLoading && !error && portfolio.length === 0) {
      return (
          <div>
              <h1>Dashboard</h1>
              <p>Your portfolio is currently empty or data could not be loaded correctly.</p>
              {/* Optionally add a refresh button or link */}
          </div>
      );
  }

  // 4. Render the table (if loading finished, no error, and portfolio has data)
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Here is your current portfolio overview:</p>

      {/* Table only renders if all conditions are met */}
      <table style={styles.table}>
          <thead>
          <tr>
              {/* Add all the headers */}
              <th style={styles.th}>Symbol</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Avg. Price</th>
              <th style={styles.th}>Invested</th>
              <th style={styles.th}>LTP</th>
              <th style={styles.th}>Current Value</th>
              <th style={styles.th}>P&L</th>
              <th style={styles.th}>Actions</th>
          </tr>
          </thead>
          <tbody>
          {portfolio.map((stock) => (
              <tr key={stock.instrument_token} style={styles.tr}>
                  {/* Fill in all the data cells */}
                  <td style={styles.td}>{stock.tradingsymbol} ({stock.exchange})</td>
                  <td style={styles.td}>{stock.quantity ?? 'N/A'}</td> {/* Use nullish coalescing for safety */}
                  <td style={styles.td}>₹{stock.average_price?.toFixed(2) ?? 'N/A'}</td>
                  <td style={styles.td}>₹{stock.invested_amount?.toFixed(2) ?? 'N/A'}</td>
                  <td style={styles.td}>{stock.last_price ? `₹${stock.last_price.toFixed(2)}` : 'N/A'}</td> {/* Check if last_price exists */}
                  <td style={styles.td}>₹{stock.current_value?.toFixed(2) ?? 'N/A'}</td>
                  <td style={{ ...styles.td, color: (stock.pnl ?? 0) >= 0 ? 'green' : 'red' }}>
                      {stock.pnl != null ? `₹${stock.pnl.toFixed(2)}` : 'N/A' } {/* Check for null/undefined specifically */}
                  </td>
                  <td style={styles.td}>
                      <button style={styles.button} onClick={() => handleHistoryClick(stock)}>
                        History
                      </button>
                      <button style={styles.button} onClick={() => alert(`News for ${stock.tradingsymbol} (coming soon!)`)}>
                        News
                      </button>
                  </td>
              </tr>
          ))}
          </tbody>
      </table>

      {/* Render the Modal (outside the conditional rendering block for the table,
          so it can still be controlled even if the table isn't visible temporarily) */}
      <HistoryChartPopup
        stock={selectedStock}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

    </div>
  );
};

// --- Basic inline styles ---
const styles = {
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
        fontSize: '0.9em',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', // Subtle shadow
    },
    th: {
        borderBottom: '2px solid #ddd',
        padding: '12px 10px', // Slightly more padding
        textAlign: 'left',
        backgroundColor: '#f8f9fa', // Lighter grey
        fontWeight: '600', // Bolder font
        color: '#495057', // Darker text
        whiteSpace: 'nowrap', // Prevent header text wrapping
    },
    tr: {
        borderBottom: '1px solid #eee',
        '&:hover': { // This doesn't work with inline styles, needs CSS module or styled-components for hover
             backgroundColor: '#f1f1f1'
        }
    },
    td: {
        padding: '12px 10px', // Match header padding
        textAlign: 'left',
        verticalAlign: 'middle', // Align vertically center
    },
    button: {
        marginLeft: '5px',
        padding: '5px 10px', // Slightly larger buttons
        fontSize: '0.85em',
        cursor: 'pointer',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        backgroundColor: '#e9ecef',
        color: '#495057',
        transition: 'background-color 0.2s ease', // Smooth transition
        '&:hover': { // Hover effect needs CSS module/styled-components
            backgroundColor: '#dee2e6'
        }
    }
};


export default Dashboard;