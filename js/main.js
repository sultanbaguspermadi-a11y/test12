// Application entry point.
import { TICK_MS } from './config.js';
import { S } from './state.js';
import { buildDom, chooseMode } from './ui.js';
import { tick, newGame } from './game.js';
import { initInput } from './input.js';
import { initThemes } from './themes.js';
import { initHistoryToggle } from './histview.js';
import { showCover } from './cover.js';
import { initDims } from './dims.js';
import { initLayout } from './layout.js';
import { initWordCheck } from './wordcheck.js';

function start() {
  initThemes();
  initDims();
  initHistoryToggle();
  initLayout();
  initWordCheck();
  buildDom();
  initInput();
  setInterval(tick, TICK_MS);
  newGame();
  S.paused = true;       // clock stays frozen until the setup flow finishes
  showCover(chooseMode);   // cover first; "Play" opens mode selection, then duration
}

start();
