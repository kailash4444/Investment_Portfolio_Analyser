import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { Link } from 'react-router-dom';

// Import API functions
import {
    fetchPortfolio,
    fetchManualPortfolio,
    deleteManualHolding
} from '../services/api';

// Import Modal components
import HistoryChartPopup from '../components/HistoryChartPopup';
import NewsPopup from '../components/NewsPopup';
import FundamentalsPopup from '../components/FundamentalsPopup';
import ManualHoldingForm from '../components/ManualHoldingForm';

const REFRESH_INTERVAL_MS = 5000; // 5 seconds

const Dashboard = () => {
  // --- State Variables ---
  const [inrPortfolio, setInrPortfolio] = useState([]);
  const [isInrLoading, setIsInrLoading] = useState(true);
  const [inrError, setInrError] = useState(null);
  const [usdPortfolio, setUsdPortfolio] = useState([]);
  const [isUsdLoading, setIsUsdLoading] = useState(true); // Loading for initial USD fetch
  const [isUsdRefreshing, setIsUsdRefreshing] = useState(false); // Separate state for background refresh indicator (optional)
  const [usdError, setUsdError] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStockForHistory, setSelectedStockForHistory] = useState(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [selectedStockForNews, setSelectedStockForNews] = useState(null);
  const [isFundamentalsModalOpen, setIsFundamentalsModalOpen] = useState(false);
  const [selectedStockForFundamentals, setSelectedStockForFundamentals] = useState(null);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);

  // --- Refs for managing intervals/timeouts and initial load ---
  const usdRefreshTimeoutRef = useRef(null); // Stores the timeout ID
  const isInitialUsdLoad = useRef(true); // Tracks if it's the first USD load

  // --- Data Fetching Logic ---

  // Fetch INR Portfolio (remains the same)
  const loadInrPortfolio = useCallback(async () => {
    console.log("Dashboard: Fetching INR portfolio...");
    setIsInrLoading(true); setInrError(null);
    try { /* ... INR fetch logic ... */
        const response = await fetchPortfolio(); if (response && Array.isArray(response.data)) { setInrPortfolio(response.data); } else { setInrPortfolio([]); }
    } catch (err) { /* ... INR error handling ... */
        console.error("Dashboard: Error fetching INR portfolio:", err); const errorMsg = err.response?.data?.detail || err.message || "Failed to load INR portfolio."; setInrError(errorMsg); if (err.response && err.response.status === 401) { setInrError("Zerodha authentication error. Please reconnect."); } setInrPortfolio([]);
    } finally { setIsInrLoading(false); }
  }, []);

  // Fetch USD Portfolio (Modified for Auto-Refresh)
  const loadUsdPortfolio = useCallback(async (isManualRefresh = false) => {
    console.log("Dashboard: Fetching USD portfolio...", isManualRefresh ? "(Manual Refresh)" : isInitialUsdLoad.current ? "(Initial Load)" : "(Auto Refresh)");

    // Show main loader only on initial load or if manually triggered
    if (isInitialUsdLoad.current || isManualRefresh) {
        setIsUsdLoading(true);
    } else {
        setIsUsdRefreshing(true); // Indicate background refresh (optional)
    }
    // Clear errors on fetch attempt? Maybe only if not a background refresh?
    // Let's clear errors only on initial/manual load for now.
    if (isInitialUsdLoad.current || isManualRefresh) {
       setUsdError(null);
    }

    // Clear any existing scheduled timeout before starting a new fetch
    if (usdRefreshTimeoutRef.current) {
      clearTimeout(usdRefreshTimeoutRef.current);
      usdRefreshTimeoutRef.current = null; // Clear the ref
      console.log("Dashboard: Cleared pending USD refresh timeout.");
    }

    try {
      const response = await fetchManualPortfolio();
      if (response && Array.isArray(response.data)) {
        console.log('Dashboard: USD Portfolio data received:', response.data);
        setUsdPortfolio(response.data);
         // Clear error specifically on successful fetch
         if (!isInitialUsdLoad.current && !isManualRefresh) {
             setUsdError(null); // Clear previous errors if background refresh succeeds
         }
      } else {
        console.warn('Dashboard: Received non-array or invalid USD data:', response);
        setUsdPortfolio([]); // Set empty if data invalid
      }
    } catch (err) {
      console.error("Dashboard: Error fetching USD portfolio:", err);
      // Set error state regardless of refresh type for visibility
      setUsdError(err.response?.data?.detail || err.message || "Failed to load manual USD portfolio.");
      setUsdPortfolio([]); // Clear potentially stale data on error
    } finally {
      // Turn off loading indicators
      if (isInitialUsdLoad.current || isManualRefresh) {
        setIsUsdLoading(false);
        if (isInitialUsdLoad.current) {
            isInitialUsdLoad.current = false; // Mark initial load done
        }
      } else {
        setIsUsdRefreshing(false); // Turn off background refresh indicator
      }

      // Schedule the *next* refresh using setTimeout
      console.log(`Dashboard: Scheduling next USD refresh in ${REFRESH_INTERVAL_MS}ms`);
      usdRefreshTimeoutRef.current = setTimeout(() => loadUsdPortfolio(false), REFRESH_INTERVAL_MS); // Call recursively, indicating it's not manual
    }
  }, []); // Keep dependencies empty as it schedules itself

  // Load both portfolios on mount & Setup Cleanup
  useEffect(() => {
    console.log("Dashboard: Component mounted. Initial load effect running.");
    loadInrPortfolio();
    loadUsdPortfolio(true); // Start the first load (mark as manual/initial)

    // --- Cleanup Function ---
    // This runs when the component unmounts
    return () => {
      console.log("Dashboard: Component unmounting. Clearing USD refresh timeout.");
      if (usdRefreshTimeoutRef.current) {
        clearTimeout(usdRefreshTimeoutRef.current); // Clear the scheduled timeout
      }
    };
  }, [loadInrPortfolio, loadUsdPortfolio]); // Depend on the memoized functions




  // --- Modal Open/Close Handlers ---

  // Generic function to open a modal and set the selected stock
  const openModal = (modalSetter, stockSetter, dataForModal, sourceDescription = "stock") => {
    if (!dataForModal && sourceDescription !== "ManualFormAdd") {
        console.error(`Dashboard: Attempted to open modal (${sourceDescription}) with invalid data:`, dataForModal);
        alert(`Cannot open modal: Invalid ${sourceDescription} data provided.`);
        return;
    }
    console.log(`Dashboard: Opening modal (${sourceDescription}) for:`, dataForModal);
    stockSetter(dataForModal);
    modalSetter(true);
  };

  // Specific handlers for different actions
  const handleHistoryClick = (stock) => {
    if (stock && (stock.tradingsymbol) && (stock.exchange || stock.exchange === '' || stock.exchange === null)) {
        const stockWithExchange = { ...stock, exchange: stock.exchange || 'US' };
        openModal(setIsHistoryModalOpen, setSelectedStockForHistory, stockWithExchange, 'History');
    } else { console.error("Invalid stock passed to handleHistoryClick:", stock); alert("Cannot open history: Invalid stock data."); }
  };
  const handleCloseHistoryModal = () => { setIsHistoryModalOpen(false); setSelectedStockForHistory(null); };

  const handleNewsClick = (stock) => {
    const nameOrSymbol = stock.tradingsymbol ;
    if (nameOrSymbol) { openModal(setIsNewsModalOpen, setSelectedStockForNews, nameOrSymbol, 'News'); }
    else { console.error("Invalid stock passed to handleNewsClick:", stock); alert("Cannot open news: Invalid stock data."); }
  };
  const handleCloseNewsModal = () => { setIsNewsModalOpen(false); setSelectedStockForNews(null); };

  const handleFundamentalsClick = (stock) => {
     if (stock && ( stock.tradingsymbol) && (stock.exchange || stock.exchange === '' || stock.exchange === null)) {
        const stockWithExchange = { ...stock, exchange: stock.exchange || 'US' };
        openModal(setIsFundamentalsModalOpen, setSelectedStockForFundamentals, stockWithExchange, 'Fundamentals');
     } else { console.error("Invalid stock passed to handleFundamentalsClick:", stock); alert("Cannot open fundamentals: Invalid stock data."); }
  };
  const handleCloseFundamentalsModal = () => { setIsFundamentalsModalOpen(false); setSelectedStockForFundamentals(null); };

  // Manual Form Add/Edit Handlers
  const handleOpenManualForm = (holdingToEdit = null) => {
    setEditingHolding(holdingToEdit);
    openModal(setIsManualFormOpen, setEditingHolding, holdingToEdit, holdingToEdit ? "ManualFormEdit" : "ManualFormAdd");
  };
  const handleCloseManualForm = () => {
    setIsManualFormOpen(false);
    setEditingHolding(null);
  };
  // Callback after successful Add/Edit in form
  const handleManualHoldingAddedOrUpdated = () => {
    console.log("Dashboard: Manual holding added or updated, refreshing USD portfolio.");
    loadUsdPortfolio();
  };

  // Delete Manual Holding Handler
  const handleDeleteManualHolding = async (holdingId, holdingSymbol) => {
      if (window.confirm(`Are you sure you want to delete the manual holding for ${holdingSymbol} (ID: ${holdingId})? This action cannot be undone.`)) {
          try {
              console.log(`Dashboard: Deleting manual holding ID ${holdingId} (${holdingSymbol})`);
              await deleteManualHolding(holdingId);
              console.log(`Dashboard: Manual holding ID ${holdingId} deleted successfully.`);
              loadUsdPortfolio(); // Refresh the list
          } catch (err) {
               console.error(`Dashboard: Error deleting manual holding ID ${holdingId} (${holdingSymbol}):`, err);
               alert(`Failed to delete holding ${holdingSymbol}: ${err.response?.data?.detail || err.message}`);
          }
      }
  };


  // --- Calculate Portfolio Totals ---
  const calculateTotals = (portfolio, investedKey, currentKey) => {
      return portfolio.reduce(
          (acc, stock) => {
              const invested = typeof stock[investedKey] === 'number' ? stock[investedKey] : 0;
              const current = typeof stock[currentKey] === 'number' ? stock[currentKey] : 0;
              acc.totalInvested += invested;
              acc.totalCurrent += current;
              return acc;
          },
          { totalInvested: 0, totalCurrent: 0 }
      );
  };

  const inrTotals = !isInrLoading && !inrError && inrPortfolio.length > 0
      ? calculateTotals(inrPortfolio, 'invested_amount', 'current_value')
      : { totalInvested: 0, totalCurrent: 0 };

  const usdTotals = !isUsdLoading && !usdError && usdPortfolio.length > 0
      ? calculateTotals(usdPortfolio, 'invested_amount_usd', 'current_value_usd')
      : { totalInvested: 0, totalCurrent: 0 };

  const overallInrPnl = inrTotals.totalCurrent - inrTotals.totalInvested;
  const overallUsdPnl = usdTotals.totalCurrent - usdTotals.totalInvested;


  // --- Render Helper Functions for Tables ---

  const renderInrPortfolio = () => {
      if (isInrLoading) return <p>Loading Zerodha portfolio...</p>;
      if (inrError) return <p style={{ color: 'red' }}>INR Portfolio Error: {inrError} {inrError.includes("Zerodha auth") && <Link to="/connect"><button style={styles.button}>Reconnect</button></Link>}</p>;
      if (inrPortfolio.length === 0) return <p>Your Zerodha (INR) portfolio is empty.</p>;

      return (
          <table style={styles.table}>
              <thead><tr>
                  <th style={styles.th}>Symbol</th> <th style={styles.th}>Quantity</th> <th style={styles.th}>Avg. Price (₹)</th>
                  <th style={styles.th}>Invested (₹)</th> <th style={styles.th}>LTP (₹)</th> <th style={styles.th}>Current (₹)</th>
                  <th style={styles.th}>P&L (₹)</th> <th style={styles.th}>Actions</th>
              </tr></thead>
              <tbody>
                  {inrPortfolio.map((stock) => (
                      <tr key={stock.instrument_token} style={styles.tr}>
                          <td style={styles.td}>{stock.tradingsymbol} ({stock.exchange})</td>
                          <td style={styles.td}>{stock.quantity ?? 'N/A'}</td>
                          <td style={styles.td}>₹{stock.average_price?.toFixed(2) ?? 'N/A'}</td>
                          <td style={styles.td}>₹{stock.invested_amount?.toFixed(2) ?? 'N/A'}</td>
                          <td style={styles.td}>{stock.last_price != null ? `₹${stock.last_price.toFixed(2)}` : 'N/A'}</td>
                          <td style={styles.td}>₹{stock.current_value?.toFixed(2) ?? 'N/A'}</td>
                          <td style={{ ...styles.td, color: (stock.pnl ?? 0) >= 0 ? 'green' : 'red' }}>{stock.pnl != null ? `₹${stock.pnl.toFixed(2)}` : 'N/A' }</td>
                          <td style={styles.td}>
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

      return (
           <table style={styles.table}>
              <thead><tr>
                  <th style={styles.th}>Symbol</th> <th style={styles.th}>Quantity</th> <th style={styles.th}>Avg. Price ($)</th>
                  <th style={styles.th}>Invested ($)</th> <th style={styles.th}>LTP ($)</th> <th style={styles.th}>Current ($)</th>
                  <th style={styles.th}>P&L ($)</th> <th style={styles.th}>Actions</th>
              </tr></thead>
              <tbody>
                  {usdPortfolio.map((stock) => { // stock is ManualHoldingDetails format
                      const displayExchange = stock.exchange || 'US'; // For display
                      const actionStock = { ...stock, exchange: stock.exchange || 'US' }; // For actions

                      return (
                          <tr key={stock.id} style={styles.tr}>
                              <td style={styles.td}>{stock.tradingsymbol} ({displayExchange})</td>
                              <td style={styles.td}>{stock.quantity ?? 'N/A'}</td>
                              <td style={styles.td}>${stock.average_price_usd?.toFixed(2) ?? 'N/A'}</td>
                              <td style={styles.td}>${stock.invested_amount_usd?.toFixed(2) ?? 'N/A'}</td>
                              <td style={styles.td}>{stock.last_price_usd != null ? `$${stock.last_price_usd.toFixed(2)}` : 'N/A'}</td>
                              <td style={styles.td}>{stock.current_value_usd != null ? `$${stock.current_value_usd.toFixed(2)}` : 'N/A'}</td>
                              <td style={{ ...styles.td, color: (stock.pnl_usd ?? 0) >= 0 ? 'green' : 'red' }}>
                                  {stock.pnl_usd != null ? `$${stock.pnl_usd.toFixed(2)}` : 'N/A' }
                              </td>
                              <td style={styles.td}>
                                  <button style={styles.button} title={`View history for ${stock.tradingsymbol}`} onClick={() => handleHistoryClick(actionStock)}>History</button>
                                  <button style={styles.button} title={`Get news for ${stock.tradingsymbol}`} onClick={() => handleNewsClick(actionStock)}>News</button>
                                  <button style={styles.button} title={`View fundamentals for ${stock.tradingsymbol}`} onClick={() => handleFundamentalsClick(actionStock)}>Fundamentals</button>
                                  <button
                                      style={{...styles.button, backgroundColor: '#ffc107', color: '#212529'}} // Edit button style
                                      title={`Edit ${stock.tradingsymbol} holding`}
                                      onClick={() => handleOpenManualForm(stock)}> {/* Pass original stock to edit */}
                                          Edit
                                  </button>
                                  <button
                                      style={{...styles.button, backgroundColor: '#dc3545', color: 'white'}} // Delete button style
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
    <div style={{ paddingBottom: '50px' }}>
      <h1>Dashboard</h1>

      {/* --- Zerodha (INR) Portfolio Section --- */}
      <section style={styles.section}>
          <h2>Zerodha Portfolio (INR)</h2>
          {/* --- INR Totals Display --- */}
          {!isInrLoading && !inrError && inrPortfolio.length > 0 && (
              <div style={styles.totalsContainer}>
                  <span>Total Invested: <strong style={styles.totalValue}>₹{inrTotals.totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></span>
                  <span>Total Current: <strong style={styles.totalValue}>₹{inrTotals.totalCurrent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></span>
                  <span>Overall P&L: <strong style={{ color: overallInrPnl >= 0 ? 'green' : 'red' }}>₹{overallInrPnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></span>
              </div>
          )}
          {renderInrPortfolio()}
      </section>

      <hr style={styles.hr} />

      {/* --- Manual (USD) Portfolio Section --- */}
      <section style={styles.section}>
          <div style={styles.sectionHeader}>
              <h2>Manual Portfolio (USD)</h2>
              {/* Button to open the ADD form */}
              <button style={styles.button} onClick={() => handleOpenManualForm()}>+ Add Manual Holding</button>
          </div>
           {/* --- USD Totals Display --- */}
           {!isUsdLoading && !usdError && usdPortfolio.length > 0 && (
              <div style={styles.totalsContainer}>
                  <span>Total Invested: <strong style={styles.totalValue}>${usdTotals.totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></span>
                  <span>Total Current: <strong style={styles.totalValue}>${usdTotals.totalCurrent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></span>
                  <span>Overall P&L: <strong style={{ color: overallUsdPnl >= 0 ? 'green' : 'red' }}>${overallUsdPnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></span>
              </div>
          )}
          {renderUsdPortfolio()}
      </section>


      {/* --- Render All Modals --- */}
      {/* They are controlled by their respective isOpen state variables */}
      {/* Pass the appropriate state and handlers to each modal */}
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
        stock={selectedStockForFundamentals}
        isOpen={isFundamentalsModalOpen}
        onClose={handleCloseFundamentalsModal}
      />
      <ManualHoldingForm
        isOpen={isManualFormOpen}
        onClose={handleCloseManualForm}
        onHoldingAdded={handleManualHoldingAddedOrUpdated} // Renamed callback for clarity
        holdingToEdit={editingHolding} // Pass the holding object (or null) for Add/Edit mode
      />

    </div>
  );
};

// --- Basic inline styles ---
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
    },
    td: {
        padding: '12px 10px',
        textAlign: 'left',
        verticalAlign: 'middle',
    },
    button: {
        marginLeft: '5px',
        marginRight: '5px',
        marginBottom: '5px',
        padding: '5px 10px',
        fontSize: '0.85em',
        cursor: 'pointer',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        backgroundColor: '#e9ecef',
        color: '#495057',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
    },
    totalsContainer: {
        padding: '10px 15px',
        marginBottom: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '5px',
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: '15px',
        fontSize: '0.95em'
    },
    totalValue: {
        fontWeight: 'bold',
        color: '#212529'
    }
};

export default Dashboard;