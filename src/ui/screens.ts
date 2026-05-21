import { LevelConfig, tierLabel } from '../systems/levels'
import { LeaderboardEntry } from '../systems/leaderboard'
import { LevelResult } from '../systems/casino'

const $ = (id: string) => document.getElementById(id)!


function el(tag: string, cls: string, html = ''): HTMLElement {
  const e = document.createElement(tag)
  e.className = cls
  e.innerHTML = html
  return e
}

// ─── Load playful HUD font ────────────────────────────────────────────────────
const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href = 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap'
document.head.appendChild(fontLink)

// ─── Inject global CSS once ───────────────────────────────────────────────────
const style = document.createElement('style')
style.textContent = `
  :root {
    --gold: #ffd700;
    --neon-purple: #cc00ff;
    --neon-green: #00ff88;
    --neon-pink: #ff0066;
    --bg-dark: rgba(10,0,18,0.92);
    --bg-card: rgba(30,0,60,0.95);
    --font: 'Arial Black', Arial, sans-serif;
  }
  .qs-screen {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: var(--font);
    color: #fff;
    background: var(--bg-dark);
    pointer-events: auto;
  }
  .qs-screen.hidden { display: none; }
  .qs-title {
    font-size: clamp(2.5rem, 7vw, 5rem);
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: linear-gradient(135deg, var(--gold) 0%, #fff 50%, var(--gold) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    text-shadow: none;
    margin-bottom: 0.2em;
  }
  .qs-subtitle {
    font-size: clamp(0.8rem, 2vw, 1.1rem);
    color: var(--neon-purple);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    margin-bottom: 2em;
  }
  .qs-btn {
    display: block; width: 260px; padding: 0.8em 1.5em;
    margin: 0.5em auto; border: none; border-radius: 6px;
    font-family: var(--font); font-size: 1.1rem; font-weight: 900;
    letter-spacing: 0.15em; text-transform: uppercase;
    cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
  }
  .qs-btn:hover { transform: scale(1.04); }
  .qs-btn:active { transform: scale(0.97); }
  .qs-btn-primary {
    background: linear-gradient(135deg, var(--gold), #ffaa00);
    color: #1a0000;
    box-shadow: 0 0 24px rgba(255,215,0,0.5);
  }
  .qs-btn-secondary {
    background: rgba(100,0,200,0.4);
    color: #fff;
    border: 2px solid var(--neon-purple);
    box-shadow: 0 0 12px rgba(200,0,255,0.3);
  }
  .qs-btn-danger {
    background: rgba(180,0,40,0.5);
    color: #fff;
    border: 2px solid var(--neon-pink);
  }
  .qs-card {
    background: var(--bg-card);
    border: 1px solid rgba(200,0,255,0.3);
    border-radius: 12px;
    padding: 3em 4em;
    margin: 0.8em 0;
    min-width: min(600px, 90vw);
    box-shadow: 0 0 30px rgba(100,0,200,0.2);
  }
  .qs-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.35em 0; border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .qs-row:last-child { border-bottom: none; }
  .qs-label { color: rgba(255,255,255,0.5); font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; }
  .qs-value { color: var(--gold); font-size: 1rem; font-weight: 900; }
  .qs-green { color: var(--neon-green); }
  .qs-pink { color: var(--neon-pink); }
  .qs-purple { color: var(--neon-purple); }
  .qs-gold { color: var(--gold); }
  /* HUD */
  #hud {
    --safe: 1.5rem;
    position: absolute; inset: 0;
    pointer-events: none;
    font-family: 'Fredoka One', var(--font);
  }
  #hud.hidden { display: none; }
  #hud-left-panel {
    position: absolute; left: var(--safe); top: var(--safe);
    display: flex; flex-direction: column; justify-content: flex-start; gap: 0.5em;
    padding: 1.4em 1.8em;
    background: rgba(10,0,20,0.82);
    border: 1px solid rgba(200,0,255,0.3);
    border-radius: 10px;
    min-width: 140px;
  }
  .hud-stat { display: flex; flex-direction: column; }
  .hud-stat-label { font-size: 0.65rem; color: rgba(255,255,255,0.4); letter-spacing: 0.2em; text-transform: uppercase; }
  .hud-stat-value { font-family: 'Fredoka One', var(--font); font-size: 2.2rem; font-weight: 900; color: #fff; line-height: 1.1; }
  .hud-progress-bar { width: 100%; height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 0.15em; }
  .hud-progress-fill { height: 100%; background: var(--neon-green); border-radius: 3px; transition: width 0.3s; }
  #hud-timer {
    position: absolute; top: var(--safe); left: 50%; transform: translateX(-50%);
    font-size: clamp(2rem, 5vw, 3.3rem); font-weight: 900; color: #fff;
    text-shadow: 0 0 24px rgba(255,255,255,0.3);
    letter-spacing: 0.05em; white-space: nowrap;
  }
  .hud-timer-warn { color: var(--neon-pink) !important; animation: pulse 0.5s infinite alternate; }
  @keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }
  #hud-lives-corner { position: absolute; right: var(--safe); top: var(--safe); }
  #hud-level-badge {
    position: absolute; left: var(--safe); bottom: var(--safe);
    pointer-events: auto;
  }
  #hud-level-badge > img { display: block; height: 120px; width: auto; }
  #hud-level-badge .hud-level-label {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Fredoka One', var(--font);
    line-height: 1.1; gap: 0.05em;
  }
  #hud-level-badge .hud-level-title {
    font-size: 0.75rem; letter-spacing: 0.2em; color: rgba(255,255,255,0.55); text-transform: uppercase;
  }
  #hud-level-badge #hud-level {
    font-size: 3rem; font-weight: 900; color: #fff;
  }
  #hud-floor-badge {
    position: absolute; right: var(--safe); bottom: var(--safe);
    background: rgba(10,0,20,0.9); border: 1px solid rgba(200,0,255,0.5);
    border-radius: 8px; padding: 0.5em 1.2em;
    font-size: 0.9rem; font-weight: 900; color: var(--neon-purple); letter-spacing: 0.1em;
  }
  /* Image buttons */
  .qs-img-btn {
    background: none; border: none; padding: 0; cursor: pointer; display: block; line-height: 0;
    transition: transform 0.12s, filter 0.12s;
  }
  .qs-img-btn:hover { transform: scale(1.06); filter: brightness(1.15); }
  .qs-img-btn:active { transform: scale(0.95); filter: brightness(0.85); }
  .qs-img-btn img { display: block; height: 96px; width: auto; }
  /* Leaderboard table */
  .lb-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .lb-table th { color: rgba(255,255,255,0.4); font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 0.4em 0.6em; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .lb-table td { padding: 0.45em 0.6em; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .lb-player-row td { background: rgba(255,215,0,0.08); color: var(--gold); }
  .lb-rank { color: rgba(255,255,255,0.4); width: 2em; }
  .lb-gold { color: var(--gold); }
  /* Game over panel — dark-on-light table overrides */
  #gameover-screen .lb-table { font-family: 'Fredoka One', var(--font); }
  #gameover-screen .lb-table th:nth-child(n+2), #gameover-screen .lb-table td:nth-child(n+2) { text-align: center; }
  #gameover-screen .lb-table th { color: rgba(13,32,64,0.45); border-bottom: 1px solid rgba(13,32,64,0.15); }
  #gameover-screen .lb-table td { color: rgba(13,32,64,0.8); border-bottom: 1px solid rgba(13,32,64,0.08); }
  #gameover-screen .lb-rank { color: rgba(13,32,64,0.4); }
  #gameover-screen .lb-gold { color: rgba(0,100,40,0.9); }
  #gameover-screen .lb-player-row td { background: rgba(0,100,40,0.08); color: rgba(0,100,40,0.9); }
  /* Bet screen slider */
  input[type=range] {
    -webkit-appearance: none; width: 100%; height: 6px;
    border-radius: 3px; outline: none;
    background: linear-gradient(to right, var(--gold) 0%, var(--gold) var(--pct, 50%), rgba(255,255,255,0.1) var(--pct,50%), rgba(255,255,255,0.1) 100%);
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
    background: var(--gold); cursor: pointer;
    box-shadow: 0 0 8px rgba(255,215,0,0.7);
  }
  .bet-amount-display {
    font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; color: var(--gold);
    text-align: center; margin: 0.3em 0; letter-spacing: 0.05em;
  }
  .quick-bets { display: flex; gap: 0.5em; justify-content: center; flex-wrap: wrap; margin: 0.6em 0; }
  .quick-bet-btn {
    padding: 0.4em 0.8em; border-radius: 4px; border: 1px solid rgba(255,215,0,0.4);
    background: rgba(255,215,0,0.08); color: var(--gold);
    font-family: var(--font); font-size: 0.8rem; cursor: pointer;
    transition: background 0.15s;
  }
  .quick-bet-btn:hover { background: rgba(255,215,0,0.2); }
  .spawn-list { display: flex; flex-wrap: nowrap; gap: 0.4em; align-items: center; }
  .spawn-item { display: flex; align-items: center; gap: 0.08em; }
  .enemy-thumb { height: 44px; width: auto; object-fit: contain; margin-top: 5px; }
  .spawn-count { font-family: 'Fredoka One', var(--font); font-size: 1.1rem; color: #0d2040; }
  @keyframes title-breathe {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.04); opacity: 0.82; }
  }
  /* Bet screen title — Fredoka One, plain white */
  #bet-screen .qs-title {
    font-family: 'Fredoka One', var(--font);
    background: none; -webkit-text-fill-color: #fff; color: #fff;
  }
  #bet-screen .qs-subtitle {
    font-family: 'Fredoka One', var(--font);
    color: rgba(255,255,255,0.65);
  }
  .bet-title-block { animation: title-breathe 2.8s ease-in-out infinite; }
  /* Blank panel large — image natural square, content overlaid */
  .bet-panel { position: relative; width: min(720px, 92vw); }
  .bet-panel > .bet-panel-bg { display: block; width: 100%; height: auto; pointer-events: none; }
  .bet-panel > .bet-panel-content {
    position: absolute; inset: 0; z-index: 1;
    padding: 2.2em 2.8em;
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .bet-panel-title {
    font-family: 'Fredoka One', var(--font);
    font-size: 1.55rem; color: #0d2040; letter-spacing: 0.02em; margin-bottom: 0.5em;
  }
  .bet-panel-section {
    font-family: 'Fredoka One', var(--font);
    font-size: 0.78rem; letter-spacing: 0.2em; color: rgba(13,32,64,0.45);
    text-transform: uppercase; margin: 0.7em 0 0.3em;
  }
  /* Dark text overrides inside the panel */
  .bet-panel .qs-row { padding: 0.38em 0; border-bottom-color: rgba(13,32,64,0.1); }
  .bet-panel .qs-label { font-family: 'Fredoka One', var(--font); color: rgba(13,32,64,0.5); font-size: 0.85rem; letter-spacing: 0.07em; }
  .bet-panel .qs-value { color: #0d2040; font-size: 1rem; font-weight: 900; }
  .bet-panel .qs-green { color: #005c2e; }
  .bet-panel .qs-pink  { color: #8b0020; }
  .bet-panel .qs-purple { color: #42007a; }
  .bet-panel .qs-gold  { color: #6b4500; }
  .bet-panel .bet-amount-display { font-family: 'Fredoka One', var(--font); color: #0d2040; font-size: 2.5rem; }
  .bet-panel .quick-bet-btn {
    font-family: 'Fredoka One', var(--font); font-size: 1.6rem;
    border-color: rgba(13,32,64,0.22); background: rgba(13,32,64,0.06); color: #0d2040;
  }
  .bet-panel .quick-bet-btn:hover { background: rgba(13,32,64,0.14); }
  .bet-panel input[type=range] {
    background: linear-gradient(to right, #0d2040 0%, #0d2040 var(--pct,50%), rgba(13,32,64,0.15) var(--pct,50%), rgba(13,32,64,0.15) 100%);
  }
  .bet-panel input[type=range]::-webkit-slider-thumb { background: #0d2040; box-shadow: 0 0 6px rgba(13,32,64,0.4); }
  .bet-panel .odds-block { display: flex; flex-direction: column; align-items: center; background: rgba(13,32,64,0.06); }
  .bet-panel .odds-block .odds-label { font-family: 'Fredoka One', var(--font); color: rgba(13,32,64,0.75); font-size: 1.5rem; text-transform: none; letter-spacing: 0; }
  .bet-panel .odds-block .odds-val { font-family: 'Fredoka One', var(--font); color: #0d2040; font-size: 1.6rem; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
  .bet-panel .odds-block .qs-pink  { color: #8b0020; }
  .bet-panel .odds-block .qs-green { color: #005c2e; }
  .bet-panel .odds-block .qs-gold  { color: #6b4500; }
  .bet-panel-divider { border: none; border-top: 1px solid rgba(13,32,64,0.15); width: 75%; margin: 0.9em auto; }
  .odds-row { display: flex; justify-content: space-between; gap: 1em; margin-top: 0.8em; }
  .odds-block { flex: 1; text-align: center; padding: 0.6em; border-radius: 6px; background: rgba(255,255,255,0.04); }
  .odds-block .odds-label { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
  .odds-block .odds-val { font-size: 1rem; font-weight: 900; margin-top: 0.2em; }
  /* Lives display */
  .hud-lives { display: flex; align-items: center; gap: 0.4em; }
  .hud-lives-l { font-size: 1rem; font-weight: 900; color: rgba(255,255,255,0.5); letter-spacing: 0.05em; margin-right: 0.1em; }
  .hud-lives-bankroll {
    display: flex; align-items: center; gap: 0.3em;
    margin-right: 0.6em;
    padding-right: 0.7em;
    border-right: 1px solid rgba(255,255,255,0.15);
  }
  .hud-lives-bankroll img { height: 58px; width: auto; transform: translateX(-14px); }
  .hud-lives-bankroll span { font-size: 3rem; font-weight: 900; color: var(--neon-green); letter-spacing: 0.03em; transform: translateX(-3px); display: inline-block; }
  .life-pip {
    width: 48px; height: 48px; object-fit: contain;
    transition: opacity 0.3s;
  }
  .life-pip.lost { opacity: 0.15; }
  /* ── Shared panel-card structure (mirrors level badge) ── */
  .panel-card { position: relative; display: inline-block; }
  .panel-card > .panel-bg { display: block; width: auto; }
  .panel-card > .panel-content {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Fredoka One', var(--font); gap: 0.25em; text-align: center;
  }
  .panel-card .panel-label {
    font-size: 0.7rem; letter-spacing: 0.2em; color: rgba(255,255,255,0.5);
    text-transform: uppercase;
  }
  /* Life-lost toast */
  .life-lost-toast {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    pointer-events: none;
    animation: toastIn 0.25s ease, toastOut 0.4s ease 1.8s forwards;
    z-index: 20;
  }
  .life-lost-toast .panel-bg { height: 312px; }
  .life-lost-toast .llt-title { font-size: 1.8rem; color: rgba(13,32,64,0.85); line-height: 1; }
  .life-lost-toast .llt-lives { display: flex; justify-content: center; gap: 0.2em; margin-top: 10px; }
  .life-lost-toast .llt-pip { width: 56px; height: 56px; object-fit: contain; }
  .life-lost-toast .llt-pip.lost { opacity: 0.15; }
  .life-lost-toast .panel-label { font-size: 1.4rem; color: rgba(13,32,64,0.5); }
  /* Mystery reward toast */
  .mystery-toast {
    position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%);
    pointer-events: none;
    animation: toastIn 0.25s ease, toastOut 0.4s ease 2s forwards;
    z-index: 20;
  }
  .mystery-toast .panel-bg { height: 321px; }
  .mystery-toast .panel-label { font-size: 1.575rem; color: rgba(13,32,64,0.5); transform: translateY(-50px); }
  .mystery-toast .mt-reward { font-size: 1.4rem; line-height: 1.2; color: rgba(13,32,64,0.85); }
  .mystery-toast.good .mt-reward { color: rgba(0,100,40,0.9); text-shadow: none; }
  .mystery-toast.bad  .mt-reward { color: rgba(150,20,20,0.9); text-shadow: none; }
  /* Safe zone result toast */
  .safe-zone-toast {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    pointer-events: none;
    animation: toastIn 0.3s ease, toastOut 0.4s ease 1.8s forwards;
    z-index: 20;
  }
  .safe-zone-toast .panel-bg { height: 190px; }
  .safe-zone-toast .szt-title { font-size: 1.3rem; color: var(--gold); line-height: 1; }
  .safe-zone-toast .szt-payout { font-size: 1.8rem; color: var(--neon-green); line-height: 1.1; }
  .safe-zone-toast .szt-sub { font-size: 0.65rem; letter-spacing: 0.15em; color: rgba(255,255,255,0.45); text-transform: uppercase; }
  /* Safe zone interactive dialog */
  .safe-zone-dialog {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    animation: toastIn 0.25s ease;
    z-index: 30; pointer-events: auto;
  }
  .safe-zone-dialog .panel-bg { height: 400px; }
  .safe-zone-dialog .szd-title { font-size: 3.12rem; color: rgba(13,32,64,0.75); line-height: 1; transform: translateY(-23px); }
  .safe-zone-dialog .szd-payout { font-size: 2.2rem; color: rgba(0,100,40,0.9); line-height: 1.1; }
  .safe-zone-dialog .szd-sub { font-size: 0.65rem; color: rgba(13,32,64,0.5); letter-spacing: 0.15em; text-transform: uppercase; }
  .safe-zone-dialog .szd-row { display: flex; gap: 0.6em; justify-content: center; transform: translateY(55px); }
  .safe-zone-dialog .szd-row .qs-img-btn img { height: 54px; }
  @keyframes toastIn  { from { opacity:0; transform:translate(-50%,-44%) scale(0.88); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
  @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translate(-50%,-56%) scale(0.92); } }
  /* Level Complete panel */
  .lc-section-title {
    font-family: 'Fredoka One', var(--font);
    font-size: 1.56rem; letter-spacing: 0.06em; text-transform: uppercase;
    color: rgba(13,32,64,0.45); margin: 0 0 0.3em;
  }
  .lc-grid {
    display: grid; grid-template-columns: auto 1fr; gap: 0 1.2em;
    align-items: center; padding: 0.22em 0;
  }
  .lc-label { font-family: 'Fredoka One', var(--font); font-size: 1.7rem; color: rgba(13,32,64,0.5); }
  .lc-value { font-family: 'Fredoka One', var(--font); font-size: 2rem; color: #0d2040; font-weight: 900; text-align: right; }
`
document.head.appendChild(style)

