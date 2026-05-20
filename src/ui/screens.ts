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
    padding: 1.5em 2em;
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
    position: absolute; top: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.6em 1.5em;
    background: rgba(10,0,20,0.85);
    border-bottom: 1px solid rgba(200,0,255,0.3);
    font-family: var(--font);
    pointer-events: none;
  }
  #hud.hidden { display: none; }
  .hud-block { text-align: center; }
  .hud-label { font-size: 0.6rem; color: rgba(255,255,255,0.4); letter-spacing: 0.2em; text-transform: uppercase; }
  .hud-value { font-size: 1.1rem; font-weight: 900; color: #fff; }
  .hud-timer-warn { color: var(--neon-pink) !important; animation: pulse 0.5s infinite alternate; }
  .hud-progress { display: flex; align-items: center; gap: 0.5em; }
  .progress-bar { width: 120px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--neon-green); border-radius: 4px; transition: width 0.3s; }
  @keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }
  /* Leaderboard table */
  .lb-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .lb-table th { color: rgba(255,255,255,0.4); font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 0.4em 0.6em; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .lb-table td { padding: 0.45em 0.6em; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .lb-player-row td { background: rgba(255,215,0,0.08); color: var(--gold); }
  .lb-rank { color: rgba(255,255,255,0.4); width: 2em; }
  .lb-gold { color: var(--gold); }
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
  .odds-row { display: flex; justify-content: space-between; gap: 1em; margin-top: 0.8em; }
  .odds-block { flex: 1; text-align: center; padding: 0.6em; border-radius: 6px; background: rgba(255,255,255,0.04); }
  .odds-block .odds-label { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
  .odds-block .odds-val { font-size: 1rem; font-weight: 900; margin-top: 0.2em; }
  .hud-floor { font-size: 0.9rem; font-weight: 900; color: var(--neon-purple); }
  /* Lives display */
  .hud-lives { display: flex; align-items: center; gap: 0.35em; }
  .life-pip {
    width: 22px; height: 22px; object-fit: contain;
    transition: opacity 0.3s;
  }
  .life-pip.lost { opacity: 0.15; }
  /* Life-lost toast */
  .life-lost-toast {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: rgba(20,0,40,0.95); border: 2px solid var(--neon-purple);
    border-radius: 12px; padding: 1em 2em; text-align: center;
    font-family: var(--font); pointer-events: none;
    box-shadow: 0 0 40px rgba(200,0,255,0.5);
    animation: toastIn 0.25s ease, toastOut 0.4s ease 1.8s forwards;
    z-index: 20;
  }
  .life-lost-toast .llt-title { font-size: 1.4rem; font-weight: 900; color: var(--neon-purple); }
  .life-lost-toast .llt-lives { display: flex; justify-content: center; gap: 0.5em; margin-top: 0.5em; }
  .life-lost-toast .llt-pip {
    width: 22px; height: 22px; object-fit: contain;
    transition: opacity 0.3s;
  }
  .life-lost-toast .llt-pip.lost { opacity: 0.15; }
  /* Safe zone result toast */
  .safe-zone-toast {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--bg-card); border: 2px solid var(--gold);
    border-radius: 12px; padding: 1.2em 2.2em; text-align: center;
    font-family: var(--font); min-width: 280px; pointer-events: none;
    box-shadow: 0 0 40px rgba(255,215,0,0.4);
    animation: toastIn 0.3s ease, toastOut 0.4s ease 1.8s forwards;
    z-index: 20;
  }
  .safe-zone-toast h3 { color: var(--gold); font-size: 1.2rem; margin-bottom: 0.3em; }
  .safe-zone-toast .payout { font-size: 2rem; font-weight: 900; color: var(--neon-green); }
  .safe-zone-toast .sub { font-size: 0.75rem; color: rgba(255,255,255,0.45); margin-top: 0.4em; letter-spacing: 0.15em; text-transform: uppercase; }
  /* Safe zone interactive dialog */
  .safe-zone-dialog {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--bg-card); border: 2px solid var(--gold);
    border-radius: 14px; padding: 1.6em 2.4em; text-align: center;
    font-family: var(--font); min-width: 300px;
    box-shadow: 0 0 50px rgba(255,215,0,0.45);
    animation: toastIn 0.25s ease;
    z-index: 30; pointer-events: auto;
  }
  .safe-zone-dialog h3 { color: var(--gold); font-size: 1.3rem; margin: 0 0 0.3em; }
  .safe-zone-dialog .szd-payout { font-size: 2.2rem; font-weight: 900; color: var(--neon-green); margin: 0.2em 0; }
  .safe-zone-dialog .szd-sub { font-size: 0.72rem; color: rgba(255,255,255,0.45); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 1.2em; }
  .safe-zone-dialog .szd-row { display: flex; gap: 0.8em; justify-content: center; }
  .safe-zone-dialog .szd-row .qs-btn { width: auto; min-width: 120px; font-size: 0.95rem; }
  @keyframes toastIn  { from { opacity:0; transform:translate(-50%,-44%) scale(0.88); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
  @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translate(-50%,-56%) scale(0.92); } }
`
document.head.appendChild(style)

// ─── Splash Screen ────────────────────────────────────────────────────────────
export function buildSplashScreen(
  onPlay: () => void,
  onLeaderboard: () => void,
  bestScore: number,
  bestLevel: number,
  onDebugLevel?: (level: number) => void,
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'splash-screen'
  screen.style.cssText = 'background:none; justify-content:flex-end;'
  screen.innerHTML = `
    <img src="${import.meta.env.BASE_URL}assets/images/hero16-9.png" alt="Quack-Stack"
         style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;">
    <div style="position:relative;z-index:1;width:100%;
                padding:2em 2em 1.6em;
                background:linear-gradient(to top, rgba(10,0,18,0.92) 60%, transparent 100%);
                display:flex;flex-direction:column;align-items:center;gap:0.6em;">
      <div style="display:flex;gap:1em;flex-wrap:wrap;justify-content:center;">
        <button class="qs-btn qs-btn-primary interactive" id="btn-play"
                style="margin:0;width:220px;">▶&nbsp; Play</button>
        <button class="qs-btn qs-btn-secondary interactive" id="btn-lb"
                style="margin:0;width:220px;">🏆&nbsp; Leaderboard</button>
      </div>
      ${bestScore > 0 ? `<div style="font-size:0.72rem;color:rgba(255,255,255,0.35);letter-spacing:0.2em;font-family:var(--font);">
        ALL-TIME BEST:&nbsp; $${bestScore.toLocaleString()} &nbsp;·&nbsp; LEVEL ${bestLevel}
      </div>` : ''}
    </div>
  `
  screen.querySelector('#btn-play')!.addEventListener('click', onPlay)
  screen.querySelector('#btn-lb')!.addEventListener('click', onLeaderboard)

  if (onDebugLevel) screen.appendChild(buildDebugPanel(onDebugLevel))

  return screen
}

function buildDebugPanel(onLevel: (level: number) => void): HTMLElement {
  const tiers = [
    { label: 'EASY',   range: [1, 20],  color: '#00ff88' },
    { label: 'MID',    range: [21, 39], color: '#ffd700' },
    { label: 'HARD',   range: [40, 49], color: '#ff0066' },
    { label: 'FINAL',  range: [50, 50], color: '#cc00ff' },
  ] as const

  const panel = document.createElement('details')
  panel.style.cssText = `
    position:absolute; top:12px; right:12px; z-index:10;
    background:rgba(0,0,0,0.85); border:1px solid #444;
    border-radius:8px; padding:0; font-family:monospace;
    min-width:320px; max-width:90vw;
  `

  const summary = document.createElement('summary')
  summary.style.cssText = `
    padding:6px 12px; cursor:pointer; font-size:0.75rem;
    color:#aaa; letter-spacing:0.15em; list-style:none; user-select:none;
  `
  summary.textContent = '⚙ DEBUG — JUMP TO LEVEL'
  panel.appendChild(summary)

  const body = document.createElement('div')
  body.style.cssText = 'padding:10px 12px 12px; display:flex; flex-direction:column; gap:8px;'

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
    body.appendChild(row)
  }

  panel.appendChild(body)
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

  const isPlayerRow = (e: LeaderboardEntry) =>
    playerEntry !== null && !e.fake &&
    e.initials === playerEntry.initials &&
    e.score === playerEntry.score &&
    e.level === playerEntry.level

  const rows = entries.slice(0, 10).map((e, i) => {
    const isPlayer = isPlayerRow(e)
    const cls = isPlayer ? ' class="lb-player-row"' : ''
    const rankCell = isPlayer
      ? `<td class="lb-rank">▶ ${i + 1}</td>`
      : `<td class="lb-rank">${i + 1}</td>`
    return `<tr${cls}>${rankCell}<td class="${isPlayer ? '' : 'lb-gold'}">${e.initials}</td>
        <td>$${e.score.toLocaleString()}</td><td>${e.level}</td></tr>`
  }).join('')

  const extraRow = playerEntry && playerRank !== null && playerRank > 10
    ? `<tr class="lb-player-row">
        <td class="lb-rank">▶ ${playerRank}</td><td>${playerEntry.initials}</td>
        <td>$${playerEntry.score.toLocaleString()}</td><td>${playerEntry.level}</td>
       </tr>`
    : ''

  const statsCard = playerEntry
    ? `<div class="qs-card" style="width:min(480px,90vw);display:flex;justify-content:space-around;padding:0.8em 1.2em;margin-bottom:0.8em;">
        <div style="text-align:center;">
          <div class="hud-label">All-Time Best</div>
          <div class="qs-gold" style="font-size:1.2rem;font-weight:900;">$${playerEntry.score.toLocaleString()}</div>
        </div>
        <div style="text-align:center;">
          <div class="hud-label">Best Level</div>
          <div style="font-size:1.2rem;font-weight:900;color:#fff;">${playerEntry.level}</div>
        </div>
        <div style="text-align:center;">
          <div class="hud-label">Rank</div>
          <div style="font-size:1.2rem;font-weight:900;color:#fff;">#${playerRank}</div>
        </div>
      </div>`
    : ''

  screen.innerHTML = `
    <div class="qs-title" style="font-size:clamp(1.5rem,4vw,2.5rem);margin-bottom:0.6em;">Leaderboard</div>
    ${statsCard}
    <div class="qs-card">
      <table class="lb-table">
        <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Level</th></tr></thead>
        <tbody>${rows}${extraRow}</tbody>
      </table>
    </div>
    <button class="qs-btn qs-btn-secondary interactive" id="btn-back-lb" style="margin-top:1em;">← Back</button>
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
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'bet-screen'

  const spawnLines = config.enemySpawns
    .filter(s => s.count > 0)
    .map(s => `<div class="qs-row"><span class="qs-label">${enemyLabel(s.type)}</span><span class="qs-value">${s.count}×</span></div>`)
    .join('')

  screen.innerHTML = `
    <div class="qs-title" style="font-size:clamp(1.2rem,3vw,2rem);margin-bottom:0.1em;">Level ${config.level}</div>
    <div class="qs-subtitle" style="margin-bottom:1em;">${tierLabel(config.tier)}</div>
    <div style="display:flex;gap:1em;flex-wrap:wrap;justify-content:center;width:min(800px,95vw);">
      <div class="qs-card" style="flex:1;min-width:220px;">
        <div style="font-size:0.7rem;letter-spacing:0.2em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:0.6em;">Level Intel</div>
        <div class="qs-row"><span class="qs-label">Floors</span><span class="qs-value">${config.floorCount}</span></div>
        <div class="qs-row"><span class="qs-label">Tiles/Floor</span><span class="qs-value">${config.tilesPerFloor}</span></div>
        <div class="qs-row"><span class="qs-label">Time Limit</span><span class="qs-value">${formatTime(config.timeLimit)}</span></div>
        <div class="qs-row"><span class="qs-label">Enemy Speed</span><span class="qs-value">${speedLabel(config.enemySpeed)}</span></div>
        <div style="margin-top:0.8em;font-size:0.7rem;letter-spacing:0.2em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:0.4em;">Spawns</div>
        ${spawnLines}
      </div>
      <div class="qs-card" style="flex:1;min-width:220px;">
        <div style="font-size:0.7rem;letter-spacing:0.2em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:0.6em;">Community Odds</div>
        <div style="font-size:0.72rem;color:rgba(255,255,255,0.3);margin-bottom:0.6em;">Based on ${fakeRunCount(config.level).toLocaleString()} runs</div>
        <div class="qs-row"><span class="qs-label">✓ Completion rate</span><span class="qs-green">${fakeWinRate(config.level)}%</span></div>
        <div class="qs-row"><span class="qs-label">💀 Bust rate</span><span class="qs-pink">${fakeBustRate(config.level)}%</span></div>
        <div class="qs-row"><span class="qs-label">💸 Cash-out rate</span><span class="qs-purple">${100 - fakeWinRate(config.level) - fakeBustRate(config.level)}%</span></div>
      </div>
    </div>
    <div class="qs-card" style="width:min(600px,90vw);">
      <div class="qs-row"><span class="qs-label">Your Bankroll</span><span class="qs-gold" style="font-size:1.3rem;">$<span id="bankroll-display">${bankroll.toLocaleString()}</span></span></div>
      <div style="margin: 1em 0 0.3em;">
        <div class="bet-amount-display">$<span id="bet-display">${minBet}</span></div>
        <input type="range" id="bet-slider" min="${minBet}" max="${maxBet}" value="${minBet}" step="10" style="--pct:0%;">
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:rgba(255,255,255,0.3);margin-top:0.2em;">
          <span>MIN $${minBet}</span><span>MAX $${maxBet}</span>
        </div>
      </div>
      <div class="quick-bets" id="quick-bets"></div>
      <div class="odds-row" id="odds-row"></div>
    </div>
    <button class="qs-btn qs-btn-primary interactive" id="btn-place-bet" style="margin-top:0.5em;">Place Bet &amp; Play ▶</button>
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
      <div class="odds-block"><div class="odds-label">💀 Bust</div><div class="odds-val qs-pink">–$${bet}</div></div>
      <div class="odds-block"><div class="odds-label">💸 Avg Win</div><div class="odds-val qs-green">+$${avgWin}</div></div>
      <div class="odds-block"><div class="odds-label">🎰 Best Run</div><div class="odds-val qs-gold">+$${best}</div></div>
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

  return screen
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
export function buildHUD(): HTMLElement {
  const hud = el('div', '')
  hud.id = 'hud'
  hud.classList.add('hidden')
  hud.innerHTML = `
    <div class="hud-block"><div class="hud-label">Level</div><div class="hud-value" id="hud-level">1</div></div>
    <div class="hud-block" id="hud-floor-block">
      <div class="hud-label">Floor</div>
      <div class="hud-value hud-floor" id="hud-floor">—</div>
    </div>
    <div class="hud-block"><div class="hud-label">Timer</div><div class="hud-value" id="hud-timer">2:00</div></div>
    <div class="hud-block hud-progress">
      <div>
        <div class="hud-label">Progress</div>
        <div style="display:flex;align-items:center;gap:0.5em;">
          <div class="progress-bar"><div class="progress-fill" id="hud-progress-fill" style="width:0%"></div></div>
          <div class="hud-value" id="hud-progress-text">0/21</div>
        </div>
      </div>
    </div>
    <div class="hud-block">
      <div class="hud-label">Lives</div>
      <div class="hud-lives" id="hud-lives">
        <img class="life-pip" id="life-pip-3" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">
        <img class="life-pip" id="life-pip-2" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">
        <img class="life-pip" id="life-pip-1" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">
      </div>
    </div>
    <div class="hud-block"><div class="hud-label">Avg Mult</div><div class="hud-value qs-gold" id="hud-mult">—</div></div>
    <div class="hud-block"><div class="hud-label">Bankroll</div><div class="hud-value qs-green" id="hud-bankroll">$1,000</div></div>
    <div class="hud-block"><div class="hud-label">Bet</div><div class="hud-value" id="hud-bet">$0</div></div>
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
    hudTimer.className = `hud-value${timeLeft <= 30 ? ' hud-timer-warn' : ''}`
  }
  if (hudFill) hudFill.style.width = `${(filled / total) * 100}%`
  if (hudText) hudText.textContent = `${filled}/${total}`
  if (hudMult) hudMult.textContent = avgMult > 0 ? `${avgMult.toFixed(2)}x` : '—'
  if (hudBankroll) hudBankroll.textContent = `$${bankroll.toLocaleString()}`
  if (hudBet) hudBet.textContent = `$${bet.toLocaleString()}`

  for (let i = 1; i <= 3; i++) {
    const pip = $(`life-pip-${i}`) as HTMLElement | null
    if (pip) pip.className = `life-pip${i > lives ? ' lost' : ''}`
  }

  const floorBlock = document.getElementById('hud-floor-block') as HTMLElement | null
  const hudFloor = document.getElementById('hud-floor')
  if (floorBlock) floorBlock.style.display = floorCount > 1 ? '' : 'none'
  if (hudFloor) hudFloor.textContent = floorCount > 1 ? `${floor} / ${floorCount}` : '—'
}

