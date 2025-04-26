import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8002', // Base URL for backend
    headers: {
      'Content-Type': 'application/json',
  },
    // withCredentials: true, // May need later if using secure cookies
});

// --- Portfolio Function ---
export const fetchPortfolio = () => apiClient.get('/api/v1/portfolio/');

// --- Stock History Function (Updated) ---
/**
 * Fetches historical stock data for a given symbol, exchange, and period.
 * @param {string} exchange - The stock exchange (e.g., 'NSE', 'BSE')
 * @param {string} symbol - The stock trading symbol (e.g., 'INFY', 'RELIANCE')
 * @param {string} [period='1y'] - The time period (e.g., '1d', '5d', '1mo', '1y', 'max')
 * @returns {Promise<AxiosResponse<any>>} Promise resolving with the API response
 */
export const fetchStockHistory = (exchange, symbol, period = '1y') => {
  // Ensure parameters are strings and encode them for URL safety
  const encodedExchange = encodeURIComponent(String(exchange));
  const encodedSymbol = encodeURIComponent(String(symbol));

  // Construct the path part of the URL
  const path = `/api/v1/history/${encodedExchange}/${encodedSymbol}`;

  console.log(`API Call: Fetching history for ${path} with period ${period}`); // Debug log

  // Make the GET request with the period as a query parameter
  return apiClient.get(path, {
    params: {
        period: period // Axios automatically handles query string formatting
    }
  });
};


// --- Stock News Function ---
/**
 * Fetches summarized news for a given stock name.
 * @param {string} stockName - The name of the stock (e.g., 'Reliance Industries', 'Infosys')
 * @returns {Promise<AxiosResponse<any>>} Promise resolving with API response (expects { summary: "..." })
 */
export const fetchStockNews = (stockName) => {
  const encodedStockName = encodeURIComponent(stockName);
  console.log(`API Call: Fetching news for ${encodedStockName}`);
  return apiClient.get(`/api/v1/news/${encodedStockName}`);
};


// --- Auth Functions ---

// Function to initiate login by redirecting the browser
export const redirectToZerodhaLogin = () => {
  // Redirect directly to the backend login endpoint
  window.location.href = `${apiClient.defaults.baseURL}/auth/zerodha/login`;
};

// Function to check backend connection status
export const checkAuthStatus = () => apiClient.get('/auth/zerodha/status');

// --- Axios Interceptor for 401 Errors ---
apiClient.interceptors.response.use(
  response => response, // Pass through successful responses
  error => {
    if (error.response && error.response.status === 401) {
      console.warn("Received 401 Unauthorized from backend.");
      // Option 1: Redirect (uncomment if desired)
      // window.location.href = '/connect';

      // Option 2: Alert (current implementation)
      // Avoid multiple alerts if many API calls fail quickly
      if (!window.location.pathname.includes('/connect')) { // Simple check to avoid alert on connect page
        alert("Your Zerodha connection has expired or is invalid. Please go to Connect/Settings to reconnect.");
      }
    }
    // Important: Reject the promise so calling code (.catch blocks) can handle the error
    return Promise.reject(error);
  }
);

export const fetchStockFundamentals = (exchange, symbol) => {
  const encodedExchange = encodeURIComponent(String(exchange));
  const encodedSymbol = encodeURIComponent(String(symbol));
  const path = `/api/v1/fundamentals/${encodedExchange}/${encodedSymbol}`;
  console.log(`API Call: Fetching fundamentals for ${path}`);
  return apiClient.get(path);
};

export const fetchManualPortfolio = () => apiClient.get('/api/v1/manual_portfolio/');

/**
 * Adds a new manual USD holding.
 * @param {object} holdingData - Object with symbol, quantity, average_price_usd, exchange (optional)
 */
export const addManualHolding = (holdingData) => apiClient.post('/api/v1/manual_portfolio/', holdingData);

/**
 * Deletes a manual USD holding by its ID.
 * @param {number} holdingId - The ID of the holding to delete.
 */
export const deleteManualHolding = (holdingId) => apiClient.delete(`/api/v1/manual_portfolio/${holdingId}`);

export default apiClient; // Optional default export