// ─── Splash Screen ────────────────────────────────────────────────────────────
export function buildSplashScreen(
  onPlay: () => void,
  onLeaderboard: () => void,
  savedSession: { bankroll: number; level: number } | null,
  onContinue: () => void,
  onDebugLevel?: (level: number) => void,
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'splash-screen'
  screen.style.cssText = 'background:none; justify-content:flex-end;'
  screen.innerHTML = `
    <video autoplay loop muted playsinline
           style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;">
      <source src="${import.meta.env.BASE_URL}assets/video/Quack_SplashVideo.mp4" type="video/mp4">
    </video>
    <div style="position:relative;z-index:1;width:100%;
                padding:4em 4em 3.2em;
                background:linear-gradient(to top, rgba(10,0,18,0.92) 60%, transparent 100%);
                display:flex;flex-direction:column;align-items:center;gap:0.6em;">
      ${savedSession ? `<div style="font-size:0.75rem;color:rgba(255,215,0,0.7);letter-spacing:0.15em;margin-bottom:0.2em;">
        SAVED: LEVEL ${savedSession.level} &nbsp;·&nbsp; $${savedSession.bankroll.toLocaleString()}
      </div>` : ''}
      <div style="display:flex;gap:1.2em;flex-wrap:wrap;justify-content:center;align-items:center;">
        <button class="qs-img-btn interactive" id="btn-continue">
          <img src="${import.meta.env.BASE_URL}assets/images/UI_continueButton.png" alt="Continue">
        </button>
        <button class="qs-img-btn interactive" id="btn-play">
          <img src="${import.meta.env.BASE_URL}assets/images/UI_newGameButton.png" alt="New Game">
        </button>
        <button class="qs-img-btn interactive" id="btn-lb">
          <img src="${import.meta.env.BASE_URL}assets/images/UI_leaderboardButton.png" alt="Leaderboard">
        </button>
      </div>
    </div>
  `
  screen.querySelector('#btn-play')!.addEventListener('click', onPlay)
  screen.querySelector('#btn-lb')!.addEventListener('click', onLeaderboard)
  screen.querySelector('#btn-continue')!.addEventListener('click', onContinue)

  if (onDebugLevel) screen.appendChild(buildDebugPanel(onDebugLevel))

  return screen
}

