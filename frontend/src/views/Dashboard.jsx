import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Import API functions
import {
    fetchPortfolio,         // Fetches Zerodha INR portfolio
    fetchManualPortfolio,   // Fetches Manual USD portfolio with calculated values
    deleteManualHolding     // Deletes a manual holding
} from '../services/api';

// Import Modal components
import HistoryChartPopup from '../components/HistoryChartPopup';
import NewsPopup from '../components/NewsPopup';
import FundamentalsPopup from '../components/FundamentalsPopup';
import ManualHoldingForm from '../components/ManualHoldingForm'; // For adding manual holdings

const Dashboard = () => {
  // --- State Variables ---

  // INR Portfolio (Zerodha) State
  const [inrPortfolio, setInrPortfolio] = useState([]);
  const [isInrLoading, setIsInrLoading] = useState(true);
  const [inrError, setInrError] = useState(null);

  // USD Portfolio (Manual) State
  const [usdPortfolio, setUsdPortfolio] = useState([]);
  const [isUsdLoading, setIsUsdLoading] = useState(true);
  const [usdError, setUsdError] = useState(null);

  // Modal States (Shared for INR and USD actions)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStockForHistory, setSelectedStockForHistory] = useState(null); // Holds INR or USD stock object

  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [selectedStockForNews, setSelectedStockForNews] = useState(null); // Holds INR or USD stock symbol/name

  const [isFundamentalsModalOpen, setIsFundamentalsModalOpen] = useState(false);
  const [selectedStockForFundamentals, setSelectedStockForFundamentals] = useState(null); // Holds INR or USD stock object

  const [isManualFormOpen, setIsManualFormOpen] = useState(false); // State for manual add form modal

  // --- Data Fetching Logic ---

  // Fetch INR Portfolio (using useCallback for stable reference)
  const loadInrPortfolio = useCallback(async () => {
    console.log("Dashboard: Fetching INR portfolio...");
    setIsInrLoading(true);
    setInrError(null);
    try {
      const response = await fetchPortfolio();
      if (response && Array.isArray(response.data)) {
        console.log('Dashboard: INR Portfolio data received:', response.data);
        setInrPortfolio(response.data);
      } else {
        console.warn('Dashboard: Received non-array or invalid INR data:', response);
        setInrPortfolio([]);
      }
    } catch (err) {
      console.error("Dashboard: Error fetching INR portfolio:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to load INR portfolio.";
      setInrError(errorMsg);
      // Specific handling for auth errors
      if (err.response && err.response.status === 401) {
        setInrError("Zerodha authentication error. Please reconnect.");
      }
      setInrPortfolio([]); // Clear data on error
    } finally {
      setIsInrLoading(false);
    }
  }, []); // Empty dependency array ensures it's created once

  // Fetch USD Portfolio (using useCallback for stable reference)
  const loadUsdPortfolio = useCallback(async () => {
    console.log("Dashboard: Fetching USD portfolio...");
    setIsUsdLoading(true);
    setUsdError(null);
    try {
      // This API call now returns holdings with calculated LTP/Value/PnL
      const response = await fetchManualPortfolio();
      if (response && Array.isArray(response.data)) {
        console.log('Dashboard: USD Portfolio data received:', response.data);
        setUsdPortfolio(response.data);
      } else {
        console.warn('Dashboard: Received non-array or invalid USD data:', response);
        setUsdPortfolio([]);
      }
    } catch (err) {
      console.error("Dashboard: Error fetching USD portfolio:", err);
      setUsdError(err.response?.data?.detail || err.message || "Failed to load manual USD portfolio.");
      setUsdPortfolio([]); // Clear data on error
    } finally {
      setIsUsdLoading(false);
    }
  }, []); // Empty dependency array

  // Load both portfolios when the component mounts
  useEffect(() => {
    console.log("Dashboard: Component mounted. Initial load effect running.");
    loadInrPortfolio();
    loadUsdPortfolio();
  }, [loadInrPortfolio, loadUsdPortfolio]); // Depend on the memoized fetch functions


  // --- Modal Open/Close Handlers ---

  // Generic function to open a modal and set the selected stock
  // `modalSetter` is the setIs...ModalOpen function
  // `stockSetter` is the setSelectedStockFor... function
  // `dataForModal` is the specific data the modal needs (stock object or symbol)
  const openModal = (modalSetter, stockSetter, dataForModal, sourceDescription = "stock") => {
    // Basic validation to ensure we have something to show
    if (!dataForModal) {
        console.error(`Dashboard: Attempted to open modal (${sourceDescription}) with invalid data:`, dataForModal);
        alert(`Cannot open modal: Invalid ${sourceDescription} data provided.`);
        return;
    }
    console.log(`Dashboard: Opening modal (${sourceDescription}) for:`, dataForModal);
    stockSetter(dataForModal); // Set the data needed by the modal
    modalSetter(true); // Open the modal
  };

  // Specific handlers using the generic function or custom logic
  const handleHistoryClick = (stock) => { // Needs stock object
    // Check if essential fields exist
    if (stock && (stock.tradingsymbol) && (stock.exchange || stock.exchange === '')) {
        // Ensure exchange is at least an empty string if not provided (for USD stocks primarily)
        const stockWithExchange = { ...stock, exchange: stock.exchange || 'US' };
        openModal(setIsHistoryModalOpen, setSelectedStockForHistory, stockWithExchange, 'History');
    } else {
        console.error("Invalid stock object passed to handleHistoryClick:", stock);
        alert("Cannot open history: Missing symbol or exchange.");
    }
  };
  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedStockForHistory(null);
  };

  const handleNewsClick = (stock) => { // Needs symbol or tradingsymbol
    const nameOrSymbol = stock.tradingsymbol; // Use tradingsymbol if available, else symbol
    if (nameOrSymbol) {
        openModal(setIsNewsModalOpen, setSelectedStockForNews, nameOrSymbol, 'News');
    } else {
        console.error("Invalid stock object passed to handleNewsClick (missing symbol/tradingsymbol):", stock);
        alert("Cannot open news: Invalid stock data.");
    }
  };
  const handleCloseNewsModal = () => {
    setIsNewsModalOpen(false);
    setSelectedStockForNews(null);
  };

const handleFundamentalsClick = (stock) => {
    console.log("Dashboard: Opening fundamentals for (raw stock object):", JSON.stringify(stock)); // Log the object
    if (stock && (stock.symbol || stock.tradingsymbol)) { // Basic check
        const stockWithExchange = { ...stock, exchange: stock.exchange || 'US' };
        console.log("Dashboard: Passing stockWithExchange to modal:", JSON.stringify(stockWithExchange));
        openModal(setIsFundamentalsModalOpen, setSelectedStockForFundamentals, stockWithExchange, 'Fundamentals');
    } else {
       console.error("Invalid stock object passed to handleFundamentalsClick:", stock);
       alert("Cannot open fundamentals: Invalid stock data.");
    }
 };
  const handleCloseFundamentalsModal = () => {
    setIsFundamentalsModalOpen(false);
    setSelectedStockForFundamentals(null);
  };

  // Manual Form Handlers
  const handleOpenManualForm = () => setIsManualFormOpen(true);
  const handleCloseManualForm = () => setIsManualFormOpen(false);
  // This is called by the form component upon successful submission
  const handleManualHoldingAdded = () => {
    console.log("Dashboard: Manual holding added, refreshing USD portfolio.");
    loadUsdPortfolio(); // Refresh the USD portfolio list
  };

  // --- Delete Manual Holding Handler ---
  const handleDeleteManualHolding = async (holdingId, holdingSymbol) => {
      // Use symbol in confirmation message
      if (window.confirm(`Are you sure you want to delete the manual holding for ${holdingSymbol} (ID: ${holdingId})? This action cannot be undone.`)) {
          try {
              console.log(`Dashboard: Deleting manual holding ID ${holdingId} (${holdingSymbol})`);
              await deleteManualHolding(holdingId);
              console.log(`Dashboard: Manual holding ID ${holdingId} deleted successfully.`);
              // Refresh the list after deletion
              loadUsdPortfolio();
          } catch (err) {
               console.error(`Dashboard: Error deleting manual holding ID ${holdingId} (${holdingSymbol}):`, err);
               // Display error to user
               alert(`Failed to delete holding ${holdingSymbol}: ${err.response?.data?.detail || err.message}`);
          }
      }
  };


  // --- Render Helper Functions for Tables ---

  const renderInrPortfolio = () => {
      if (isInrLoading) return <p>Loading Zerodha portfolio...</p>;
      if (inrError) return <p style={{ color: 'red' }}>INR Portfolio Error: {inrError} {inrError.includes("Zerodha auth") && <Link to="/connect"><button style={styles.button}>Reconnect</button></Link>}</p>;
      if (inrPortfolio.length === 0) return <p>Your Zerodha (INR) portfolio is empty.</p>;

      // INR Table JSX
      return (
          <table style={styles.table}>
              <thead><tr>
                  <th style={styles.th}>Symbol</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Avg. Price (₹)</th>
                  <th style={styles.th}>Invested (₹)</th>
                  <th style={styles.th}>LTP (₹)</th>
                  <th style={styles.th}>Current (₹)</th>
                  <th style={styles.th}>P&L (₹)</th>
                  <th style={styles.th}>Actions</th>
              </tr></thead>
              <tbody>
                  {inrPortfolio.map((stock) => ( // stock here is INR format
                      <tr key={stock.instrument_token} style={styles.tr}>
                          <td style={styles.td}>{stock.tradingsymbol} ({stock.exchange})</td>
                          <td style={styles.td}>{stock.quantity ?? 'N/A'}</td>
                          <td style={styles.td}>₹{stock.average_price?.toFixed(2) ?? 'N/A'}</td>
                          <td style={styles.td}>₹{stock.invested_amount?.toFixed(2) ?? 'N/A'}</td>
                          <td style={styles.td}>{stock.last_price != null ? `₹${stock.last_price.toFixed(2)}` : 'N/A'}</td>
                          <td style={styles.td}>₹{stock.current_value?.toFixed(2) ?? 'N/A'}</td>
                          <td style={{ ...styles.td, color: (stock.pnl ?? 0) >= 0 ? 'green' : 'red' }}>{stock.pnl != null ? `₹${stock.pnl.toFixed(2)}` : 'N/A' }</td>
                          <td style={styles.td}>
                              {/* Pass the INR stock object to handlers */}
                              <button style={styles.button} title={`View history for ${stock.tradingsymbol}`} onClick={() => handleHistoryClick(stock)}>History</button>
                              <button style={styles.button} title={`Get news for ${stock.tradingsymbol}`} onClick={() => handleNewsClick(stock)}>News</button>
                              <button style={styles.button} title={`View fundamentals for ${stock.tradingsymbol}`} onClick={() => handleFundamentalsClick(stock)}>Fundamentals</button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      );
  };

  const renderUsdPortfolio = () => {
      if (isUsdLoading) return <p>Loading manual USD portfolio...</p>;
      if (usdError) return <p style={{ color: 'red' }}>USD Portfolio Error: {usdError}</p>;
      if (usdPortfolio.length === 0) return <p>Your manual (USD) portfolio is empty. Click '+ Add Manual Holding' to add one.</p>;

      // USD Table JSX (displays calculated data fetched from backend)
      return (
           <table style={styles.table}>
              <thead><tr>
                  <th style={styles.th}>Symbol</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Avg. Price ($)</th>
                  <th style={styles.th}>Invested ($)</th>
                  <th style={styles.th}>LTP ($)</th>
                  <th style={styles.th}>Current ($)</th>
                  <th style={styles.th}>P&L ($)</th>
                  <th style={styles.th}>Actions</th>
              </tr></thead>
              <tbody>
                  {usdPortfolio.map((stock) => { // stock here is ManualHoldingDetails format
                      // Prepare a stock object compatible with modal handlers
                      // Default exchange to 'US' if missing, for yfinance calls
                      const actionStock = {
                          ...stock,
                          exchange: "" || 'US' // Use 'US' as default/placeholder
                      };

                      return (
                          <tr key={stock.id} style={styles.tr}> {/* Use manual ID as key */}
                              <td style={styles.td}>{stock.tradingsymbol} ({actionStock.exchange})</td>
                              <td style={styles.td}>{stock.quantity ?? 'N/A'}</td>
                              <td style={styles.td}>${stock.average_price_usd?.toFixed(2) ?? 'N/A'}</td>
                              <td style={styles.td}>${stock.invested_amount_usd?.toFixed(2) ?? 'N/A'}</td>
                              <td style={styles.td}>{stock.last_price_usd != null ? `$${stock.last_price_usd.toFixed(2)}` : 'N/A'}</td>
                              <td style={styles.td}>{stock.current_value_usd != null ? `$${stock.current_value_usd.toFixed(2)}` : 'N/A'}</td>
                              <td style={{ ...styles.td, color: (stock.pnl_usd ?? 0) >= 0 ? 'green' : 'red' }}>
                                  {stock.pnl_usd != null ? `$${stock.pnl_usd.toFixed(2)}` : 'N/A' }
                              </td>
                              <td style={styles.td}>
                                  {/* Pass the manual stock object (actionStock) to handlers */}
                                  <button style={styles.button} title={`View history for ${stock.tradingsymbol}`} onClick={() => handleHistoryClick(actionStock)}>History</button>
                                  <button style={styles.button} title={`Get news for ${stock.tradingsymbol}`} onClick={() => handleNewsClick(actionStock)}>News</button>
                                  <button style={styles.button} title={`View fundamentals for ${stock.tradingsymbol}`} onClick={() => handleFundamentalsClick(actionStock)}>Fundamentals</button>
                                  {/* Pass symbol to delete handler for confirmation message */}
                                  <button
                                      style={{...styles.button, backgroundColor: '#dc3545', color: 'white'}}
                                      title={`Delete ${stock.tradingsymbol} holding`}
                                      onClick={() => handleDeleteManualHolding(stock.id, stock.tradingsymbol)}>
                                          Delete
                                  </button>
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
      );
  };


  // --- Main Render Function ---
  return (
    <div style={{ paddingBottom: '50px' }}> {/* Add padding at bottom for floating elements */}
      <h1>Dashboard</h1>

      {/* --- Zerodha (INR) Portfolio Section --- */}
      <section style={styles.section}>
          <h2>Zerodha Portfolio (INR)</h2>
          {renderInrPortfolio()}
      </section>

      <hr style={styles.hr} />

      {/* --- Manual (USD) Portfolio Section --- */}
      <section style={styles.section}>
          <div style={styles.sectionHeader}>
              <h2>Manual Portfolio (USD)</h2>
              <button style={styles.button} onClick={handleOpenManualForm}>+ Add Manual Holding</button>
          </div>
          {renderUsdPortfolio()}
      </section>


      {/* --- Render All Modals --- */}
      {/* They are controlled by their respective isOpen state variables */}
      <HistoryChartPopup
        stock={selectedStockForHistory} // Pass the selected stock object (INR or USD)
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
      />
      <NewsPopup
        stockName={selectedStockForNews} // Pass the selected stock name/symbol
        isOpen={isNewsModalOpen}
        onClose={handleCloseNewsModal}
      />
      <FundamentalsPopup
        stock={selectedStockForFundamentals} // Pass the selected stock object (INR or USD)
        isOpen={isFundamentalsModalOpen}
        onClose={handleCloseFundamentalsModal}
      />
      <ManualHoldingForm
        isOpen={isManualFormOpen}
        onClose={handleCloseManualForm}
        onHoldingAdded={handleManualHoldingAdded} // Pass the refresh callback
      />

    </div>
  );
};

// --- Basic inline styles ---
// Consider moving these to a separate CSS/CSS-in-JS solution for larger projects
const styles = {
    section: {
        marginBottom: '40px',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '5px',
        borderBottom: '1px solid #eee',
    },
    hr: {
        margin: '30px 0',
        border: 0,
        borderTop: '1px solid #eee'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
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
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        // Hover styles require CSS Modules or similar
        // '&:hover': { backgroundColor: '#dee2e6', borderColor: '#adb5bd' }
    }
};

export default Dashboard;