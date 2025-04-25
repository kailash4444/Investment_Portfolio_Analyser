import React, { useState, useEffect } from 'react';
import { fetchStockNews } from '../services/api'; // Import API function

const NewsPopup = ({ stockName, isOpen, onClose }) => {
  const [newsSummary, setNewsSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Log prop changes for debugging ---
  useEffect(() => {
    console.log(`NewsPopup: isOpen changed to ${isOpen}, stockName: ${stockName}`);
  }, [isOpen, stockName]);
  // ------------------------------------

  useEffect(() => {
    // Fetch data only if the modal is intended to be open and stockName is provided
    if (isOpen && stockName) {
      const loadNews = async () => {
        setIsLoading(true);
        setError(null);
        setNewsSummary(''); // Clear previous summary
        console.log(`NewsPopup: Fetching news summary for ${stockName}`);
        try {
          const response = await fetchStockNews(stockName);
          if (response && response.data && typeof response.data.summary === 'string') { // Verify summary is a string
            console.log("NewsPopup: News summary received:", response.data.summary);
            setNewsSummary(response.data.summary);
          } else {
            console.error("NewsPopup: Invalid data format received:", response.data);
            throw new Error("Invalid data format received from news API.");
          }
        } catch (err) {
          console.error("NewsPopup: Error fetching stock news:", err);
          setError(err.response?.data?.detail || err.message || "Failed to load news summary.");
        } finally {
          setIsLoading(false);
        }
      };
      loadNews();
    } else {
      // Reset state if modal is closed or no stockName
      // Do NOT reset isLoading here if you want loading state to persist until fetch completes
      // Only clear data/error when explicitly closed or stock changes while closed
      if (!isOpen) {
        setNewsSummary('');
        setError(null);
        // Don't necessarily set isLoading false here, let the fetch complete/error out
      }
    }
  }, [isOpen, stockName]); // Re-fetch when modal opens or stockName changes

  // --- Crucial: Conditional Rendering based on isOpen ---
  // If the modal is not supposed to be open, render nothing.
  if (!isOpen) {
    return null;
  }
  // ------------------------------------------------------


  // Simple function to format the summary (e.g., add paragraphs for newlines)
  const formatSummary = (text) => {
    // Replace multiple newlines with a single break, then split
    return text.replace(/(\r\n|\n|\r){2,}/g, '\n').split('\n').map((paragraph, index) => (
        // Filter out empty paragraphs that might result from splitting
        paragraph.trim() ? <p key={index} style={{ marginBottom: '1em', lineHeight: '1.5' }}>{paragraph.trim()}</p> : null
    ));
  };


  // --- Render the visible modal ---
  return (
    // Ensure the overlay div is returned when isOpen is true
    <div style={styles.modalOverlay} onClick={onClose}> {/* Optional: Close on overlay click */}
      {/* Prevent clicks inside the content from closing the modal */}
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeButton} aria-label="Close news popup">×</button>
        <h2>Recent News Summary for {stockName || 'Selected Stock'}</h2>

        <div style={styles.newsContainer}>
          {isLoading && <p>Loading news summary...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          {!isLoading && !error && newsSummary && (
            <div>{formatSummary(newsSummary)}</div>
          )}
           {/* Show message if not loading, no error, but summary is empty */}
           {!isLoading && !error && !newsSummary && (
              <p>No news summary available or fetch failed.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Essential Inline Styles (Make sure these are present and correct) ---
const styles = {
    modalOverlay: {
        position: 'fixed', // Crucial for overlay
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050, // Ensure it's on top (higher than history maybe?)
        opacity: 1, // Make sure not transparent
        visibility: 'visible', // Make sure visible
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '8px',
        maxWidth: '650px', // Adjust size as needed
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'hidden', // Hide outer scrollbar, container will scroll
        position: 'relative',
        display: 'flex', // Use flexbox for layout
        flexDirection: 'column', // Stack title, content vertically
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)', // Add shadow
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '15px',
        background: 'none',
        border: 'none',
        fontSize: '1.8em',
        lineHeight: '1', // Prevent extra spacing
        cursor: 'pointer',
        color: '#666',
        padding: '0' // Remove default padding
    },
    newsContainer: {
        marginTop: '15px',
        flexGrow: 1, // Allow container to fill vertical space
        overflowY: 'auto', // Allow scrolling *within* this container
        paddingRight: '10px', // Space for scrollbar
        minHeight: '100px', // Ensure some minimum height
    }
};

export default NewsPopup;