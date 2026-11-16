import { createRoot } from 'react-dom/client';
import 'lenis/dist/lenis.css';
import App from './App.tsx';
import { ScrollRoot } from './components/ScrollRoot.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ScrollRoot>
    <App />
  </ScrollRoot>
);
