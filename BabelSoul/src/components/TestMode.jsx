import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '../api';
import { TEST_MODE_SYSTEM_PREFIX, QUICK_TEST_QUESTIONS } from '../prompts';

export default function TestMode({ soulDocument, messages, setMessages, onBack }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const systemPrompt = TEST_MODE_SYSTEM_PREFIX + soulDocument;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (overrideText) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setShowQuestions(false);

    try {
      const reply = await sendMessage(systemPrompt, newMessages);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Test chat error:', err);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="test-mode">
      <div className="terminal-scanline" />
      <div className="test-header">
        <button className="back-btn" onClick={onBack}>
          <span className="terminal-prompt-char">&lt;</span> FORGE
        </button>
        <div className="test-title">
          <h1>THE_TEST</h1>
          <p>// talk to who you've built</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && showQuestions && (
          <div className="quick-questions">
            <p className="quick-questions-label">// quick-fire probes</p>
            <div className="quick-questions-grid">
              {QUICK_TEST_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="quick-question-btn"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-bubble">
              <div className="chat-role">
                {msg.role === 'user' ? 'YOU' : 'THE_SOUL'}
              </div>
              <div className="chat-content">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="chat-bubble">
              <div className="chat-role">THE_SOUL</div>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {messages.length > 0 && (
        <div className="quick-questions-bar">
          <button
            className="show-questions-btn"
            onClick={() => setShowQuestions(!showQuestions)}
          >
            {showQuestions ? '[HIDE]' : '// probes'}
          </button>
          {showQuestions && (
            <div className="quick-questions-inline">
              {QUICK_TEST_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="quick-question-chip"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="chat-input-area">
        <span className="input-caret">&gt;</span>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="speak..."
          rows={2}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