function buildDebugPanel(onLevel: (level: number) => void): HTMLElement {
  const tiers = [
    { label: 'TUTORIAL', range: [1, 5],   color: '#00ff88' },
    { label: 'EASY',     range: [6, 20],  color: '#00cc66' },
    { label: 'MEDIUM',   range: [21, 35], color: '#ffd700' },
    { label: 'HARD',     range: [36, 49], color: '#ff0066' },
    { label: 'FINAL',    range: [50, 50], color: '#cc00ff' },
  ] as const

  const panel = document.createElement('details')
  panel.style.cssText = `
    position:absolute; top:10px; right:10px; z-index:10;
    font-family:monospace;
  `

  const summary = document.createElement('summary')
  summary.style.cssText = `
    width:26px; height:26px; display:flex; align-items:center; justify-content:center;
    cursor:pointer; list-style:none; user-select:none;
    background:rgba(0,0,0,0.55); border:1px solid rgba(255,255,255,0.15);
    border-radius:6px; opacity:0.45; transition:opacity 0.15s;
  `
  summary.addEventListener('mouseover', () => { summary.style.opacity = '0.9' })
  summary.addEventListener('mouseout',  () => { summary.style.opacity = panel.open ? '0.9' : '0.45' })
  summary.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`
  panel.appendChild(summary)

  const dropdownWrap = document.createElement('div')
  dropdownWrap.style.cssText = `
    position:absolute; top:30px; right:0;
    background:rgba(0,0,0,0.88); border:1px solid #444;
    border-radius:8px; padding:10px 12px 12px;
    min-width:320px; max-width:90vw;
    display:flex; flex-direction:column; gap:8px;
  `

  for (const tier of tiers) {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex; flex-direction:column; gap:4px;'

    const lbl = document.createElement('div')
    lbl.style.cssText = `font-size:0.6rem; letter-spacing:0.2em; color:${tier.color}; opacity:0.7;`
    lbl.textContent = tier.label
    row.appendChild(lbl)

    const btns = document.createElement('div')
    btns.style.cssText = 'display:flex; flex-wrap:wrap; gap:3px;'

    for (let lvl = tier.range[0]; lvl <= tier.range[1]; lvl++) {
      const btn = document.createElement('button')
      btn.textContent = String(lvl)
      btn.style.cssText = `
        width:32px; height:28px; border:1px solid ${tier.color}44;
        background:${tier.color}11; color:${tier.color}; border-radius:4px;
        font-family:monospace; font-size:0.75rem; cursor:pointer; transition:background 0.1s;
      `
      btn.addEventListener('mouseover', () => { btn.style.background = `${tier.color}33` })
      btn.addEventListener('mouseout',  () => { btn.style.background = `${tier.color}11` })
      btn.addEventListener('click', () => onLevel(lvl))
      btns.appendChild(btn)
    }

    row.appendChild(btns)
    dropdownWrap.appendChild(row)
  }

  panel.appendChild(dropdownWrap)
  return panel
}

// ─── Leaderboard Screen ───────────────────────────────────────────────────────
export function buildLeaderboardScreen(
  entries: LeaderboardEntry[],
  playerRank: number | null,
  playerEntry: LeaderboardEntry | null,
  onBack: () => void,
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'leaderboard-screen'
  screen.style.cssText = 'background:none;'

  const tdStyle = (color: string, size = '1.2rem') =>
    `style="font-family:'Fredoka One',var(--font);font-size:${size};color:${color};padding:0.25em 0.5em;text-align:center;"`

  const rows = entries.slice(0, 10).map((e, i) => {
    const isPlayer = playerEntry !== null && !e.fake &&
      e.initials === playerEntry.initials &&
      e.score === playerEntry.score &&
      e.level === playerEntry.level
    const rowBg = isPlayer ? 'background:rgba(13,32,64,0.08);' : ''
    return `<tr style="${rowBg}">
      <td ${tdStyle('#0d2040', '1.04rem')}>${isPlayer ? '▶' : ''}${i + 1}</td>
      <td ${tdStyle('#0d2040')}>${e.initials}</td>
      <td ${tdStyle('#0d2040')}>$${e.score.toLocaleString()}</td>
      <td ${tdStyle('#0d2040', '1.04rem')}>Lv${e.level}</td>
    </tr>`
  }).join('')

  const playerRow = playerEntry && playerRank !== null && playerRank > 10 ? `
    <tr><td colspan="4" style="border-top:1px solid rgba(13,32,64,0.15);padding:0;"></td></tr>
    <tr style="background:rgba(13,32,64,0.08);">
      <td ${tdStyle('#0d2040', '1.04rem')}>▶${playerRank}</td>
      <td ${tdStyle('#0d2040')}>${playerEntry.initials}</td>
      <td ${tdStyle('#0d2040')}>$${playerEntry.score.toLocaleString()}</td>
      <td ${tdStyle('#0d2040', '1.04rem')}>Lv${playerEntry.level}</td>
    </tr>` : ''

  const thStyle = `style="font-family:'Fredoka One',var(--font);font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;color:rgba(13,32,64,0.35);padding:0.3em 0.5em;text-align:center;font-weight:400;"`

  const playerStatsSection = playerEntry && playerRank !== null ? `
    <div style="margin-top:20px;margin-bottom:4px;">
      <div class="lc-section-title" style="padding-left:10px;position:relative;top:-15px;">Your Stats</div>
      <div style="display:flex;justify-content:center;align-items:flex-start;gap:3em;padding:0.4em 0 0.2em;">
        <div style="text-align:center;">
          <div class="lc-label">All-Time Best</div>
          <div class="lc-value" style="text-align:center;">$${playerEntry.score.toLocaleString()}</div>
        </div>
        <div style="text-align:center;">
          <div class="lc-label">Best Level</div>
          <div class="lc-value" style="text-align:center;">${playerEntry.level}</div>
        </div>
        <div style="text-align:center;">
          <div class="lc-label">Rank</div>
          <div class="lc-value" style="text-align:center;">#${playerRank}</div>
        </div>
      </div>
    </div>` : ''

  screen.innerHTML = `
    <div class="bet-title-block" style="position:absolute;top:calc(1.8rem + 42px);left:0;right:0;text-align:center;z-index:1;pointer-events:none;">
      <div style="font-family:'Fredoka One',var(--font);font-size:clamp(2.1rem,5.25vw,3.3rem);color:#fff;margin-bottom:0.1em;">Leaderboard</div>
    </div>
    <div class="bet-panel">
      <img class="bet-panel-bg" src="${import.meta.env.BASE_URL}assets/images/UI_blankPanelLarge.png" alt="">
      <div class="bet-panel-content" style="margin-top:40px;overflow-y:auto;">
        ${playerStatsSection}
        <div style="margin-top:50px;">
          <div class="lc-section-title" style="padding-left:10px;position:relative;top:-20px;">Rankings</div>
          <table style="width:80%;border-collapse:collapse;margin:0.3em auto 0;">
            <thead>
              <tr>
                <th ${thStyle}>#</th>
                <th ${thStyle}>Name</th>
                <th ${thStyle}>Score</th>
                <th ${thStyle}>Lvl</th>
              </tr>
            </thead>
            <tbody>${rows}${playerRow}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;align-items:center;width:min(720px,92vw);margin-top:2.8em;">
      <button class="qs-img-btn interactive" id="btn-back-lb">
        <img src="${import.meta.env.BASE_URL}assets/images/UI_backButton.png" alt="Back" style="height:83px;">
      </button>
    </div>
  `
  screen.querySelector('#btn-back-lb')!.addEventListener('click', onBack)
  return screen
}

// ─── Bet Screen ───────────────────────────────────────────────────────────────
export function buildBetScreen(
  config: LevelConfig,
  bankroll: number,
  minBet: number,
  maxBet: number,
  onConfirm: (bet: number) => void,
  onQuit: () => void,
  lives = 3,
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'bet-screen'

  const spawnItems = config.enemySpawns
    .filter(s => s.count > 0)
    .map(s => `<div class="spawn-item">
      <img class="enemy-thumb" src="${import.meta.env.BASE_URL}assets/images/${enemyImage(s.type)}" alt="${s.type}">
      <span class="spawn-count">${s.count}×</span>
    </div>`)
    .join('')
  const spawnLines = `<div class="spawn-list">${spawnItems}</div>`

  const lifePips = [3,2,1].map(i =>
    `<img class="life-pip${i > lives ? ' lost' : ''}" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">`
  ).join('')

  screen.innerHTML = `
    <div class="bet-title-block" style="position:absolute;top:calc(1.8rem + 42px);left:0;right:0;text-align:center;z-index:1;pointer-events:none;">
      <div class="qs-title" style="font-size:clamp(2.1rem,5.25vw,3.3rem);margin-bottom:0.1em;">Level ${config.level}</div>
      <div class="qs-subtitle" style="margin-bottom:0;font-size:clamp(1.2rem,3vw,1.65rem);">${tierLabel(config.tier)}</div>
    </div>
    <div style="position:absolute;top:1.5rem;right:1.5rem;z-index:2;pointer-events:none;">
      <div class="hud-lives">
        <div class="hud-lives-bankroll">
          <img src="${import.meta.env.BASE_URL}assets/images/UI_bankrollIcon02.png" alt="Bankroll">
          <span style="font-family:'Fredoka One',var(--font);font-size:3rem;font-weight:900;color:var(--neon-green);transform:translateX(-3px);display:inline-block;">${bankroll.toLocaleString()}</span>
        </div>
        ${lifePips}
      </div>
    </div>
    <div class="bet-panel">
      <img class="bet-panel-bg" src="${import.meta.env.BASE_URL}assets/images/UI_blankPanelLarge.png" alt="">
      <div class="bet-panel-content">
        <div style="display:flex;gap:2.8em;flex:1;margin-top:15px;">
          <div style="flex:1;padding-left:8px;">
            <div class="bet-panel-title">Level Intel</div>
            <div class="qs-row"><span class="qs-label">Floors</span><span class="qs-value">${config.floorCount}</span></div>
            <div class="qs-row"><span class="qs-label">Tiles / Floor</span><span class="qs-value">${config.tilesPerFloor}</span></div>
            <div class="qs-row"><span class="qs-label">Time Limit</span><span class="qs-value">${formatTime(config.timeLimit)}</span></div>
            <div class="qs-row"><span class="qs-label">Enemy Speed</span><span class="qs-value">${speedLabel(config.enemySpeed)}</span></div>
            <div class="bet-panel-section" style="margin-top:calc(0.7em + 8px);">Spawns</div>
            ${spawnLines}
          </div>
          <div style="flex:1;padding-right:8px;">
            <div class="bet-panel-title">Community Odds</div>
            <div style="font-family:'Fredoka One',var(--font);font-size:0.78rem;color:rgba(13,32,64,0.38);margin-bottom:0.7em;">Based on ${fakeRunCount(config.level).toLocaleString()} runs</div>
            <div class="qs-row"><span class="qs-label">Completion</span><span class="qs-green" style="font-size:1.1rem;font-weight:900;">${fakeWinRate(config.level)}%</span></div>
            <div class="qs-row"><span class="qs-label">Bust</span><span class="qs-pink" style="font-size:1.1rem;font-weight:900;">${fakeBustRate(config.level)}%</span></div>
            <div class="qs-row"><span class="qs-label">Cash-out</span><span class="qs-purple" style="font-size:1.1rem;font-weight:900;">${100 - fakeWinRate(config.level) - fakeBustRate(config.level)}%</span></div>
          </div>
        </div>
        <hr class="bet-panel-divider">
        <div style="margin:0.4em 0 0.2em;">
          <div class="bet-amount-display">Bet Amount $<span id="bet-display">${minBet}</span></div>
          <div style="width:75%;margin:0 auto;">
            <input type="range" id="bet-slider" min="${minBet}" max="${maxBet}" value="${minBet}" step="10" style="--pct:0%;width:100%;">
            <div style="display:flex;justify-content:space-between;font-family:'Fredoka One',var(--font);font-size:0.72rem;color:rgba(13,32,64,0.35);margin-top:0.15em;">
              <span>Min $${minBet}</span><span>Max $${maxBet}</span>
            </div>
          </div>
        </div>
        <div class="quick-bets" id="quick-bets"></div>
        <div class="odds-row" id="odds-row"></div>
      </div>
    </div>
    <div style="display:flex;gap:1.2em;justify-content:center;align-items:center;margin-top:2.8em;">
      <button class="qs-img-btn interactive" id="btn-place-bet">
        <img src="${import.meta.env.BASE_URL}assets/images/UI_betNPlayButton.png" alt="Bet & Play">
      </button>
      <button class="qs-img-btn interactive" id="btn-quit">
        <img src="${import.meta.env.BASE_URL}assets/images/UI_quitButton.png" alt="Quit">
      </button>
    </div>
  `

  // Slider logic
  const slider = screen.querySelector('#bet-slider') as HTMLInputElement
  const betDisplay = screen.querySelector('#bet-display')!
  const oddsRow = screen.querySelector('#odds-row')!
  const quickBets = screen.querySelector('#quick-bets')!

  const quickAmounts = [
    Math.ceil(minBet),
    Math.ceil(maxBet * 0.25),
    Math.ceil(maxBet * 0.5),
    Math.ceil(maxBet * 0.75),
    maxBet,
  ].filter((v, i, a) => a.indexOf(v) === i)

  quickAmounts.forEach(amt => {
    const b = el('button', 'quick-bet-btn interactive', `$${amt}`)
    b.addEventListener('click', () => { slider.value = String(amt); slider.dispatchEvent(new Event('input')) })
    quickBets.appendChild(b)
  })

  function updateOdds(bet: number) {
    const avgWin = Math.round(bet * 1.64)
    const best = Math.round(bet * 6.5)
    oddsRow.innerHTML = `
      <div class="odds-block"><div class="odds-label">Bust</div><div class="odds-val qs-pink">–$${bet}</div></div>
      <div class="odds-block"><div class="odds-label">Avg Win</div><div class="odds-val qs-green">+$${avgWin}</div></div>
      <div class="odds-block"><div class="odds-label">Best Run</div><div class="odds-val qs-gold">+$${best}</div></div>
    `
  }

  slider.addEventListener('input', () => {
    const val = parseInt(slider.value)
    const pct = ((val - minBet) / (maxBet - minBet) * 100).toFixed(1)
    slider.style.setProperty('--pct', `${pct}%`)
    betDisplay.textContent = val.toLocaleString()
    updateOdds(val)
  })

  updateOdds(minBet)
  slider.dispatchEvent(new Event('input'))

  screen.querySelector('#btn-place-bet')!.addEventListener('click', () => {
    onConfirm(parseInt(slider.value))
  })
  screen.querySelector('#btn-quit')!.addEventListener('click', onQuit)

  return screen
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
export function buildHUD(): HTMLElement {
  const hud = el('div', '')
  hud.id = 'hud'
  hud.classList.add('hidden')
  hud.innerHTML = `
    <div id="hud-left-panel">
      <div class="hud-stat">
        <span class="hud-stat-label">Bet</span>
        <span class="hud-stat-value" id="hud-bet">$0</span>
      </div>
      <div class="hud-stat">
        <span class="hud-stat-label">Avg Mult</span>
        <span class="hud-stat-value qs-gold" id="hud-mult">—</span>
      </div>
      <div class="hud-stat">
        <span class="hud-stat-label">Progress</span>
        <span class="hud-stat-value" id="hud-progress-text">0/21</span>
        <div class="hud-progress-bar"><div class="hud-progress-fill" id="hud-progress-fill" style="width:0%"></div></div>
      </div>
    </div>
    <div id="hud-timer">2:00</div>
    <div id="hud-lives-corner">
      <div class="hud-lives" id="hud-lives">
        <div class="hud-lives-bankroll">
          <img src="${import.meta.env.BASE_URL}assets/images/UI_bankrollIcon02.png" alt="Bankroll">
          <span id="hud-corner-bankroll">1,000</span>
        </div>
        <img class="life-pip" id="life-pip-3" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">
        <img class="life-pip" id="life-pip-2" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">
        <img class="life-pip" id="life-pip-1" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">
      </div>
    </div>
    <div id="hud-level-badge" style="cursor:pointer;">
      <img src="${import.meta.env.BASE_URL}assets/images/UI_blankPanel.png" alt="">
      <div class="hud-level-label">
        <span class="hud-level-title">LEVEL</span>
        <span id="hud-level">1</span>
      </div>
    </div>
    <div id="hud-floor-badge" style="display:none;">FLOOR <span id="hud-floor">1/1</span></div>
    <div id="hud-enemy-bar" style="position:absolute;bottom:var(--safe);left:calc(var(--safe) + 148px);display:flex;align-items:flex-end;gap:4px;"></div>
  `
  return hud
}

