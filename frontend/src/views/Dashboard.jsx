import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// Import API functions
import { fetchPortfolio } from '../services/api';
// Import Modal components
import HistoryChartPopup from '../components/HistoryChartPopup';
import NewsPopup from '../components/NewsPopup';
import FundamentalsPopup from '../components/FundamentalsPopup';

const Dashboard = () => {
  // --- State Variables ---
  // Portfolio Data
  const [portfolio, setPortfolio] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const [error, setError] = useState(null);

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStockForHistory, setSelectedStockForHistory] = useState(null);

  // News Modal State
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [selectedStockForNews, setSelectedStockForNews] = useState(null); // Holds the stock name/symbol

  // Fundamentals Modal State
  const [isFundamentalsModalOpen, setIsFundamentalsModalOpen] = useState(false);
  const [selectedStockForFundamentals, setSelectedStockForFundamentals] = useState(null); // Holds the stock object

  // --- Fetch Portfolio Data Effect ---
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        console.log('Dashboard: Setting loading true, clearing error.');
        setIsLoading(true); // Set loading before fetch
        setError(null); // Clear previous errors

        console.log('Dashboard: Calling fetchPortfolio...');
        const response = await fetchPortfolio(); // Call the API function

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

  // --- Modal Handler Functions ---
  const handleHistoryClick = (stock) => {
    console.log("Dashboard: Opening history for:", stock);
    setSelectedStockForHistory(stock); // Pass the whole stock object
    setIsHistoryModalOpen(true);
  };
  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedStockForHistory(null);
  };

  const handleNewsClick = (stock) => {
    console.log("Dashboard: Opening news for:", stock.tradingsymbol);
    setSelectedStockForNews(stock.tradingsymbol); // Pass the name/symbol
    setIsNewsModalOpen(true);
  };
  const handleCloseNewsModal = () => {
    setIsNewsModalOpen(false);
    setSelectedStockForNews(null);
  };

  const handleFundamentalsClick = (stock) => {
    console.log("Dashboard: Opening fundamentals for:", stock);
    setSelectedStockForFundamentals(stock); // Pass the whole stock object
    setIsFundamentalsModalOpen(true);
  };
  const handleCloseFundamentalsModal = () => {
    setIsFundamentalsModalOpen(false);
    setSelectedStockForFundamentals(null);
  };


  // --- Conditional Rendering Logic for Page Content ---

  // 1. Loading State
  if (isLoading) {
    return (
        <div>
            <h1>Dashboard</h1>
            <p>Loading your portfolio...</p>
        </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
        <div>
            <h1>Dashboard</h1>
            <p style={{ color: 'red' }}>Error: {error}</p>
            {/* Show reconnect button specifically for auth errors */}
            {error.includes("Authentication error") && (
                <Link to="/connect">
                    {/* Apply styles to the button */}
                    <button style={styles.button}>Reconnect to Zerodha</button>
                </Link>
            )}
            {/* You could add a general retry button here too */}
        </div>
    );
  }

  // 3. Empty Portfolio State (if loading finished, no error, but portfolio is empty)
  if (!isLoading && !error && portfolio.length === 0) {
      return (
          <div>
              <h1>Dashboard</h1>
              <p>Your portfolio is currently empty or data could not be loaded correctly.</p>
              {/* Optionally add a refresh button or link */}
          </div>
      );
  }

  // 4. Render Table and Modals if data loaded successfully
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Here is your current portfolio overview:</p>

      {/* Portfolio Table - Render only if not loading, no error, and portfolio has items */}
      <table style={styles.table}>
          <thead>
          <tr>
              {/* Define all the table headers */}
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
                  {/* Define all the table data cells, with null checks */}
                  <td style={styles.td}>{stock.tradingsymbol} ({stock.exchange})</td>
                  <td style={styles.td}>{stock.quantity ?? 'N/A'}</td>
                  <td style={styles.td}>₹{stock.average_price?.toFixed(2) ?? 'N/A'}</td>
                  <td style={styles.td}>₹{stock.invested_amount?.toFixed(2) ?? 'N/A'}</td>
                  <td style={styles.td}>{stock.last_price != null ? `₹${stock.last_price.toFixed(2)}` : 'N/A'}</td>
                  <td style={styles.td}>₹{stock.current_value?.toFixed(2) ?? 'N/A'}</td>
                  <td style={{ ...styles.td, color: (stock.pnl ?? 0) >= 0 ? 'green' : 'red' }}>
                      {stock.pnl != null ? `₹${stock.pnl.toFixed(2)}` : 'N/A' }
                  </td>
                  <td style={styles.td}>
                      {/* Action Buttons */}
                      <button style={styles.button} onClick={() => handleHistoryClick(stock)}>
                        History
                      </button>
                      <button style={styles.button} onClick={() => handleNewsClick(stock)}>
                        News
                      </button>
                      <button style={styles.button} onClick={() => handleFundamentalsClick(stock)}>
                        Fundamentals
                      </button>
                  </td>
              </tr>
          ))}
          </tbody>
      </table>

      {/* Render Modals (conditionally based on their isOpen state) */}
      {/* These are rendered outside the table's conditional block */}
      <HistoryChartPopup
        stock={selectedStockForHistory}
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
      />
      <NewsPopup
        stockName={selectedStockForNews}
        isOpen={isNewsModalOpen}
        onClose={handleCloseNewsModal}
      />
      <FundamentalsPopup
        stock={selectedStockForFundamentals} // Pass the selected stock object
        isOpen={isFundamentalsModalOpen}
        onClose={handleCloseFundamentalsModal}
      />

    </div>
  );
};

// --- Basic inline styles ---
// Consider moving these to a separate CSS/CSS-in-JS solution for larger projects
const styles = {
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
        fontSize: '0.9em',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    th: {
        borderBottom: '2px solid #ddd',
        padding: '12px 10px',
        textAlign: 'left',
        backgroundColor: '#f8f9fa',
        fontWeight: '600',
        color: '#495057',
        whiteSpace: 'nowrap',
    },
    tr: {
        borderBottom: '1px solid #eee',
        // Hover styles require CSS Modules or similar
        // '&:hover': { backgroundColor: '#f1f1f1' }
    },
    td: {
        padding: '12px 10px',
        textAlign: 'left',
        verticalAlign: 'middle',
    },
    button: {
        marginLeft: '5px',
        marginRight: '5px', // Add some right margin too
        marginBottom: '5px', // Add bottom margin for wrapping on small screens
        padding: '5px 10px',
        fontSize: '0.85em',
        cursor: 'pointer',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        backgroundColor: '#e9ecef',
        color: '#495057',
        transition: 'background-color 0.2s ease',
        // Hover styles require CSS Modules or similar
        // '&:hover': { backgroundColor: '#dee2e6' }
    }
};

export default Dashboard;