import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Card } from './Card';
import { HandHistoryManager, HandRecord } from '../../engine';

export interface HandHistoryScreenProps {
  onBack: () => void;
  handHistories: HandHistoryManager[];
  tableResults: {
    isOver: boolean;
    winnerName?: string;
  }[];
  playerName: string;
  onUpdateHistory?: (history: HandHistoryManager) => void;
}

export function HandHistoryScreen({ onBack, handHistories, tableResults, playerName, onUpdateHistory }: HandHistoryScreenProps) {
  const [selectedHand, setSelectedHand] = useState<{
    tableIndex: number;
    hand: HandRecord;
  } | null>(null);
  const [collapsedTables, setCollapsedTables] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(handHistories.map((_, idx) => [idx, true])),
  );
  useEffect(() => {
    setCollapsedTables(
      Object.fromEntries(handHistories.map((_, idx) => [idx, true])),
    );
  }, [handHistories.length]);

  // Convert HandRecord to display format
  const getHandResult = (hand: HandRecord): 'win' | 'loss' | 'split' => {
    if (hand.winner === null) return 'split';
    return hand.winner === 0 ? 'win' : 'loss';
  };

  const getNetChange = (hand: HandRecord): number => {
    return hand.player1EndStack - hand.player1StartStack;
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Top Bar */}
      <div className="bg-black border-b-2 border-cyan-500 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-cyan-400 hover:text-green-400 transition-colors uppercase tracking-wide"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Game</span>
          </button>
          <h1 className="text-xl font-semibold text-green-400 uppercase tracking-widest font-mono">Hand History</h1>
          <div className="w-24"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {selectedHand ? (
          /* Hand Replay View */
          <div>
            <button
              onClick={() => setSelectedHand(null)}
              className="flex items-center gap-2 text-cyan-400 hover:text-green-400 mb-6 uppercase tracking-wide"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to list
            </button>

            <div className="bg-black border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] p-8">
              <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-cyan-500">
                <div>
                  <h2 className="text-2xl font-semibold text-cyan-400 mb-2 uppercase tracking-wider font-mono">Table {selectedHand.tableIndex + 1} • Hand #{selectedHand.hand.handNumber}</h2>
                  <div className="flex items-center gap-4">
                    {selectedHand.hand.winner === null ? (
                      <span className="text-lg font-semibold text-yellow-400 uppercase tracking-wide">Split Pot</span>
                    ) : (
                      <span className={`text-lg font-semibold uppercase tracking-wide ${getHandResult(selectedHand.hand) === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                        {getHandResult(selectedHand.hand) === 'win' ? 'Won' : 'Lost'}
                      </span>
                    )}
                    <span className={`text-lg font-mono ${getNetChange(selectedHand.hand) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {getNetChange(selectedHand.hand) >= 0 ? '+' : ''}${getNetChange(selectedHand.hand)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-cyan-300 text-sm uppercase tracking-wider">Final Pot</div>
                  <div className="text-yellow-400 text-2xl font-bold font-mono">${selectedHand.hand.finalPot}</div>
                </div>
              </div>

              {/* Cards Display */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-cyan-300 text-sm mb-3 uppercase tracking-wider">{selectedHand.hand.player1Name}</div>
                    <div className="flex gap-2">
                      {selectedHand.hand.player1Cards.map((card, idx) => (
                        <Card key={idx} suit={card.suit} rank={card.rank} />
                      ))}
                    </div>
                    {selectedHand.hand.player1Hand && (
                      <div className="text-green-400 text-sm mt-2">{selectedHand.hand.player1Hand.description}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-cyan-300 text-sm mb-3 uppercase tracking-wider">{selectedHand.hand.player2Name}</div>
                    <div className="flex gap-2">
                      {selectedHand.hand.player2Cards.map((card, idx) => (
                        <Card key={idx} suit={card.suit} rank={card.rank} />
                      ))}
                    </div>
                    {selectedHand.hand.player2Hand && (
                      <div className="text-green-400 text-sm mt-2">{selectedHand.hand.player2Hand.description}</div>
                    )}
                  </div>
                </div>

                {selectedHand.hand.communityCards.length > 0 && (
                  <div className="mt-6">
                    <div className="text-cyan-300 text-sm mb-3 uppercase tracking-wider">Community Cards</div>
                    <div className="flex gap-2">
                      {selectedHand.hand.communityCards.map((card, idx) => (
                        <Card key={idx} suit={card.suit} rank={card.rank} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Timeline */}
              <div>
                <div className="text-cyan-300 text-sm mb-3 uppercase tracking-wider">Action Timeline</div>
                <div className="bg-charcoal-900 border-2 border-magenta-500 p-4 space-y-2 max-h-96 overflow-y-auto">
                  {selectedHand.hand.actions.map((action, idx) => (
                    <div key={idx} className="text-green-400 text-sm py-1 font-mono">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Hand List View */
          <div>
            <h2 className="text-2xl font-semibold text-cyan-400 mb-6 uppercase tracking-widest font-mono">Completed Hands</h2>
            {handHistories.length === 0 ? (
              <div className="bg-black border-2 border-cyan-500 p-12 text-center">
                <p className="text-cyan-400 text-lg uppercase tracking-wide">No completed hands yet. Play some poker!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() =>
                      setCollapsedTables(
                        Object.fromEntries(handHistories.map((_, idx) => [idx, false])),
                      )
                    }
                    className="px-3 py-1 text-xs uppercase tracking-wider border-2 border-cyan-500 text-cyan-400 hover:text-green-400 hover:border-green-500 transition-colors"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={() =>
                      setCollapsedTables(
                        Object.fromEntries(handHistories.map((_, idx) => [idx, true])),
                      )
                    }
                    className="px-3 py-1 text-xs uppercase tracking-wider border-2 border-cyan-500 text-cyan-400 hover:text-green-400 hover:border-green-500 transition-colors"
                  >
                    Collapse All
                  </button>
                </div>
                <div
                  className="grid gap-4 items-start auto-rows-min"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(4, Math.ceil(Math.sqrt(handHistories.length || 1)))}, minmax(0, 1fr))`,
                  }}
                >
                  {handHistories.map((history, tableIndex) => (
                    <div
                      key={`history-${tableIndex}`}
                      className="bg-black border-2 border-cyan-500 p-4 shadow-[0_0_10px_rgba(6,182,212,0.3)] self-start"
                    >
                    <button
                      onClick={() =>
                        setCollapsedTables((prev) => ({
                          ...prev,
                          [tableIndex]: !prev[tableIndex],
                        }))
                      }
                      className="w-full flex items-center justify-between text-cyan-400 uppercase tracking-wide mb-3"
                    >
                      <div className="flex items-center gap-3">
                        <span>
                          Table <span className="text-green-400 font-semibold font-mono">#{tableIndex + 1}</span>
                        </span>
                        <span className="text-xs text-cyan-300">
                          {tableResults[tableIndex]?.isOver
                            ? tableResults[tableIndex]?.winnerName ?? 'Split'
                            : 'In Progress'}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-cyan-600 transition-transform ${
                          collapsedTables[tableIndex] ? '' : 'rotate-90'
                        }`}
                      />
                    </button>
                    {!collapsedTables[tableIndex] && (
                      <>
                        {history.hands.length === 0 ? (
                          <div className="text-cyan-400 text-sm uppercase tracking-wide">No hands yet</div>
                        ) : (
                          <div className="space-y-2">
                            {[...history.hands].reverse().map((hand) => {
                              const result = getHandResult(hand);
                              const netChange = getNetChange(hand);
                              
                              return (
                                <button
                                  key={hand.handNumber}
                                  onClick={() => setSelectedHand({ tableIndex, hand })}
                                  className="w-full bg-black hover:bg-charcoal-900 border-2 border-cyan-500 hover:border-green-500 p-3 transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] text-left group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="text-cyan-400 uppercase tracking-wide text-sm">
                                        Hand <span className="text-green-400 font-semibold font-mono">#{hand.handNumber}</span>
                                      </div>
                                      <div className={`px-2 py-0.5 text-xs font-medium border-2 uppercase tracking-wider ${
                                        result === 'win' 
                                          ? 'bg-green-900/30 text-green-400 border-green-500' 
                                          : result === 'loss'
                                          ? 'bg-red-900/30 text-red-400 border-red-500'
                                          : 'bg-yellow-900/30 text-yellow-400 border-yellow-500'
                                      }`}>
                                        {result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Split'}
                                      </div>
                                      <div className={`text-sm font-semibold font-mono ${netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {netChange >= 0 ? '+' : ''}${netChange}
                                      </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-cyan-600 group-hover:text-green-400 transition-colors" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}