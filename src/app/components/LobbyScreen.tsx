import React, { useState } from 'react';
import { ActionButton } from './ActionButton';
import { Bot, User } from 'lucide-react';
import { botRegistry } from '../../engine';

export interface GameSettings {
  playerName: string;
  player2Name: string;
  player1Type: 'human' | 'ai';
  player2Type: 'human' | 'ai';
  player1BotId: string;
  player2BotId: string;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  tablesCount: number;
  speedMs: number;
}

export interface LobbyScreenProps {
  onStartMatch: (settings: GameSettings) => void;
  onOpenDev?: () => void;
}

export function LobbyScreen({ onStartMatch, onOpenDev }: LobbyScreenProps) {
  const [settings, setSettings] = useState<GameSettings>({
    playerName: 'Player 1',
    player2Name: 'Player 2',
    player1Type: 'ai',
    player2Type: 'ai',
    player1BotId: 'warren',
    player2BotId: 'warren',
    startingStack: 1000,
    smallBlind: 5,
    bigBlind: 10,
    tablesCount: 1,
    speedMs: 300
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-3">
            <span className="text-6xl" style={{ color: '#ffffff' }}>♠</span>
            <span className="text-6xl" style={{ color: '#ef4444' }}>♥</span>
            <h1 className="text-5xl font-bold uppercase tracking-wider font-mono" style={{ color: '#facc15', textShadow: '0 0 30px rgba(250, 204, 21, 0.8)' }}>Texas Hold'em</h1>
            <span className="text-6xl" style={{ color: '#06b6d4' }}>♦</span>
            <span className="text-6xl" style={{ color: '#22c55e' }}>♣</span>
          </div>
          <p className="text-cyan-400 text-lg uppercase tracking-widest">Heads-Up Match Setup</p>
        </div>

        {/* Player Panels */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Player 1 */}
          <div className="bg-black p-6 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-cyan-300 text-sm uppercase tracking-wider">Player 1</div>
              <button
                onClick={() => setSettings({ 
                  ...settings, 
                  player1Type: settings.player1Type === 'human' ? 'ai' : 'human',
                  player1BotId: settings.player1Type === 'human' ? 'warren' : settings.player1BotId
                })}
                className="flex items-center gap-2 px-3 py-1 bg-charcoal-900 hover:bg-charcoal-800 text-sm text-cyan-300 transition-colors border border-cyan-600"
              >
                {settings.player1Type === 'human' ? (
                  <>
                    <User className="w-4 h-4" />
                    Switch to AI
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    Switch to Human
                  </>
                )}
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-cyan-300 text-sm mb-2 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={settings.playerName}
                onChange={(e) => setSettings({ ...settings, playerName: e.target.value })}
                className="w-full bg-black text-green-400 px-4 py-2 border-2 border-cyan-600 focus:outline-none focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.5)] font-mono"
                placeholder="Enter name"
              />
            </div>
            <div className={`inline-block px-3 py-1 text-sm border-2 uppercase tracking-wider font-bold ${
              settings.player1Type === 'human'
                ? 'bg-green-900/30 text-green-400 border-green-500'
                : 'bg-purple-900/30 text-purple-400 border-purple-500'
            }`}>
              {settings.player1Type === 'human' ? 'Human' : 'AI Bot'}
            </div>
            {settings.player1Type === 'ai' && (
              <div className="mt-4">
                <label className="block text-cyan-300 text-sm mb-2 uppercase tracking-wide">Bot</label>
                <select
                  value={settings.player1BotId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      player1BotId: e.target.value,
                    })
                  }
                  className="w-full bg-black text-green-400 px-4 py-2 border-2 border-cyan-600 focus:outline-none focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.5)] font-mono"
                >
                  {botRegistry.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className="bg-black p-6 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-cyan-300 text-sm uppercase tracking-wider">Player 2</div>
              <button
                onClick={() => setSettings({ 
                  ...settings, 
                  player2Type: settings.player2Type === 'human' ? 'ai' : 'human',
                  player2BotId: settings.player2Type === 'human' ? 'warren' : settings.player2BotId
                })}
                className="flex items-center gap-2 px-3 py-1 bg-charcoal-900 hover:bg-charcoal-800 text-sm text-cyan-300 transition-colors border border-cyan-600"
              >
                {settings.player2Type === 'human' ? (
                  <>
                    <User className="w-4 h-4" />
                    Switch to AI
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    Switch to Human
                  </>
                )}
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-cyan-300 text-sm mb-2 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={settings.player2Name}
                onChange={(e) => setSettings({ ...settings, player2Name: e.target.value })}
                className="w-full bg-black text-green-400 px-4 py-2 border-2 border-cyan-600 focus:outline-none focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.5)] font-mono"
                placeholder="Enter name"
              />
            </div>
            <div className={`inline-block px-3 py-1 text-sm border-2 uppercase tracking-wider font-bold ${
              settings.player2Type === 'human'
                ? 'bg-green-900/30 text-green-400 border-green-500'
                : 'bg-purple-900/30 text-purple-400 border-purple-500'
            }`}>
              {settings.player2Type === 'human' ? 'Human' : 'AI Bot'}
            </div>
            {settings.player2Type === 'ai' && (
              <div className="mt-4">
                <label className="block text-cyan-300 text-sm mb-2 uppercase tracking-wide">Bot</label>
                <select
                  value={settings.player2BotId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      player2BotId: e.target.value,
                    })
                  }
                  className="w-full bg-black text-green-400 px-4 py-2 border-2 border-cyan-600 focus:outline-none focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.5)] font-mono"
                >
                  {botRegistry.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Game Settings */}
        <div className="bg-black p-6 border-2 shadow-[0_0_15px_rgba(217,70,239,0.4)] mb-8" style={{ borderColor: '#d946ef' }}>
          <h2 className="text-xl font-semibold mb-6 uppercase tracking-widest" style={{ color: '#d946ef' }}>Game Settings</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm mb-2 uppercase tracking-wide font-semibold" style={{ color: '#d946ef' }}>Starting Stack</label>
              <select
                value={settings.startingStack}
                onChange={(e) => setSettings({ ...settings, startingStack: Number(e.target.value) })}
                className="w-full bg-black text-green-400 px-4 py-2 border-2 focus:outline-none focus:border-green-500 font-mono"
                style={{ borderColor: '#d946ef' }}
              >
                <option value={500}>$500</option>
                <option value={1000}>$1,000</option>
                <option value={2000}>$2,000</option>
                <option value={5000}>$5,000</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2 uppercase tracking-wide font-semibold" style={{ color: '#d946ef' }}>Blinds</label>
              <select
                value={`${settings.smallBlind}/${settings.bigBlind}`}
                onChange={(e) => {
                  const [sb, bb] = e.target.value.split('/').map(Number);
                  setSettings({ ...settings, smallBlind: sb, bigBlind: bb });
                }}
                className="w-full bg-black text-green-400 px-4 py-2 border-2 focus:outline-none focus:border-green-500 font-mono"
                style={{ borderColor: '#d946ef' }}
              >
                <option value="5/10">$5 / $10</option>
                <option value="10/20">$10 / $20</option>
                <option value="25/50">$25 / $50</option>
                <option value="50/100">$50 / $100</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2 uppercase tracking-wide font-semibold" style={{ color: '#d946ef' }}>Tables</label>
              <select
                value={settings.tablesCount}
                onChange={(e) => setSettings({ ...settings, tablesCount: Number(e.target.value) })}
                className="w-full bg-black text-green-400 px-4 py-2 border-2 focus:outline-none focus:border-green-500 font-mono"
                style={{ borderColor: '#d946ef' }}
              >
                <option value={1}>1 (1x1)</option>
                <option value={4}>4 (2x2)</option>
                <option value={9}>9 (3x3)</option>
                <option value={16}>16 (4x4)</option>
                <option value={25}>25 (5x5)</option>
                <option value={36}>36 (6x6)</option>
                <option value={49}>49 (7x7)</option>
                <option value={64}>64 (8x8)</option>
                <option value={81}>81 (9x9)</option>
                <option value={100}>100 (10x10)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2 uppercase tracking-wide font-semibold" style={{ color: '#d946ef' }}>Speed</label>
              <select
                value={settings.speedMs}
                onChange={(e) => setSettings({ ...settings, speedMs: Number(e.target.value) })}
                className="w-full bg-black text-green-400 px-4 py-2 border-2 focus:outline-none focus:border-green-500 font-mono"
                style={{ borderColor: '#d946ef' }}
              >
                <option value={1000}>Slow (1s)</option>
                <option value={500}>Normal (0.5s)</option>
                <option value={300}>Fast (0.3s)</option>
                <option value={150}>Very Fast (0.15s)</option>
                <option value={50}>Ultra (0.05s)</option>
                <option value={0}>Max (as fast as possible)</option>
              </select>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 text-red-400 uppercase tracking-wide text-sm border border-red-500 px-4 py-2">
            {errorMessage}
          </div>
        )}

        {/* Start Button */}
        <ActionButton 
          variant="primary" 
          onClick={() => {
            if (
              settings.tablesCount > 1 &&
              (settings.player1Type === 'human' ||
                settings.player2Type === 'human')
            ) {
              setErrorMessage('Multi-table requires both players to be AI.');
              return;
            }
            setErrorMessage(null);
            onStartMatch(settings);
          }}
          className="w-full py-4 text-lg uppercase tracking-widest"
        >
          Start Match
        </ActionButton>
        {import.meta.env.DEV && onOpenDev && (
          <button
            onClick={onOpenDev}
            className="mt-4 w-full px-4 py-3 text-xs uppercase tracking-wider border-2 border-cyan-500 text-cyan-400 hover:text-green-400 hover:border-green-500 transition-colors"
          >
            Dev Checks
          </button>
        )}
      </div>
    </div>
  );
}