export function showLifeLostToast(uiRoot: HTMLElement, livesRemaining: number): void {
  const toast = document.createElement('div')
  toast.className = 'life-lost-toast'
  const pips = [3, 2, 1].map(i =>
    `<img class="llt-pip${i > livesRemaining ? ' lost' : ''}" src="${import.meta.env.BASE_URL}assets/images/player_life_icon.png" alt="life">`
  ).join('')
  toast.innerHTML = `
    <div class="llt-title">💀 Life Lost</div>
    <div class="llt-lives">${pips}</div>
  `
  uiRoot.appendChild(toast)
  setTimeout(() => toast.remove(), 2300)
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
  dialog.innerHTML = `
    <h3>💰 Safe Zone</h3>
    <div class="szd-payout">${payoutText}</div>
    <div class="szd-sub">${pct}% time · ${avgMult > 0 ? avgMult.toFixed(2) + 'x avg' : 'no tiles yet'}</div>
    <div class="szd-row">
      <button class="qs-btn qs-btn-primary szd-cashout">💰 Cash Out</button>
      <button class="qs-btn qs-btn-secondary szd-keep">▶ Keep Playing</button>
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
    <h3>💰 Cashed Out!</h3>
    <div class="payout">+$${payout.toLocaleString()}</div>
    <div class="sub">Resetting level…</div>
  `
  uiRoot.appendChild(toast)
  setTimeout(() => toast.remove(), 2200)
}

