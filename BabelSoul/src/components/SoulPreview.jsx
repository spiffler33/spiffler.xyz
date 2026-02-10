export default function SoulPreview({ soulDocument, isExtracting }) {
  if (!soulDocument && !isExtracting) {
    return (
      <div className="soul-preview empty">
        <div className="soul-preview-header">
          <h2>Soul Preview</h2>
        </div>
        <p className="soul-preview-empty">
          The soul will begin to take shape as you converse with the Architect...
        </p>
      </div>
    );
  }

  return (
    <div className={`soul-preview ${isExtracting ? 'extracting' : ''}`}>
      <div className="soul-preview-header">
        <h2>Soul Preview</h2>
        {isExtracting && <span className="extracting-badge">Synthesizing...</span>}
      </div>
      <div className="soul-preview-content">
        {soulDocument.split('\n').map((line, i) => {
          if (line.startsWith('# ')) {
            return <h1 key={i}>{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h3 key={i}>{line.slice(3)}</h3>;
          }
          if (line.trim() === '') {
            return <br key={i} />;
          }
          return <p key={i}>{line}</p>;
        })}
      </div>
    </div>
  );
}
