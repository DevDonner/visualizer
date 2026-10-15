import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SortLab from './lab/index.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SortLab />
  </StrictMode>,
)
