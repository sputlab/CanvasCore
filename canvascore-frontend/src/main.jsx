import './apiClient'
import './ui/global.css'
import './ui/kit.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// The editor never runs inside another page's frame (clickjacking): the server headers forbid it, and this covers
// hosts where they are missing.
if (window.top !== window.self) {
  document.getElementById('root').textContent = 'For your security, the CanvasCore editor can only be opened in its own browser tab.'
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
