import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'; // Ensure BrowserRouter is imported
import App from './App.jsx'
import './index.css' // Basic CSS import

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* App needs to be inside BrowserRouter */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

