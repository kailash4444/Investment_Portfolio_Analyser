import React, { useState, useEffect } from 'react';
// Import both add and update API functions
import { addManualHolding, updateManualHolding } from '../services/api';

// Accept holdingToEdit prop (which contains 'symbol' for manual holdings,
// but we might internally use 'tradingsymbol' state if needed, then map back)
const ManualHoldingForm = ({ isOpen, onClose, onHoldingAdded, holdingToEdit }) => {
  // --- State for form fields using 'tradingsymbol' internally ---
  const [tradingsymbol, setTradingsymbol] = useState(''); // Using tradingsymbol state
  const [exchange, setExchange] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  // State for submission status and errors
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if we are in edit mode
  const isEditMode = Boolean(holdingToEdit);

  // --- Effect to pre-populate form when editing or reset when adding ---
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && holdingToEdit) {
        // Edit Mode: Populate form from holdingToEdit prop
        console.log("ManualHoldingForm: Populating form for edit:", holdingToEdit);
        // Access 'symbol' from holdingToEdit, set 'tradingsymbol' state
        setTradingsymbol(holdingToEdit.tradingsymbol || ''); // Use symbol from prop
        setExchange(holdingToEdit.exchange || '');
        setQuantity(String(holdingToEdit.quantity || ''));
        setAvgPrice(String(holdingToEdit.average_price_usd || ''));
        setError('');
      } else {
        // Add Mode: Reset form fields
        console.log("ManualHoldingForm: Resetting form for add.");
        setTradingsymbol(''); // Reset state
        setExchange('');
        setQuantity('');
        setAvgPrice('');
        setError('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, holdingToEdit, isEditMode]);

  // --- Form Submission Logic ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validation (using 'tradingsymbol' state)
    if (!tradingsymbol || !quantity || !avgPrice) {
        setError('Trading Symbol, Quantity, and Average Price are required.');
        setIsSubmitting(false); return;
    }
    const numQuantity = parseFloat(quantity);
    const numAvgPrice = parseFloat(avgPrice);
    if (isNaN(numQuantity) || numQuantity <= 0 || isNaN(numAvgPrice) || numAvgPrice <= 0) {
        setError('Quantity and Average Price must be positive numbers.');
        setIsSubmitting(false); return;
    }

    // Prepare data common to add/update
    const commonData = {
        quantity: numQuantity,
        average_price_usd: numAvgPrice,
        exchange: exchange.toUpperCase().trim() || null,
    };

    try {
      if (isEditMode) {
        // Call Update API
        console.log(`ManualHoldingForm: Updating holding ID ${holdingToEdit.id} with:`, commonData);
        await updateManualHolding(holdingToEdit.id, commonData);
        console.log(`ManualHoldingForm: Holding ID ${holdingToEdit.id} updated successfully.`);
      } else {
        // Call Add API
        const holdingData = {
          ...commonData,
          // Map internal 'tradingsymbol' state to 'symbol' key for backend API
          tradingsymbol: tradingsymbol.toUpperCase().trim(),
        };
        console.log("ManualHoldingForm: Submitting new holding:", holdingData);
        await addManualHolding(holdingData);
        console.log("ManualHoldingForm: New holding added successfully.");
      }
      onHoldingAdded(); // Refresh dashboard list
      onClose(); // Close modal

    } catch (err) {
      console.error(`ManualHoldingForm: Error ${isEditMode ? 'updating' : 'adding'} holding:`, err);
      setError(err.response?.data?.detail || err.message || `Failed to ${isEditMode ? 'update' : 'add'} holding.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Conditional Render: Exit if not open ---
  if (!isOpen) {
    return null;
  }

  // --- Render Modal Structure ---
  return (
    // Use styles.modalOverlay here
    <div style={styles.modalOverlay} onClick={onClose}>
      {/* Use styles.modalContent here */}
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Use styles.closeButton here */}
        <button onClick={onClose} style={styles.closeButton} aria-label="Close form">×</button>

        {/* Title depends on mode */}
        <h2>{isEditMode ? `Edit Manual Holding (${holdingToEdit?.tradingsymbol})` : 'Add Manual USD Holding'}</h2>

        <form onSubmit={handleSubmit}>
          {/* Use styles.errorText */}
          {error && <p style={styles.errorText}>{error}</p>}

          {/* Form Groups using styles.formGroup */}
          <div style={styles.formGroup}>
            {/* Use styles.label */}
            <label htmlFor="tradingsymbol" style={styles.label}>Trading Symbol (US Ticker):</label>
            <input
              type="text"
              id="tradingsymbol"
              name="tradingsymbol"
              value={tradingsymbol}
              required
              // Combine input style with disabled style if editing
              style={isEditMode ? {...styles.input, ...styles.inputDisabled} : styles.input}
              onChange={(e) => setTradingsymbol(e.target.value)}
              placeholder="e.g., AAPL, GOOGL"
              readOnly={isEditMode}
              autoFocus={!isEditMode}
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
              autoFocus={isEditMode}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="avgPrice" style={styles.label}>Average Price (USD):</label>
            <input
              type="number" id="avgPrice" value={avgPrice} required step="any" min="0" style={styles.input}
              onChange={(e) => setAvgPrice(e.target.value)} placeholder="e.g., 175.50"
            />
          </div>

          {/* Submit button using styles.submitButton and styles.buttonDisabled */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={isSubmitting ? {...styles.submitButton, ...styles.buttonDisabled} : styles.submitButton}
          >
            {isSubmitting ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Holding' : 'Add Holding')}
          </button>
        </form>
      </div>
    </div>
  );
};


// --- Styles Object Definition (THIS WAS MISSING) ---
const styles = {
    modalOverlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1070,
        opacity: 1, visibility: 'visible',
    },
    modalContent: {
        backgroundColor: '#fff', padding: '30px', borderRadius: '8px',
        maxWidth: '500px', width: '90%', position: 'relative',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxHeight: '90vh',
        overflowY: 'auto',
    },
    closeButton: {
        position: 'absolute', top: '10px', right: '15px', background: 'none',
        border: 'none', fontSize: '1.8em', lineHeight: '1',
        cursor: 'pointer', color: '#666', padding: '0',
    },
    formGroup: {
        marginBottom: '18px',
    },
    label: {
        display: 'block', marginBottom: '6px', fontWeight: '500',
        fontSize: '0.95em', color: '#333',
    },
    input: {
        width: '100%', padding: '10px', border: '1px solid #ccc',
        borderRadius: '4px', boxSizing: 'border-box', fontSize: '1em',
    },
    inputDisabled: { // Style for read-only input
        backgroundColor: '#e9ecef',
        cursor: 'not-allowed',
    },
    submitButton: {
        padding: '12px 18px', backgroundColor: '#007bff', color: 'white',
        border: 'none', borderRadius: '4px', cursor: 'pointer',
        fontSize: '1.05em', width: '100%', marginTop: '10px',
        transition: 'background-color 0.2s ease',
    },
    buttonDisabled: { // Style for disabled button
        backgroundColor: '#aaa',
        cursor: 'not-allowed',
    },
    errorText: {
        color: '#dc3545', marginBottom: '15px', fontSize: '0.9em',
        fontWeight: '500', border: '1px solid #f5c6cb', padding: '8px',
        borderRadius: '4px', backgroundColor: '#f8d7da',
    },
};
// --- End Styles Object ---


export default ManualHoldingForm;