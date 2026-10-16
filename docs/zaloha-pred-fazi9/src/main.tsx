import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CharacterProvider } from './state/store';
import { DiceProvider } from './ui/Dice';
import { installTexture } from './theme/texture';
import './theme/tokens.css';
import './theme/sheet.css';
import './theme/wizard.css';
import './theme/app.css';
import './theme/boj.css';
import './theme/alchymie.css';
import './theme/valecnik.css';
import './theme/pratele.css';
import './theme/zaloha.css';

installTexture();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterProvider>
      <DiceProvider>
        <App />
      </DiceProvider>
    </CharacterProvider>
  </StrictMode>,
);