export function updateHUD(level: number, timeLeft: number, filled: number, total: number, avgMult: number, bankroll: number, bet: number, lives = 3, floor = 0, floorCount = 1): void {
  const hudLevel = $('hud-level')
  const hudTimer = $('hud-timer')
  const hudFill = $('hud-progress-fill') as HTMLElement
  const hudText = $('hud-progress-text')
  const hudMult = $('hud-mult')
  const hudBankroll = $('hud-bankroll')
  const hudBet = $('hud-bet')

  if (hudLevel) hudLevel.textContent = String(level)
  if (hudTimer) {
    hudTimer.textContent = formatTime(Math.ceil(timeLeft))
    hudTimer.className = timeLeft <= 30 ? 'hud-timer-warn' : ''
  }
  if (hudFill) hudFill.style.width = `${(filled / total) * 100}%`
  if (hudText) hudText.textContent = `${filled}/${total}`
  if (hudMult) hudMult.textContent = avgMult > 0 ? `${avgMult.toFixed(2)}x` : '—'
  if (hudBankroll) hudBankroll.textContent = `$${bankroll.toLocaleString()}`
  if (hudBet) hudBet.textContent = `$${bet.toLocaleString()}`
  const cornerBankroll = document.getElementById('hud-corner-bankroll')
  if (cornerBankroll) cornerBankroll.textContent = `${bankroll.toLocaleString()}`

  for (let i = 1; i <= 3; i++) {
    const pip = $(`life-pip-${i}`) as HTMLElement | null
    if (pip) pip.className = `life-pip${i > lives ? ' lost' : ''}`
  }

  const floorBadge = document.getElementById('hud-floor-badge') as HTMLElement | null
  const hudFloor = document.getElementById('hud-floor')
  if (floorBadge) floorBadge.style.display = floorCount > 1 ? '' : 'none'
  if (hudFloor) hudFloor.textContent = `${floor} / ${floorCount}`
}

