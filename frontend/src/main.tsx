import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css';
import './styles/normalize.css';
import './styles/index.css'
// Side-effect import: applies the persisted theme to <html> before the
// first paint, so there's no flash of the wrong theme on load.
import './store/useThemeStore';
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
