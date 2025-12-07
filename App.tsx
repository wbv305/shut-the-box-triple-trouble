import React, { useState, useEffect } from 'react';
import { Dice } from './components/Dice';
import { Tile } from './components/Tile';
import { TileData, GameStatus, DiceState, GameStats } from './types';
import { isTileAvailable, canMakeSum, rollDie, calculateScore } from './utils';
import { Trophy, RefreshCcw, Info, BarChart2 } from 'lucide-react';

// Setup initial board
const createInitialTiles = (): TileData[] => {
  const tiles: TileData[] = [];
  // Row 2 (Back/Top) -> 1-9
  // Row 1 (Mid)      -> 9-1 (Descending)
  // Row 0 (Front)    -> 1-9
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      let val = c + 1;
      if (r === 1) {
        val = 9 - c; // Reverse order for the middle row
      }
      
      tiles.push({
        id: `r${r}-c${c}`,
        row: r,
        col: c,
        value: val,
        status: 'open',
      });
    }
  }
  return tiles;
};

const STATS_STORAGE_KEY = 'shut-the-box-triple-trouble-stats';

const App: React.FC = () => {
  const [tiles, setTiles] = useState<TileData[]>(createInitialTiles());
  const [dice, setDice] = useState<DiceState>({ values: [1, 1], rolling: false });
  const [diceCount, setDiceCount] = useState<1 | 2>(2);
  const [status, setStatus] = useState<GameStatus>('start');
  const [turnPhase, setTurnPhase] = useState<'roll' | 'select'>('roll');
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('Roll the dice to start!');
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  
  // Celebration State
  const [celebratedSingleBox, setCelebratedSingleBox] = useState(false);
  const [celebratedDoubleBox, setCelebratedDoubleBox] = useState(false);
  const [tempOverlay, setTempOverlay] = useState<{message: string, type: 'single' | 'double'} | null>(null);

  // Stats State with LocalStorage persistence
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const savedStats = localStorage.getItem(STATS_STORAGE_KEY);
      if (savedStats) {
        return JSON.parse(savedStats);
      }
    } catch (error) {
      console.error("Failed to load stats from localStorage:", error);
    }
    return {
      gamesPlayed: 0,
      lastScore: null,
      totalScore: 0,
      cleanSingleShuts: 0,
      cleanDoubleShuts: 0,
      wins: 0
    };
  });

  // Save stats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("Failed to save stats to localStorage:", error);
    }
  }, [stats]);

  // Computed Values
  const diceSum = dice.values[0] + dice.values[1];
  const selectedSum = tiles
    .filter((t) => selectedTileIds.includes(t.id))
    .reduce((acc, t) => acc + t.value, 0);

  // Logic for 1-die rule:
  // User must be on the final row (Row 0 and 1 are fully shut)
  // AND all remaining numbers must be 6 or smaller.
  const isFinalRow = tiles.filter(t => (t.row === 0 || t.row === 1) && t.status === 'open').length === 0;
  const maxOpenValue = Math.max(0, ...tiles.filter(t => t.status === 'open').map(t => t.value));
  const canRollOneDie = isFinalRow && maxOpenValue <= 6 && status !== 'won' && status !== 'lost';

  // Reset dice count to 2 if the condition is no longer met (e.g. new game)
  useEffect(() => {
    if (!canRollOneDie && turnPhase === 'roll') {
      setDiceCount(2);
    }
  }, [canRollOneDie, turnPhase]);

  // Handle Win/Loss effects
  useEffect(() => {
    if (status === 'won') {
      setMessage('Congratulations! You shut the box!');
      if (window.confetti) {
        const duration = 3000;
        const end = Date.now() + duration;
        const frame = () => {
          window.confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#a855f7', '#2563eb', '#0d9488'] // Purple, Blue, Teal
          });
          window.confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#a855f7', '#2563eb', '#0d9488']
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }
    } else if (status === 'lost') {
      setMessage('Game Over! No moves available.');
    }
  }, [status]);

  // Roll Dice Action
  const handleRoll = () => {
    if (status === 'lost' || status === 'won') {
      handleReset();
      return;
    }

    setDice((prev) => ({ ...prev, rolling: true }));
    setStatus('playing');
    setMessage('Rolling...');
    
    setTimeout(() => {
      const d1 = rollDie();
      // If diceCount is 1, d2 is 0. 
      const d2 = diceCount === 2 ? rollDie() : 0;
      const newSum = d1 + d2;
      setDice({ values: [d1, d2], rolling: false });
      
      // Check for loss condition immediately after roll using updated logic
      if (!canMakeSum(newSum, tiles)) {
        setStatus('lost');
        // Update Stats for Loss
        const finalScore = calculateScore(tiles);
        setStats(prev => ({
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          lastScore: finalScore,
          totalScore: prev.totalScore + finalScore
        }));
      } else {
        setTurnPhase('select');
        setMessage(`Select tiles that sum to ${newSum}`);
      }
    }, 600);
  };

  const handleTileClick = (clickedTile: TileData) => {
    if (status !== 'playing' || dice.rolling || turnPhase !== 'select') return;

    if (selectedTileIds.includes(clickedTile.id)) {
      // Deselecting: Remove this tile AND any dependent tiles behind it
      setSelectedTileIds((prev) => {
        // Find tiles that need to be removed:
        // 1. The clicked tile
        // 2. Any selected tile in the same column with a row index > clickedTile.row
        const idsToRemove = [clickedTile.id];
        const dependentTiles = tiles.filter(t => 
           t.col === clickedTile.col && 
           t.row > clickedTile.row && 
           prev.includes(t.id)
        );
        dependentTiles.forEach(t => idsToRemove.push(t.id));

        return prev.filter(id => !idsToRemove.includes(id));
      });
    } else {
      // Allow selection
      setSelectedTileIds((prev) => [...prev, clickedTile.id]);
    }
  };

  const confirmMove = () => {
    if (selectedSum !== diceSum) {
      return;
    }

    // Shut the selected tiles
    const newTiles = tiles.map((t) => {
      if (selectedTileIds.includes(t.id)) {
        return { ...t, status: 'shut' as const };
      }
      return t;
    });

    setTiles(newTiles);
    setSelectedTileIds([]);

    // Check Win Condition
    const isWin = newTiles.every((t) => t.status === 'shut');
    if (isWin) {
      setStatus('won');
      // Update Stats for Win
      setStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        wins: prev.wins + 1,
        lastScore: 0,
        // totalScore doesn't change on a win (score 0)
      }));
    } else {
      setTurnPhase('roll');
      setMessage("Roll again!");
    }

    // --- Milestone Celebrations & Stats ---
    const r0ShutCount = newTiles.filter(t => t.row === 0 && t.status === 'shut').length;
    const r1ShutCount = newTiles.filter(t => t.row === 1 && t.status === 'shut').length;
    const r2ShutCount = newTiles.filter(t => t.row === 2 && t.status === 'shut').length;

    let newSingleShut = false;
    let newDoubleShut = false;

    // Single Box Celebration: Row 0 fully shut, Row 1 & 2 untouched
    if (!celebratedSingleBox && r0ShutCount === 9 && r1ShutCount === 0 && r2ShutCount === 0) {
      setCelebratedSingleBox(true);
      newSingleShut = true;
      setTempOverlay({ type: 'single', message: "You shut the single box! Keep going!" });
      setTimeout(() => setTempOverlay(null), 4000);
    }

    // Double Box Celebration: Row 0 & 1 fully shut, Row 2 untouched
    if (!celebratedDoubleBox && r0ShutCount === 9 && r1ShutCount === 9 && r2ShutCount === 0) {
      setCelebratedDoubleBox(true);
      newDoubleShut = true;
      setTempOverlay({ type: 'double', message: "You shut the double box! Keep going!" });
      
      // Firework effect for Double Box
      if (window.confetti) {
        const count = 200;
        const defaults = { origin: { y: 0.7 } };
        const fire = (particleRatio: number, opts: any) => {
          window.confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        };
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      }

      setTimeout(() => setTempOverlay(null), 4000);
    }

    // Update Clean Shut Stats immediately if triggered
    if (newSingleShut || newDoubleShut) {
      setStats(prev => ({
        ...prev,
        cleanSingleShuts: prev.cleanSingleShuts + (newSingleShut ? 1 : 0),
        cleanDoubleShuts: prev.cleanDoubleShuts + (newDoubleShut ? 1 : 0)
      }));
    }
  };

  const handleReset = () => {
    setTiles(createInitialTiles());
    setStatus('start');
    setTurnPhase('roll');
    setDice({ values: [1, 1], rolling: false });
    setDiceCount(2);
    setSelectedTileIds([]);
    setMessage('Roll the dice to start!');
    setCelebratedSingleBox(false);
    setCelebratedDoubleBox(false);
    setTempOverlay(null);
  };

  // Render helpers
  const renderRow = (rowIdx: number) => {
    const rowTiles = tiles
      .filter((t) => t.row === rowIdx)
      .sort((a, b) => a.col - b.col);

    return (
      // Added pointer-events-none to the grid container
      <div className="grid grid-cols-9 gap-1 sm:gap-2 w-full h-full pointer-events-none">
        {rowTiles.map((tile) => (
          <Tile
            key={tile.id}
            tile={tile}
            available={isTileAvailable(tile, tiles, selectedTileIds) && status === 'playing' && turnPhase === 'select'}
            selected={selectedTileIds.includes(tile.id)}
            onClick={handleTileClick}
          />
        ))}
      </div>
    );
  };

  // Determine if the second die should be visible
  const showSecondDie = dice.rolling 
    ? diceCount === 2 
    : turnPhase === 'select' 
        ? dice.values[1] > 0 
        : diceCount === 2;

  return (
    <div className="min-h-screen text-gray-100 flex flex-col items-center p-4">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-6 mt-4">
        <div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#eecfa1] tracking-tight drop-shadow-md">
            Shut the Box: Triple Trouble
          </h1>
        </div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Instructions"
        >
          <Info className="w-6 h-6 text-[#eecfa1]" />
        </button>
      </header>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-xl max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-[#eecfa1] mb-4">How to Play</h2>
            <ul className="space-y-2 text-gray-300 list-disc pl-5">
              <li>Roll the dice to get a target sum.</li>
              <li>Select <strong>available</strong> tiles that add up to that sum.</li>
              <li>Row order: <span className="text-purple-400">Purple</span> (Front) &rarr; <span className="text-blue-400">Blue</span> (Middle) &rarr; <span className="text-teal-400">Teal</span> (Back).</li>
              <li>A tile is available if the one in front of it is <strong>shut</strong> or currently <strong>selected</strong>.</li>
              <li>Shut all tiles to win!</li>
              <li>If you reach the final row and all open tiles are 6 or less, you can choose to roll 1 die.</li>
              <li><strong>Scoring:</strong> Front row tiles = 3x face value. Middle = 2x. Back = 1x. Lower score is better!</li>
            </ul>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-2 bg-[#eecfa1] text-[#3e2723] font-bold rounded hover:bg-[#dabb8c]"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Game Over / Stats Summary Overlay - Moved to fixed positioning outside game container */}
      {(status === 'won' || status === 'lost') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-md border-2 border-[#eecfa1]/30 p-6 sm:p-8 rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="text-center mb-6">
              <h2 className={`text-4xl font-black mb-2 ${status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                {status === 'won' ? 'YOU WON!' : 'GAME OVER'}
              </h2>
              <div className="text-6xl font-mono font-bold text-[#eecfa1] my-4">
                {status === 'won' ? 0 : calculateScore(tiles)}
              </div>
              <p className="text-gray-400 uppercase tracking-widest text-sm">Final Score</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
                  <div className="text-xs text-gray-400 uppercase">Games</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
                  <div className="text-xs text-gray-400 uppercase">Wins</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.cleanSingleShuts}</div>
                  <div className="text-xs text-gray-400 uppercase">Single Shuts</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-pink-400">{stats.cleanDoubleShuts}</div>
                  <div className="text-xs text-gray-400 uppercase">Double Shuts</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center col-span-2">
                  <div className="text-2xl font-bold text-blue-300">
                    {stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0}
                  </div>
                  <div className="text-xs text-gray-400 uppercase">Average Score</div>
                </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-4 bg-[#eecfa1] hover:bg-[#dabb8c] text-[#3e2723] font-black text-xl rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-6 h-6" />
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Game Board (The Box) */}
      <div className="relative w-full max-w-5xl bg-[#110505] rounded-3xl p-2 sm:p-6 md:p-12 shadow-[inset_0_0_80px_rgba(0,0,0,1)] border-8 border-[#2a1810]">
        
        {/* Celebration Overlay */}
        {tempOverlay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
             <div className="bg-black/60 backdrop-blur-sm p-8 rounded-2xl animate-in fade-in zoom-in duration-300">
               <h2 className={`
                 text-4xl sm:text-6xl font-black text-center leading-tight drop-shadow-2xl
                 ${tempOverlay.type === 'single' 
                    ? 'bg-gradient-to-r from-red-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent animate-pulse' 
                    : 'bg-gradient-to-br from-pink-500 via-green-400 to-blue-500 bg-clip-text text-transparent animate-bounce'
                 }
               `}>
                 {tempOverlay.message}
               </h2>
             </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Back Row (Teal - Row 2) */}
          <div className="w-full z-0 relative">
            {renderRow(2)}
          </div>
          
          {/* Middle Row (Blue - Row 1) - Overlaps Back Row */}
          <div className="w-full z-10 relative -mt-10 sm:-mt-16 lg:-mt-20 pointer-events-none">
             {renderRow(1)}
          </div>
          
          {/* Front Row (Purple - Row 0) - Overlaps Middle Row */}
          <div className="w-full z-20 relative -mt-10 sm:-mt-16 lg:-mt-20 pointer-events-none">
             {renderRow(0)}
          </div>
        </div>
      </div>

      {/* Controls Area */}
      <div className="mt-8 w-full max-w-lg flex flex-col items-center gap-6 z-30 relative">
        
        {/* Message Banner */}
        <div className={`
          px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 text-center
          ${status === 'won' ? 'bg-green-600 text-white scale-110 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : ''}
          ${status === 'lost' ? 'bg-red-600 text-white' : ''}
          ${status === 'playing' ? 'bg-black/50 backdrop-blur-md border border-white/10 text-[#eecfa1]' : ''}
          ${status === 'start' ? 'bg-black/50 backdrop-blur-md border border-white/10 text-[#eecfa1] animate-pulse' : ''}
        `}>
          {status === 'playing' && turnPhase === 'select' && selectedSum > 0 ? (
            <span className={selectedSum === diceSum ? 'text-green-400' : selectedSum > diceSum ? 'text-red-400' : 'text-yellow-400'}>
              Selected: {selectedSum} / {diceSum}
            </span>
          ) : (
            message
          )}
        </div>

        {/* Dice & Actions */}
        <div className="flex flex-col items-center gap-4 bg-black/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
            
            {/* Dice Selector (Only visible if condition met) */}
            {canRollOneDie && turnPhase === 'roll' && (
              <div className="flex bg-black/60 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setDiceCount(1)}
                  className={`px-3 py-1 text-sm rounded transition-all duration-200 ${diceCount === 1 ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  1 Die
                </button>
                <button
                  onClick={() => setDiceCount(2)}
                  className={`px-3 py-1 text-sm rounded transition-all duration-200 ${diceCount === 2 ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  2 Dice
                </button>
              </div>
            )}

            <div className="flex items-center gap-8">
              <div className="flex gap-4 min-w-[144px] justify-center">
                  <Dice value={dice.values[0]} rolling={dice.rolling} />
                  {showSecondDie && <Dice value={dice.values[1]} rolling={dice.rolling} />}
              </div>

              <div className="flex flex-col gap-3">
                  {status === 'playing' && !dice.rolling && turnPhase === 'select' ? (
                      <button
                          onClick={confirmMove}
                          disabled={selectedSum !== diceSum}
                          className={`
                              px-8 py-3 rounded-lg font-bold text-lg shadow-lg transition-all
                              ${selectedSum === diceSum 
                                  ? 'bg-green-600 hover:bg-green-500 text-white translate-y-0' 
                                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                          `}
                      >
                          Shut Tiles
                      </button>
                  ) : (
                      <button
                          onClick={handleRoll}
                          disabled={dice.rolling}
                          className={`
                              px-8 py-3 rounded-lg font-bold text-lg shadow-lg transition-all flex items-center gap-2 whitespace-nowrap
                              ${status === 'won' || status === 'lost' 
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                                  : 'bg-[#eecfa1] hover:bg-[#dabb8c] text-[#3e2723]'}
                          `}
                      >
                          {status === 'won' || status === 'lost' ? <RefreshCcw size={20}/> : <Trophy size={20} className="hidden" />}
                          {status === 'start' ? 'Start Game' : status === 'won' || status === 'lost' ? 'Play Again' : 'Roll Dice'}
                      </button>
                  )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;