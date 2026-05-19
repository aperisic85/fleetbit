import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import CharterApp from './CharterApp.tsx'
import AtonApp from './AtonApp.tsx'
import { ThemeProvider } from './ThemeContext.tsx'
import { AuthProvider } from './AuthContext.tsx'

const appMode = import.meta.env.VITE_APP_MODE ?? 'charter';
const AppComponent = appMode === 'aton' ? AtonApp : CharterApp;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppComponent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
