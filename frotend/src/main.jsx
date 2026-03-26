import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#161616', color: '#f5f5f5', border: '1px solid #242424' },
          success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
