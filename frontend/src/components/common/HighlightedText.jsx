import React from 'react';

/**
 * Renders text with custom highlight tags [[mod:#color:Name]]...[[/mod]]
 */
export const HighlightedText = ({ text, className = "" }) => {
  if (!text || typeof text !== 'string') return text;
  
  const regex = /\[\[mod:(#[0-9A-F]{6}|#[0-9A-F]{3}|[a-z]+):(.*?)]]([\s\S]*?)\[\[\/mod]]/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    const [_, color, name, content] = match;
    parts.push(
      <span 
        key={match.index} 
        className="relative group inline-block"
      >
        <span 
          style={{ 
            backgroundColor: `${color}15`,
            borderBottom: `2px solid ${color}`,
          }}
          className="px-1 rounded-sm text-slate-900 dark:text-white"
        >
          {content}
        </span>
        <span 
          style={{ backgroundColor: color }}
          className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black text-white rounded uppercase tracking-tighter shadow-sm"
        >
          {name}
        </span>
      </span>
    );
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return (
    <div className={className}>
      {parts.length > 0 ? parts : text}
    </div>
  );
};

export default HighlightedText;
