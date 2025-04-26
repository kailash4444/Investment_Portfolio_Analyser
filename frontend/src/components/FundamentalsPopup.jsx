import React, { useState, useEffect } from 'react';
import { fetchStockFundamentals } from '../services/api'; // Import API function

// --- Helper Formatting Functions ---
const formatLargeNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (Math.abs(num) >= 1e12) {
        return (num / 1e12).toFixed(2) + ' T'; // Trillion
    } else if (Math.abs(num) >= 1e9) {
        return (num / 1e9).toFixed(2) + ' B'; // Billion
    } else if (Math.abs(num) >= 1e6) {
        return (num / 1e6).toFixed(2) + ' M'; // Million
    } else if (typeof num === 'number') { // Check if it's a number before toLocaleString
        return num.toLocaleString(); // Add commas for smaller numbers
    } else {
        return String(num); // Fallback to string conversion
    }
};

const formatPercent = (num) => {
     if (num === null || num === undefined) return 'N/A';
     return (num * 100).toFixed(2) + '%';
}

const formatDateFromEpoch = (epochSeconds) => {
    if (!epochSeconds) return 'N/A';
    try {
         const date = new Date(epochSeconds * 1000);
         // Check if date is valid before formatting
         return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    } catch (e) {
         return 'Invalid Date';
    }
}
// ---------------------------------


