import React, { useState } from 'react';
import { addManualHolding } from '../services/api';

const ManualHoldingForm = ({ isOpen, onClose, onHoldingAdded }) => {
  const [tradingsymbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState(''); // Optional field
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(''); // Clear previous errors
    setIsSubmitting(true);

    // Basic Validation
    if (!tradingsymbol || !quantity || !avgPrice) {
      setError('tradingsymbol, Quantity, and Average Price are required.');
      setIsSubmitting(false);
      return;
    }
    const numQuantity = parseFloat(quantity);
    const numAvgPrice = parseFloat(avgPrice);
    if (isNaN(numQuantity) || numQuantity <= 0 || isNaN(numAvgPrice) || numAvgPrice <= 0) {
      setError('Quantity and Average Price must be positive numbers.');
      setIsSubmitting(false);
      return;
    }

    const holdingData = {
      tradingsymbol: tradingsymbol.toUpperCase().trim(), // Standardize symbol
      exchange: exchange.toUpperCase().trim() || null, // Send null if empty
      quantity: numQuantity,
      average_price_usd: numAvgPrice,
    };

    try {
      console.log("Submitting manual holding:", holdingData);
      await addManualHolding(holdingData);
      console.log("Manual holding added successfully.");
      // Reset form
      setSymbol('');
      setExchange('');
      setQuantity('');
      setAvgPrice('');
      onHoldingAdded(); // Notify parent (Dashboard) to refresh data
      onClose(); // Close the modal
    } catch (err) {
      console.error("Error adding manual holding:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to add holding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeButton} aria-label="Close form">×</button>
        <h2>Add Manual USD Holding</h2>
        <form onSubmit={handleSubmit}>
          {error && <p style={styles.errorText}>{error}</p>}
          <div style={styles.formGroup}>
            <label htmlFor="symbol" style={styles.label}>tradingsymbol (US Ticker):</label>
            <input
              type="text" id="symbol" value={tradingsymbol} required style={styles.input}
              onChange={(e) => setSymbol(e.target.value)} placeholder="e.g., AAPL, GOOGL"
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="exchange" style={styles.label}>Exchange (Optional):</label>
            <input
              type="text" id="exchange" value={exchange} style={styles.input}
              onChange={(e) => setExchange(e.target.value)} placeholder="e.g., NASDAQ, NYSE"
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="quantity" style={styles.label}>Quantity:</label>
            <input
              type="number" id="quantity" value={quantity} required step="any" min="0" style={styles.input}
              onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 10.5"
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="avgPrice" style={styles.label}>Average Price (USD):</label>
            <input
              type="number" id="avgPrice" value={avgPrice} required step="any" min="0" style={styles.input}
              onChange={(e) => setAvgPrice(e.target.value)} placeholder="e.g., 175.50"
            />
          </div>
          <button type="submit" disabled={isSubmitting} style={styles.submitButton}>
            {isSubmitting ? 'Adding...' : 'Add Holding'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Basic Styles (Adapt from other modals)
const styles = {
    modalOverlay: { /* ... (Same as others, ensure high zIndex) ... */ },
    modalContent: { /* ... (Same as others, adjust size if needed) ... */
        maxWidth: '500px',
    },
    closeButton: { /* ... (Same as others) ... */ },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500' },
    input: { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    submitButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', width: '100%', marginTop: '10px' },
    errorText: { color: 'red', marginBottom: '10px', fontSize: '0.9em' },
    // Add disabled button style if needed
};
// Copy base styles
styles.modalOverlay = { ...styles.modalOverlay, zIndex: 1070 }; // Highest zIndex
styles.modalContent = { ...styles.modalContent };
styles.closeButton = { ...styles.closeButton };


export default ManualHoldingForm;