export function showLifeLostToast(uiRoot: HTMLElement, livesRemaining: number): void {
  uiRoot.querySelectorAll('.mystery-toast, .life-lost-toast').forEach(el => el.remove())
  const toast = document.createElement('div')
  toast.className = 'life-lost-toast'
  const pips = [3, 2, 1].map(i =>
    `<img class="llt-pip${i > livesRemaining ? ' lost' : ''}" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">`
  ).join('')
  toast.innerHTML = `
    <div class="panel-card">
      <img class="panel-bg" src="${import.meta.env.BASE_URL}assets/images/UI_blankPanel.png" alt="">
      <div class="panel-content">
        <span class="panel-label">Life Lost</span>
        <div class="llt-title">-1</div>
        <div class="llt-lives">${pips}</div>
      </div>
    </div>
  `
  uiRoot.appendChild(toast)
  setTimeout(() => toast.remove(), 2300)
}

export function showMysteryToast(uiRoot: HTMLElement, rewardLabel: string, isPositive: boolean): void {
  const toast = document.createElement('div')
  toast.className = `mystery-toast ${isPositive ? 'good' : 'bad'}`
  toast.innerHTML = `
    <div class="panel-card">
      <img class="panel-bg" src="${import.meta.env.BASE_URL}assets/images/UI_blankPanel.png" alt="">
      <div class="panel-content">
        <span class="panel-label">Mystery Tile</span>
        <div class="mt-reward">${rewardLabel}</div>
      </div>
    </div>
  `
  uiRoot.appendChild(toast)
  setTimeout(() => toast.remove(), 2500)
}