const FundamentalsPopup = ({ stock, isOpen, onClose }) => {
  console.log(`FundamentalsPopup: Render/Update - isOpen=${isOpen}, stock=`, JSON.stringify(stock)); // Log received props
  // ... rest of the component ...
  const [fundamentalsData, setFundamentalsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Log prop changes for debugging ---
  useEffect(() => {
    console.log(`Console 1 FundamentalsPopup: isOpen changed to ${isOpen}, stock:`, stock);
  }, [isOpen, stock]);
  // ------------------------------------


  useEffect(() => {
    // Only fetch if modal is open AND stock object is provided
    if (isOpen && stock && stock.exchange && (stock.tradingsymbol)) {
      const loadFundamentals = async () => {
        setIsLoading(true);
        setError(null);
        setFundamentalsData(null); // Clear previous data
        console.log(`fetch Stock Fundamental FundamentalsPopup: Fetching for ${stock.exchange}:${stock.tradingsymbol}`);
        try {
          const response = await fetchStockFundamentals(stock.exchange, stock.tradingsymbol);
          // Check the response structure carefully
          if (response && response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
             console.log("FundamentalsPopup: Data received:", response.data);
            setFundamentalsData(response.data);
          } else {
            console.warn("FundamentalsPopup: Invalid or empty data received:", response.data);
            // Don't throw error here, just show 'No data available' message later
             setFundamentalsData(null); // Ensure it's null if data is bad
          }
        } catch (err) {
          console.error("FundamentalsPopup: Error fetching fundamentals:", err);
          setError(err.response?.data?.detail || err.message || "Failed to load fundamentals data.");
          setFundamentalsData(null); // Clear data on error
        } finally {
          setIsLoading(false);
        }
      };
      loadFundamentals();
    } else {
      // Reset state only if the modal is explicitly closed
      if (!isOpen) {
        setFundamentalsData(null);
        setError(null);
      }
    }
  }, [isOpen, stock]); // Dependency array includes stock

  // --- Crucial: Render null if not open ---
  if (!isOpen) {
    return null;
  }
  // --------------------------------------

  // Helper component to render each fundamental item nicely
  // Moved outside the main return for slightly better organization
  const FundamentalItem = ({ label, value }) => (
    // Only render if value is not null or undefined
    value !== null && value !== undefined ? (
        <div style={styles.item}>
            <span style={styles.label}>{label}:</span>
            {/* Render value directly if it's already a JSX element (like the link) */}
            {React.isValidElement(value) ?
                 <span style={styles.value}>{value}</span> :
                 <span style={styles.value}>{String(value)}</span>
            }
        </div>
    ) : null
  );


  // --- Render the visible modal ---
  return (
    <div style={styles.modalOverlay} onClick={onClose}> {/* Optional: Close on overlay click */}
      {/* Prevent clicks inside the content from closing */}
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Ensure Close button is always rendered inside the content */}
        <button onClick={onClose} style={styles.closeButton} aria-label="Close fundamentals popup">×</button>

        {/* Title - Use data if available, fallback to stock symbol */}
        <h2>{fundamentalsData?.longName || stock?.tradingsymbol || 'Stock'} Fundamentals</h2>

        {/* Content Area */}
        <div style={styles.contentContainer}>
          {isLoading && <p>Loading fundamentals...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          {/* Check specifically for fundamentalsData being null or empty */}
          {!isLoading && !error && !fundamentalsData && (
              <p>No fundamental data available for this stock.</p>
          )}
          {!isLoading && !error && fundamentalsData && (
            // Use definition list (dl) for key-value pairs
            <dl style={styles.list}>
                <FundamentalItem label="Symbol" value={fundamentalsData.symbol} />
                <FundamentalItem label="Currency" value={fundamentalsData.currency} />
                <FundamentalItem label="Sector" value={fundamentalsData.sector} />
                <FundamentalItem label="Industry" value={fundamentalsData.industry} />
                <FundamentalItem label="Market Cap" value={formatLargeNumber(fundamentalsData.marketCap)} />
                <FundamentalItem label="Avg. Volume" value={fundamentalsData.averageVolume?.toLocaleString()} />
                <FundamentalItem label="P/E Ratio (TTM)" value={fundamentalsData.trailingPE?.toFixed(2)} />
                <FundamentalItem label="Forward P/E" value={fundamentalsData.forwardPE?.toFixed(2)} />
                <FundamentalItem label="EPS (TTM)" value={fundamentalsData.trailingEps?.toFixed(2)} />
                <FundamentalItem label="Forward EPS" value={fundamentalsData.forwardEps?.toFixed(2)} />
                <FundamentalItem label="Dividend Yield" value={formatPercent(fundamentalsData.dividendYield)} />
                <FundamentalItem label="Ex-Dividend Date" value={formatDateFromEpoch(fundamentalsData.exDividendDate)} />
                <FundamentalItem label="Beta" value={fundamentalsData.beta?.toFixed(2)} />
                <FundamentalItem label="52 Week High" value={fundamentalsData.fiftyTwoWeekHigh?.toFixed(2)} />
                <FundamentalItem label="52 Week Low" value={fundamentalsData.fiftyTwoWeekLow?.toFixed(2)} />
                <FundamentalItem label="Analyst Recommendation" value={fundamentalsData.recommendationKey?.toUpperCase()} />
                {fundamentalsData.website && (
                     <FundamentalItem label="Website" value={<a href={fundamentalsData.website} target="_blank" rel="noopener noreferrer">{fundamentalsData.website}</a>} />
                )}
                {/* Add more items here if needed, checking if keys exist */}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Essential Inline Styles ---
// Ensure these styles provide visibility and proper layout
const styles = {
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1060, // Make sure it's on top
        opacity: 1,
        visibility: 'visible',
        transition: 'opacity 0.2s ease-in-out', // Optional fade
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '8px',
        maxWidth: '550px', // Adjusted size
        width: '90%',
        maxHeight: '85vh', // Allow a bit more height
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        overflow: 'hidden', // Hide overflow here
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '15px',
        background: 'none',
        border: 'none',
        fontSize: '1.8em',
        lineHeight: '1',
        cursor: 'pointer',
        color: '#666',
        padding: '0',
        zIndex: 10, // Ensure button is above content
    },
    contentContainer: {
        marginTop: '15px',
        flexGrow: 1, // Take available space
        overflowY: 'auto', // Scroll content within this container
        paddingRight: '10px', // Space for scrollbar
        minHeight: '150px',
    },
    list: {
        margin: 0,
        padding: 0,
    },
    item: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '7px 0', // Slightly more padding
        borderBottom: '1px solid #eee',
        fontSize: '0.95em',
    },
    label: {
        fontWeight: '600',
        color: '#555',
        marginRight: '15px', // More space
        whiteSpace: 'nowrap',
        flexShrink: 0, // Prevent label from shrinking
    },
    value: {
        textAlign: 'right',
        color: '#333',
        wordBreak: 'break-word',
        marginLeft: '10px', // Ensure space from label
    },
};


export default FundamentalsPopup;