import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { instalarManterCursor } from './utils/manterCursor'

// Campos em MAIÚSCULAS: o cursor não pula mais para o fim ao editar no meio do texto (21/11/2026)
instalarManterCursor()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