// ─── Level Complete Screen ────────────────────────────────────────────────────
export function buildLevelCompleteScreen(
  result: LevelResult,
  newBankroll: number,
  onNext: () => void,
): HTMLElement {
  const screen = el('div', 'qs-screen')
  screen.id = 'level-complete-screen'
  const multList = result.revealedMultipliers
    .map(m => `<span style="padding:0.2em 0.4em;border-radius:3px;background:rgba(0,255,136,0.1);color:var(--neon-green);font-size:0.85rem;">${m}x</span>`)
    .join(' ')

  const prev = newBankroll - result.payout
  screen.innerHTML = `
    <div class="qs-title" style="font-size:clamp(1.5rem,4vw,2.5rem);">Level Complete! 🎉</div>
    <div class="qs-card" style="width:min(600px,90vw);">
      <div style="margin-bottom:0.8em;font-size:0.7rem;letter-spacing:0.2em;color:rgba(255,255,255,0.4);text-transform:uppercase;">Multipliers Revealed</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4em;margin-bottom:1em;">${multList}</div>
      <div class="qs-row"><span class="qs-label">Bet</span><span class="qs-value">$${result.bet.toLocaleString()}</span></div>
      <div class="qs-row"><span class="qs-label">Avg Multiplier</span><span class="qs-value">${(result.revealedMultipliers.reduce((a,b)=>a+b,0)/result.revealedMultipliers.length).toFixed(2)}x</span></div>
      <div class="qs-row"><span class="qs-label">Completion Bonus</span><span class="qs-value">${result.completed ? '2.0x' : '1.0x'}</span></div>
      <div class="qs-row" style="border-top:1px solid rgba(255,255,255,0.15);margin-top:0.4em;padding-top:0.8em;">
        <span class="qs-label">Payout</span><span class="qs-gold" style="font-size:1.4rem;">+$${result.payout.toLocaleString()}</span>
      </div>
    </div>
    <div class="qs-card" style="width:min(600px,90vw);">
      <div class="qs-row"><span class="qs-label">Previous Bankroll</span><span class="qs-value">$${prev.toLocaleString()}</span></div>
      <div class="qs-row"><span class="qs-label">New Bankroll</span><span class="qs-green" style="font-size:1.2rem;">$${newBankroll.toLocaleString()}</span></div>
    </div>
    <button class="qs-btn qs-btn-primary interactive" id="btn-next" style="margin-top:0.5em;">Next Level ▶</button>
  `
  screen.querySelector('#btn-next')!.addEventListener('click', onNext)
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
    <div class="qs-title" style="font-size:clamp(1.5rem,4vw,2.5rem);color:var(--neon-pink);-webkit-text-fill-color:unset;">Game Over</div>
    <div style="display:flex;gap:1.5em;font-family:var(--font);margin-bottom:0.8em;">
      <span style="color:rgba(255,255,255,0.5);font-size:0.85rem;">FINAL BANKROLL &nbsp;<strong style="color:var(--gold)">$${finalBankroll.toLocaleString()}</strong></span>
      <span style="color:rgba(255,255,255,0.5);font-size:0.85rem;">REACHED LEVEL &nbsp;<strong style="color:var(--gold)">${levelReached}</strong></span>
    </div>
    <div style="display:flex;align-items:center;gap:1em;margin-bottom:1em;" id="initials-row">
      <span style="font-family:var(--font);font-size:0.8rem;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.5);">Your initials:</span>
      <input id="initials-input" maxlength="3" style="
        width:5em;text-align:center;background:rgba(255,215,0,0.1);border:1px solid var(--gold);
        border-radius:4px;color:var(--gold);font-family:var(--font);font-size:1.3rem;font-weight:900;
        letter-spacing:0.3em;padding:0.2em;text-transform:uppercase;outline:none;
      " value="AAA">
      <button class="qs-btn qs-btn-primary interactive" id="btn-submit" style="width:auto;padding:0.5em 1.2em;margin:0;">Submit</button>
    </div>
    <div class="qs-card" style="width:min(600px,90vw);">
      <table class="lb-table">
        <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Level</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <button class="qs-btn qs-btn-secondary interactive" id="btn-play-again" style="margin-top:0.8em;">↺ Play Again</button>
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

function enemyLabel(type: string): string {
  const map: Record<string, string> = {
    chaser:  '🂡 Card Shark (chaser)',
    bouncer: '🎲 Lucky Chip (bouncer)',
    eraser:  '🃟 Wild Card (eraser)',
    lateral: '🂿 Joker (lateral)',
  }
  return map[type] ?? type
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
