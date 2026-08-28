import React, { useState, useEffect } from 'react';

export const InteractiveDemoUI: React.FC = () => {
  const [activeWord, setActiveWord] = useState<string>('something');
  const [time, setTime] = useState<string>('11:40:37');
  const [activePad, setActivePad] = useState<string>('sound');
  const [activeBank, setActiveBank] = useState<number>(3);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-deck-ui">
      {/* 1. Left Perforated Speaker Grille */}
      <div className="deck-speaker-grille">
        <div className="speaker-dots-matrix" />
      </div>

      {/* 2. Top-Left Controls & Matrix */}
      <div className="deck-main-section">
        {/* Top Control Bar */}
        <div className="deck-top-bar">
          <div className="vu-meter">
            <div className="vu-needle" />
            <div className="vu-scale">
              <span>-6</span><span>0</span><span>+6</span>
            </div>
          </div>
          <button className="deck-micro-btn">10-BIT</button>
          <button className="deck-micro-btn active">GATE</button>
          <button className="deck-micro-btn">CHORD</button>
          <button className="deck-micro-btn">DUST</button>
        </div>

        {/* Center Illuminated Text Canvas */}
        <div className="deck-screen-canvas">
          <div className="screen-subtext">88 BPM • MIDI ON • DSP ACTIVE</div>
          <div className="deck-prose-grid">
            <p>
              I'm Michael, and I've been <span className="highlight-word">a designer</span> and product builder.
            </p>
            <p>
              I create <span className="highlight-word glow">digital products</span> that make <span className="highlight-word">people</span>
            </p>
            <p>
              feel <span className="highlight-word active-glow">{activeWord}.</span>
            </p>
          </div>
        </div>

        {/* Bottom Piano / Keyboard Strip */}
        <div className="deck-piano-strip">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className={`piano-key ${i === 11 || i === 24 || i === 36 ? 'marked-red' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* 3. Right Bank & Status Section */}
      <div className="deck-right-section">
        {/* LCD Clock & Telemetry */}
        <div className="deck-lcd-panel">
          <div className="lcd-date">SUNDAY • AUG 25</div>
          <div className="lcd-time">{time}</div>
          <div className="lcd-telemetry">
            <span>21.4°C</span>
            <span>DSP: OK</span>
          </div>
        </div>

        {/* Bank Selector Buttons */}
        <div className="deck-banks-column">
          {[1, 2, 3, 4, 5].map((bank) => (
            <button
              key={bank}
              className={`deck-bank-btn ${activeBank === bank ? 'is-active' : ''}`}
              onClick={() => setActiveBank(bank)}
            >
              {bank}
            </button>
          ))}
        </div>

        {/* Action Pads */}
        <div className="deck-action-pads">
          {['sound', 'power', 'light', 'effects', 'analog'].map((pad) => (
            <button
              key={pad}
              className={`deck-pad-btn ${activePad === pad ? 'is-active' : ''}`}
              onClick={() => setActivePad(pad)}
            >
              <span className="pad-led" />
              <span>{pad}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
