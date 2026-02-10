import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '../api';
import { SOUL_ARCHITECT_SYSTEM, SOUL_EXTRACTOR_SYSTEM } from '../prompts';
import ChatMessage from './ChatMessage';
import SoulPreview from './SoulPreview';

export default function ForgeMode({
  messages,
  setMessages,
  soulDocument,
  setSoulDocument,
  starterOpener,
  setStarterOpener,
  onEnterTest,
  onBack,
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [lastExtractAt, setLastExtractAt] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-send starter opener on first mount
  useEffect(() => {
    if (starterOpener && messages.length === 0) {
      const opener = starterOpener;
      setStarterOpener(null);
      handleSend(opener);
    }
  }, []);

  const extractSoul = async (allMessages) => {
    setIsExtracting(true);
    try {
      const extractionPrompt = allMessages
        .map((m) => `${m.role === 'user' ? 'USER' : 'ARCHITECT'}: ${m.content}`)
        .join('\n\n');

      const doc = await sendMessage(
        SOUL_EXTRACTOR_SYSTEM,
        [{ role: 'user', content: extractionPrompt }],
        2048
      );
      setSoulDocument(doc);
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSend = async (overrideText) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await sendMessage(SOUL_ARCHITECT_SYSTEM, apiMessages);
      const assistantMsg = { role: 'assistant', content: reply };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      // Extract soul after every exchange
      if (newCount - lastExtractAt >= 1) {
        setLastExtractAt(newCount);
        extractSoul(updatedMessages);
      }
    } catch (err) {
      console.error('Chat error:', err);
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
    <div className={`forge-mode ${showPreview ? 'preview-open' : ''}`}>
      <div className="terminal-scanline" />
      <div className="forge-chat-area">
        <div className="forge-header">
          <button className="back-btn" onClick={onBack}>
            <span className="terminal-prompt-char">&lt;</span>
          </button>
          <div className="forge-title">
            <h1>SOUL_FORGE</h1>
            <p>// forging in progress</p>
          </div>
          <div className="forge-actions">
            <button
              className="toggle-preview-btn"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '[HIDE]' : '[SHOW]'} engine
            </button>
            {soulDocument && (
              <button className="enter-test-btn" onClick={onEnterTest}>
                TEST &rarr;
              </button>
            )}
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="chat-message assistant">
              <div className="chat-bubble">
                <div className="chat-role">ARCHITECT</div>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

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

      {showPreview && (
        <div className="forge-sidebar">
          <SoulPreview soulDocument={soulDocument} isExtracting={isExtracting} />
        </div>
      )}
    </div>
  );
}
