import React from 'react';

export interface ActionLogEntry {
  id: string;
  text: string;
  timestamp?: Date;
}

export interface ActionLogProps {
  entries: ActionLogEntry[];
  className?: string;
}

export function ActionLog({ entries, className = '' }: ActionLogProps) {
  return (
    <div className={`bg-black p-4 border-2 shadow-[0_0_15px_rgba(217,70,239,0.4)] h-full flex flex-col ${className}`} style={{ borderColor: '#d946ef' }}>
      <div className="font-semibold mb-3 pb-2 border-b-2 uppercase tracking-widest" style={{ color: '#d946ef', borderColor: '#d946ef' }}>Action Log</div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {entries.length === 0 ? (
          <div className="text-sm uppercase tracking-wide" style={{ color: '#06b6d4' }}>No actions yet</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="text-green-400 text-sm py-1 font-mono">
              {entry.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}