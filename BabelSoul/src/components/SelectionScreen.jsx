import { useState, useEffect, useRef } from 'react';
import { STARTER_SOULS } from '../prompts';

const BOOT_LINES = [
  { text: 'SOUL_FORGE v2.0', cls: 'boot-title', delay: 300 },
  { text: 'INITIALIZING...', cls: 'boot-dim', delay: 800 },
  { text: 'SYSTEM READY', cls: 'boot-ready', delay: 1400 },
  { text: '', cls: 'boot-blank', delay: 1700 },
  { text: 'Bring someone into existence.', cls: 'boot-prompt', delay: 1900 },
  {
    text: 'Real. Fictional. Imagined. From history, from a book, from your life.',
    cls: 'boot-sub',
    delay: 2500,
  },
  {
    text: 'Someone who never existed but should have.',
    cls: 'boot-sub',
    delay: 3100,
  },
];

export default function SelectionScreen({ onSelect }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay)
    );
    timers.push(setTimeout(() => setShowInput(true), 3600));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    onSelect(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="terminal-screen">
      <div className="terminal-scanline" />
      <div className="terminal-body">
        <div className="terminal-boot">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) =>
            line.text ? (
              <div key={i} className={`terminal-line ${line.cls}`}>
                {line.cls === 'boot-title' && (
                  <span className="terminal-prompt-char">&gt; </span>
                )}
                {line.cls === 'boot-dim' && (
                  <span className="terminal-prompt-char">&gt; </span>
                )}
                {line.cls === 'boot-ready' && (
                  <span className="terminal-prompt-char">&gt; </span>
                )}
                {line.text}
              </div>
            ) : (
              <div key={i} className="terminal-blank" />
            )
          )}
        </div>

        {showInput && (
          <div className="terminal-interact">
            <div className="terminal-input-row">
              <span className="terminal-caret">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                className="terminal-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="who do you have in mind?"
                spellCheck={false}
                autoComplete="off"
              />
              {input.trim() && (
                <button className="terminal-go" onClick={handleSubmit}>
                  FORGE &rarr;
                </button>
              )}
            </div>

            <div className="terminal-hints">
              try: &quot;Cleopatra&quot; &middot; &quot;my grandmother&quot; &middot;
              &quot;Hamlet&quot; &middot; &quot;a tired god&quot; &middot;
              &quot;Walter White&quot; &middot; &quot;someone I made up&quot;
            </div>

            <div className="terminal-signals">
              <div className="terminal-signals-label">
                // or intercept a signal
              </div>
              <div className="signal-grid">
                {STARTER_SOULS.map((soul) => (
                  <button
                    key={soul.id}
                    className="signal-card"
                    onClick={() => onSelect(soul.opener)}
                  >
                    <span className="signal-name">{soul.name}</span>
                    <span className="signal-sep">&mdash;</span>
                    <span className="signal-desc">{soul.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