// ─── Safe Zone Dialog (interactive choice) ───────────────────────────────────
export function showSafeZoneDialog(
  uiRoot: HTMLElement,
  previewPayout: number,
  elapsedRatio: number,
  avgMult: number,
  onCashOut: () => void,
  onKeepPlaying: () => void,
): HTMLElement {
  const dialog = el('div', 'safe-zone-dialog')
  const pct = Math.round(elapsedRatio * 100)
  const payoutText = previewPayout > 0 ? `+$${previewPayout.toLocaleString()}` : '$0'
  const base = import.meta.env.BASE_URL
  dialog.innerHTML = `
    <div class="panel-card">
      <img class="panel-bg" src="${base}assets/images/UI_blankPanel.png" alt="">
      <div class="panel-content">
        <span class="szd-title">Safe Zone</span>
        <div class="szd-payout">${payoutText}</div>
        <div class="szd-sub">${pct}% time · ${avgMult > 0 ? avgMult.toFixed(2) + 'x avg' : 'no tiles yet'}</div>
        <div class="szd-row">
          <button class="qs-img-btn interactive szd-cashout">
            <img src="${base}assets/images/UI_cashOutButton.png" alt="Cash Out">
          </button>
          <button class="qs-img-btn interactive szd-keep">
            <img src="${base}assets/images/UI_keepPlayingButton.png" alt="Keep Playing">
          </button>
        </div>
      </div>
    </div>
  `
  uiRoot.appendChild(dialog)
  dialog.querySelector('.szd-cashout')!.addEventListener('click', () => { dialog.remove(); onCashOut() })
  dialog.querySelector('.szd-keep')!.addEventListener('click', () => { dialog.remove(); onKeepPlaying() })
  return dialog
}

