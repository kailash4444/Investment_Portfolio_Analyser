import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, // x axis
  LinearScale, // y axis
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // IMPORTANT for time series
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Import date adapter
import { fetchStockHistory } from '../services/api'; // Import API function

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale // Register TimeScale
);

// Define the period options
const periodOptions = [
    { value: '1d', label: '1D' },
    { value: '5d', label: '5D' },
    // { value: '1w', label: '1W' }, // yfinance doesn't directly support 1w period well, map to 5d or 1mo maybe
    { value: '1mo', label: '1M' },
    { value: '6mo', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '5y', label: '5Y' },
    { value: 'max', label: 'Max' },
];

const HistoryChartPopup = ({ stock, isOpen, onClose }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('1y'); // Default period
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data only if the modal is open and stock is selected
    if (isOpen && stock) {
      const loadHistory = async () => {
        setIsLoading(true);
        setError(null);
        setChartData(null); // Clear previous data
        console.log(`Fetching history for ${stock.exchange}:${stock.tradingsymbol}, period: ${selectedPeriod}`);
        try {
          const response = await fetchStockHistory(stock.exchange, stock.tradingsymbol, selectedPeriod);
          if (response && response.data && response.data.labels && response.data.data) {
             console.log("History data received:", response.data);
            // Format data for Chart.js
            setChartData({
              labels: response.data.labels, // Expecting timestamps or ISO strings
              datasets: [
                {
                  label: `${stock.tradingsymbol} Price`,
                  data: response.data.data, // Expecting price numbers
                  borderColor: 'rgb(75, 192, 192)',
                  backgroundColor: 'rgba(75, 192, 192, 0.5)',
                  tension: 0.1, // Smooths the line slightly
                  pointRadius: 1, // Adjust point size
                  pointHoverRadius: 5,
                },
              ],
            });
          } else {
              throw new Error("Invalid data format received from history API.");
          }
        } catch (err) {
          console.error("Error fetching stock history:", err);
          setError(err.response?.data?.detail || err.message || "Failed to load history data.");
        } finally {
          setIsLoading(false);
        }
      };
      loadHistory();
    } else {
        // Reset state if modal is closed or no stock selected
        setChartData(null);
        setError(null);
        setIsLoading(false);
    }
  }, [isOpen, stock, selectedPeriod]); // Re-fetch when modal opens, stock changes, or period changes


  if (!isOpen || !stock) {
    return null; // Don't render anything if modal is closed or no stock data
  }

  // Chart.js options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Stock Price History for ${stock.tradingsymbol} (${selectedPeriod.toUpperCase()})`,
      },
      tooltip: {
          mode: 'index',
          intersect: false,
      }
    },
    scales: {
      x: {
        type: 'time', // Use the time scale
        time: {
          // tooltipFormat: 'PPpp', // Display format for tooltip - requires date-fns
          // Adjust display formats based on the time range if needed
           unit: inferTimeUnit(selectedPeriod), // Automatically infer unit based on range
        },
        ticks: {
            maxRotation: 0, // Prevent label rotation if possible
            autoSkip: true, // Automatically skip labels to prevent overlap
            maxTicksLimit: 10 // Limit number of ticks shown
        },
        title: {
            display: true,
            text: 'Date / Time'
        }
      },
      y: {
        beginAtZero: false, // Don't force y-axis to start at 0
        title: {
            display: true,
            text: 'Price (₹)' // Adapt currency if needed
        }
      },
    },
     interaction: { // For better hover performance
        mode: 'nearest',
        axis: 'x',
        intersect: false
    }
  };

  // Helper function to infer the time unit based on selected period
  function inferTimeUnit(period) {
      switch(period) {
          case '1d': return 'minute';
          case '5d': return 'hour';
          case '1mo': return 'day';
          default: return 'day'; // Default to day for longer periods
      }
  }


  return (
    // Basic Modal Structure (use a library like react-modal for better accessibility)
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <button onClick={onClose} style={styles.closeButton}>×</button>
        <h2>{stock.tradingsymbol} History</h2>

        {/* Period Selection Buttons */}
        <div style={styles.periodSelector}>
          {periodOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              style={selectedPeriod === option.value ? styles.buttonActive : styles.button}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Chart Area */}
        <div style={styles.chartContainer}>
          {isLoading && <p>Loading chart data...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          {!isLoading && !error && chartData && (
            <Line options={chartOptions} data={chartData} />
          )}
           {!isLoading && !error && !chartData && (
              <p>No data available for the selected period.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Basic Inline Styles (Replace with CSS Modules or Tailwind later)
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
        zIndex: 1000, // Ensure it's on top
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '8px',
        maxWidth: '800px', // Limit width
        width: '90%', // Responsive width
        maxHeight: '80vh', // Limit height
        overflowY: 'auto', // Allow scrolling if content exceeds height
        position: 'relative', // For positioning close button
        display: 'flex',
        flexDirection: 'column' // Stack elements vertically
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '15px',
        background: 'none',
        border: 'none',
        fontSize: '1.8em',
        cursor: 'pointer',
        color: '#666'
    },
    periodSelector: {
        marginBottom: '15px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px',
    },
     button: {
        padding: '5px 10px',
        fontSize: '0.9em',
        cursor: 'pointer',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: '#f0f0f0'
    },
     buttonActive: {
        padding: '5px 10px',
        fontSize: '0.9em',
        cursor: 'pointer',
        border: '1px solid #007bff',
        borderRadius: '4px',
        backgroundColor: '#007bff',
        color: 'white',
         fontWeight: 'bold'
    },
    chartContainer: {
        flexGrow: 1, // Allow chart container to fill space
        position: 'relative', // Needed for chart responsiveness
        minHeight: '400px' // Ensure a minimum height for the chart
    }
};

export default HistoryChartPopup;