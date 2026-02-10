import { useState } from 'react';
import SelectionScreen from './components/SelectionScreen';
import ForgeMode from './components/ForgeMode';
import TestMode from './components/TestMode';

export default function App() {
  const [screen, setScreen] = useState('selection');
  const [soulDocument, setSoulDocument] = useState('');
  const [forgeMessages, setForgeMessages] = useState([]);
  const [testMessages, setTestMessages] = useState([]);
  const [starterOpener, setStarterOpener] = useState(null);

  const handleSelectSoul = (opener) => {
    setStarterOpener(opener);
    setForgeMessages([]);
    setTestMessages([]);
    setSoulDocument('');
    setScreen('forge');
  };

  const handleEnterTest = () => {
    if (!soulDocument) return;
    setTestMessages([]);
    setScreen('test');
  };

  const handleBackToForge = () => {
    setScreen('forge');
  };

  const handleBackToSelection = () => {
    setScreen('selection');
  };

  return (
    <div className="app">
      {screen === 'selection' && (
        <SelectionScreen onSelect={handleSelectSoul} />
      )}
      {screen === 'forge' && (
        <ForgeMode
          messages={forgeMessages}
          setMessages={setForgeMessages}
          soulDocument={soulDocument}
          setSoulDocument={setSoulDocument}
          starterOpener={starterOpener}
          setStarterOpener={setStarterOpener}
          onEnterTest={handleEnterTest}
          onBack={handleBackToSelection}
        />
      )}
      {screen === 'test' && (
        <TestMode
          soulDocument={soulDocument}
          messages={testMessages}
          setMessages={setTestMessages}
          onBack={handleBackToForge}
        />
      )}
    </div>
  );
}
