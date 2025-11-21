import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface CodeLogProps {
  logs: LogEntry[];
}

const CodeLog: React.FC<CodeLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="w-full h-full overflow-hidden font-mono text-xs p-4 flex flex-col justify-end">
      {logs.map((log) => (
        <div 
          key={log.id} 
          className={`mb-1 whitespace-nowrap animate-fade-in-right`}
          style={{ opacity: Math.max(0.3, 1 - (Date.now() - log.timestamp) / 5000) }}
        >
          <span className="text-gray-600">[{new Date(log.timestamp).toISOString().split('T')[1].replace('Z', '')}]</span>
          <span className={`mx-2 ${
            log.type === 'event' ? 'text-fuchsia-400 font-bold' : 
            log.type === 'exec' ? 'text-cyan-400' : 
            'text-green-400'
          }`}>
            {log.type === 'exec' ? '>' : '#'}
          </span>
          <span className={`${
             log.type === 'event' ? 'text-fuchsia-200' : 
             log.type === 'exec' ? 'text-cyan-200' : 
             'text-green-200'
          }`}>
            {log.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default CodeLog;