export function showSafeZoneResult(uiRoot: HTMLElement, payout: number): void {
  const toast = el('div', 'safe-zone-toast')
  toast.innerHTML = `
    <div class="panel-card">
      <img class="panel-bg" src="${import.meta.env.BASE_URL}assets/images/UI_blankPanel.png" alt="">
      <div class="panel-content">
        <span class="panel-label">Cashed Out!</span>
        <div class="szt-payout">+$${payout.toLocaleString()}</div>
        <div class="szt-sub">Resetting level…</div>
      </div>
    </div>
  `
  uiRoot.appendChild(toast)
  setTimeout(() => toast.remove(), 2200)
}

// ─── Level Complete Screen ────────────────────────────────────────────────────
export function buildLevelCompleteScreen(
  result: LevelResult,
  newBankroll: number,
  onNext: () => void,
  onRetry: () => void,
  onMainMenu: () => void,
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'level-complete-screen'

  const prev = newBankroll - result.payout
  const avgMult = result.revealedMultipliers.reduce((a, b) => a + b, 0) / result.revealedMultipliers.length
  const multListDark = result.revealedMultipliers
    .map(m => `<span style="padding:0.2em 0.5em;border-radius:4px;background:rgba(0,92,46,0.12);color:#005c2e;font-family:'Fredoka One',var(--font);font-size:1rem;">${m}x</span>`)
    .join(' ')

  screen.innerHTML = `
    <div class="bet-title-block" style="position:absolute;top:calc(1.8rem + 42px);left:0;right:0;text-align:center;z-index:1;pointer-events:none;">
      <div style="font-family:'Fredoka One',var(--font);font-size:clamp(2.1rem,5.25vw,3.3rem);color:#fff;margin-bottom:0.1em;">Level Complete!</div>
    </div>
    <div class="bet-panel">
      <img class="bet-panel-bg" src="${import.meta.env.BASE_URL}assets/images/UI_blankPanelLarge.png" alt="">
      <div class="bet-panel-content" style="margin-top:40px;">
        <div style="margin-left:7px;">
          <div class="lc-section-title">Multipliers Revealed</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.4em;margin:0.3em 0 0.7em;">${multListDark}</div>
        </div>
        <div style="margin-top:60px;">
          <div class="lc-grid" style="padding-left:10px;padding-right:10px;">
            <span class="lc-label">Bet</span>
            <span class="lc-value">$${result.bet.toLocaleString()}</span>
          </div>
          <div class="lc-grid" style="padding-left:10px;padding-right:10px;">
            <span class="lc-label">Avg Multiplier</span>
            <span class="lc-value">${avgMult.toFixed(2)}x</span>
          </div>
          <div class="lc-grid" style="padding-left:10px;padding-right:10px;">
            <span class="lc-label">Completion Bonus</span>
            <span class="lc-value">${result.completed ? '2.0x' : '1.0x'}</span>
          </div>
          <div class="lc-grid" style="padding-left:10px;padding-right:10px;">
            <span class="lc-label">Payout</span>
            <span class="lc-value" style="color:#6b4500;">+$${result.payout.toLocaleString()}</span>
          </div>
          <div class="lc-grid" style="padding-left:10px;padding-right:10px;">
            <span class="lc-label">Previous</span>
            <span class="lc-value">$${prev.toLocaleString()}</span>
          </div>
          <div class="lc-grid" style="padding-left:10px;padding-right:10px;">
            <span class="lc-label">New Bankroll</span>
            <span class="lc-value" style="color:#005c2e;">$${newBankroll.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;width:min(720px,92vw);margin-top:2.8em;">
      <button class="qs-img-btn interactive" id="btn-next">
        <img src="${import.meta.env.BASE_URL}assets/images/UI_continueButton.png" alt="Continue" style="height:83px;">
      </button>
      <button class="qs-img-btn interactive" id="btn-retry">
        <img src="${import.meta.env.BASE_URL}assets/images/UI_retryButton.png" alt="Retry" style="height:83px;">
      </button>
      <button class="qs-img-btn interactive" id="btn-menu">
        <img src="${import.meta.env.BASE_URL}assets/images/UI_mainMenuButton.png" alt="Main Menu" style="height:83px;">
      </button>
    </div>
  `
  screen.querySelector('#btn-next')!.addEventListener('click', onNext)
  screen.querySelector('#btn-retry')!.addEventListener('click', onRetry)
  screen.querySelector('#btn-menu')!.addEventListener('click', onMainMenu)
  return screen
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────
export function buildGameOverScreen(
  finalBankroll: number,
  levelReached: number,
  topEntries: LeaderboardEntry[],
  playerEntry: LeaderboardEntry | null,
  playerRank: number | null,
  onSubmit: (initials: string) => void,
  onPlayAgain: () => void,
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'gameover-screen'

  let rows = topEntries.slice(0, 9).map((e, i) => `
    <tr><td class="lb-rank">${i + 1}</td><td class="lb-gold">${e.initials}</td>
        <td>$${e.score.toLocaleString()}</td><td>${e.level}</td></tr>
  `).join('')

  if (playerEntry && playerRank !== null) {
    rows += `<tr class="lb-player-row">
      <td class="lb-rank">▶ ${playerRank}</td><td>${playerEntry.initials}</td>
      <td>$${playerEntry.score.toLocaleString()}</td><td>${playerEntry.level}</td>
    </tr>`
  }

  screen.innerHTML = `
    <div style="position:absolute;top:calc(1.8rem + 42px);left:0;right:0;text-align:center;z-index:1;pointer-events:none;">
      <div style="font-family:'Fredoka One',var(--font);font-size:clamp(2.1rem,5.25vw,3.3rem);color:#fff;">Game Over</div>
    </div>
    <div class="bet-panel">
      <img class="bet-panel-bg" src="${import.meta.env.BASE_URL}assets/images/UI_blankPanelLarge.png" alt="">
      <div class="bet-panel-content" style="margin-top:40px;overflow-y:auto;">
        <div style="display:flex;gap:2em;justify-content:center;margin-bottom:0.8em;">
          <span style="font-family:'Fredoka One',var(--font);font-size:1rem;color:rgba(13,32,64,0.5);">FINAL BANKROLL &nbsp;<strong style="color:#005c2e;">$${finalBankroll.toLocaleString()}</strong></span>
          <span style="font-family:'Fredoka One',var(--font);font-size:1rem;color:rgba(13,32,64,0.5);">REACHED LEVEL &nbsp;<strong style="color:#0d2040;">${levelReached}</strong></span>
        </div>
        <div style="display:flex;align-items:center;gap:1em;margin-bottom:1em;justify-content:center;" id="initials-row">
          <span style="font-family:'Fredoka One',var(--font);font-size:0.9rem;letter-spacing:0.15em;text-transform:uppercase;color:rgba(13,32,64,0.5);">Your initials:</span>
          <input id="initials-input" maxlength="3" style="
            width:5em;text-align:center;background:rgba(13,32,64,0.06);border:1px solid rgba(13,32,64,0.3);
            border-radius:4px;color:#0d2040;font-family:'Fredoka One',var(--font);font-size:1.3rem;
            letter-spacing:0.3em;padding:0.2em;text-transform:uppercase;outline:none;
          " value="AAA">
          <button class="qs-btn qs-btn-primary interactive" id="btn-submit" style="width:auto;padding:0.5em 1.2em;margin:0;font-family:'Fredoka One',var(--font);">Submit</button>
        </div>
        <table class="lb-table">
          <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Level</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div style="margin-top:2em;">
      <button class="qs-img-btn interactive" id="btn-play-again">
        <img src="${import.meta.env.BASE_URL}assets/images/UI_mainMenuButton.png" alt="Play Again" style="height:83px;">
      </button>
    </div>
  `

  const input = screen.querySelector('#initials-input') as HTMLInputElement
  input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '') })

  screen.querySelector('#btn-submit')!.addEventListener('click', () => {
    const initials = input.value.padEnd(3, 'A').slice(0, 3)
    screen.querySelector('#initials-row')!.remove()
    onSubmit(initials)
  })

  screen.querySelector('#btn-play-again')!.addEventListener('click', onPlayAgain)
  return screen
}

