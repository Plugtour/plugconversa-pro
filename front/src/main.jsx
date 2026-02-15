// caminho: front/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './theme/tokens.css'
import './theme/globals.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// fim: front/src/main.jsx
