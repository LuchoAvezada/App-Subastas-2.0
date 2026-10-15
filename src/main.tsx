import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IconContext } from '@phosphor-icons/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Peso global de íconos (design system). size se repite porque un value parcial pierde el default '1em' */}
    <IconContext.Provider value={{ size: '1em', weight: 'bold' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
)