export function setHUDEnemies(spawns: { type: string; count: number }[]): void {
  const bar = document.getElementById('hud-enemy-bar')
  if (!bar) return
  let idx = 0
  bar.innerHTML = spawns
    .filter(s => s.count > 0)
    .flatMap(s => Array.from({ length: s.count }, () => {
      const i = idx++
      return `<img id="hud-ei-${i}" data-type="${s.type}" data-dead="0"
        src="${import.meta.env.BASE_URL}assets/images/${enemyImage(s.type)}"
        style="height:40px;width:auto;object-fit:contain;transition:filter 0.4s,opacity 0.4s;">`
    }))
    .join('')
}

export function markHUDEnemyDied(type: string): void {
  const bar = document.getElementById('hud-enemy-bar')
  if (!bar) return
  const icon = bar.querySelector<HTMLElement>(`img[data-type="${type}"][data-dead="0"]`)
  if (icon) {
    icon.dataset.dead = '1'
    icon.style.filter = 'grayscale(1) brightness(0.2)'
    icon.style.opacity = '0.35'
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function speedLabel(speed: number): string {
  if (speed <= 0.6) return 'Very Slow'
  if (speed <= 0.9) return 'Slow'
  if (speed <= 1.2) return 'Medium'
  if (speed <= 1.6) return 'Fast'
  if (speed <= 1.9) return 'Very Fast'
  return 'MAX'
}

function enemyImage(type: string): string {
  const map: Record<string, string> = {
    lateral: 'enemy_01.png',
    chaser:  'enemy_02.png',
    eraser:  'enemy_03.png',
    bouncer: 'enemy_04.png',
    stalker: 'enemy_05.png',
    boss:    'finalboss.png',
  }
  return map[type] ?? 'enemy_01.png'
}

function fakeWinRate(level: number): number {
  return Math.max(8, Math.round(75 - level * 1.2))
}

function fakeBustRate(level: number): number {
  return Math.min(80, Math.round(15 + level * 1.3))
}

function fakeRunCount(level: number): number {
  return Math.round(80000 / level)
}
