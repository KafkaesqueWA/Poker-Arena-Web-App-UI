import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { runEffectiveStackChecks } from '../../engine/simulations/effectiveStack';
import { runHeadsUpEdgeCaseChecks } from '../../engine/simulations/headsUpEdgeCases';

interface DevScreenProps {
  onBack: () => void;
}

export function DevScreen({ onBack }: DevScreenProps) {
  const [results, setResults] = useState(
    [
      ...runEffectiveStackChecks(),
      ...runHeadsUpEdgeCaseChecks(),
    ],
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-black border-b-2 border-cyan-500 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-cyan-400 hover:text-green-400 transition-colors uppercase tracking-wide"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-xl font-semibold text-green-400 uppercase tracking-widest font-mono">Dev Checks</h1>
          <div className="w-24"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() =>
              setResults([
                ...runEffectiveStackChecks(),
                ...runHeadsUpEdgeCaseChecks(),
              ])
            }
            className="px-4 py-2 text-xs uppercase tracking-wider border-2 border-cyan-500 text-cyan-400 hover:text-green-400 hover:border-green-500 transition-colors"
          >
            Run Checks
          </button>
        </div>

        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.name}
              className="bg-black border-2 border-cyan-500 p-4 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              <div className="flex items-center justify-between">
                <div className="text-cyan-400 uppercase tracking-wide text-sm">
                  {result.name}
                </div>
                <div
                  className={`px-2 py-0.5 text-xs font-medium border-2 uppercase tracking-wider ${
                    result.passed
                      ? 'bg-green-900/30 text-green-400 border-green-500'
                      : 'bg-red-900/30 text-red-400 border-red-500'
                  }`}
                >
                  {result.passed ? 'Pass' : 'Fail'}
                </div>
              </div>
              <div className="text-cyan-300 text-sm mt-2 font-mono">
                {result.details}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
