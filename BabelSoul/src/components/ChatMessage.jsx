export default function ChatMessage({ role, content }) {
  return (
    <div className={`chat-message ${role}`}>
      <div className="chat-bubble">
        <div className="chat-role">{role === 'user' ? 'YOU' : 'ARCHITECT'}</div>
        <div className="chat-content">{content}</div>
      </div>
    </div>
  );
}
