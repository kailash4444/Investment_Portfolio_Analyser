import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8000', // Base URL for backend
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


// --- Stock News Function (Placeholder - Adjust URL/params as needed) ---
export const fetchStockNews = (stockName) => {
    // Example: Assuming backend expects /api/v1/news/{stock_name}
    const encodedStockName = encodeURIComponent(stockName);
    // return apiClient.get(`/api/v1/news/${encodedStockName}`);
    console.warn("fetchStockNews called - ensure backend endpoint exists and matches.");
    return Promise.resolve({ data: `News functionality for ${stockName} not fully implemented yet.` }); // Placeholder response
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

export default apiClient; // Optional default export