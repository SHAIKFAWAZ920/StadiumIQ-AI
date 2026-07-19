import React, { useState, useEffect } from 'react';
import { Settings, Eye, ZoomIn, Volume2, VolumeX } from 'lucide-react';

export const AccessibilityWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'standard' | 'large' | 'xlarge'>('standard');
  const [voiceAssist, setVoiceAssist] = useState(false);

  // Apply high contrast styling to body
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('accessibility-high-contrast');
    } else {
      document.body.classList.remove('accessibility-high-contrast');
    }
  }, [highContrast]);

  // Apply font size overrides to body
  useEffect(() => {
    if (fontSize === 'large' || fontSize === 'xlarge') {
      document.body.classList.add('accessibility-large-text');
    } else {
      document.body.classList.remove('accessibility-large-text');
    }
  }, [fontSize]);

  // Screen reader / Voice narrations on hover
  useEffect(() => {
    if (!voiceAssist) return;

    const handleHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Narrate semantic tags, cards, and interactive elements
      if (
        target &&
        (target.tagName === 'H1' ||
          target.tagName === 'H2' ||
          target.tagName === 'H3' ||
          target.tagName === 'H4' ||
          target.tagName === 'P' ||
          target.tagName === 'BUTTON' ||
          target.classList.contains('glass-card') ||
          target.classList.contains('metric-card'))
      ) {
        const text = target.innerText || target.getAttribute('aria-label') || '';
        if (text) {
          window.speechSynthesis.cancel(); // stop current speech
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      }
    };

    document.addEventListener('mouseover', handleHover);
    return () => {
      document.removeEventListener('mouseover', handleHover);
      window.speechSynthesis.cancel();
    };
  }, [voiceAssist]);

  return (
    <div className="fixed bottom-24 left-6 z-50 flex flex-col items-start gap-3">
      {/* Settings Popover */}
      {isOpen && (
        <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#070f1e]/95 backdrop-blur-md shadow-2xl flex flex-col gap-3 min-w-[220px] text-xs text-white transition-all duration-300">
          <div className="font-bold border-b border-white/10 pb-2 flex justify-between items-center text-fifa-accent">
            <span>ACCESSIBILITY PORTAL</span>
          </div>

          {/* High Contrast Mode */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`flex items-center justify-between p-2 rounded-lg transition ${
              highContrast ? 'bg-fifa-accent text-black font-semibold' : 'bg-white/5 hover:bg-white/10'
            }`}
            aria-label="Toggle High Contrast Theme"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>High Contrast Mode</span>
            </div>
            <span className="text-[10px] opacity-80">{highContrast ? 'ON' : 'OFF'}</span>
          </button>

          {/* Text Sizing */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-fifa-textSecondary uppercase tracking-wider">Font Sizing</span>
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setFontSize('standard')}
                className={`py-1 rounded text-[10px] transition ${
                  fontSize === 'standard' ? 'bg-fifa-emerald text-white' : 'hover:bg-white/5'
                }`}
                aria-label="Set Standard Text Size"
              >
                100%
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`py-1 rounded text-[10px] transition ${
                  fontSize === 'large' ? 'bg-fifa-emerald text-white' : 'hover:bg-white/5'
                }`}
                aria-label="Set Large Text Size"
              >
                125%
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`py-1 rounded text-[10px] transition ${
                  fontSize === 'xlarge' ? 'bg-fifa-emerald text-white' : 'hover:bg-white/5'
                }`}
                aria-label="Set Extra Large Text Size"
              >
                150%
              </button>
            </div>
          </div>

          {/* Voice Assistance */}
          <button
            onClick={() => setVoiceAssist(!voiceAssist)}
            className={`flex items-center justify-between p-2 rounded-lg transition ${
              voiceAssist ? 'bg-fifa-accent text-black font-semibold' : 'bg-white/5 hover:bg-white/10'
            }`}
            aria-label="Toggle Screen Reader Voice Assistance"
          >
            <div className="flex items-center gap-2">
              {voiceAssist ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>Voice Assist Mode</span>
            </div>
            <span className="text-[10px] opacity-80">{voiceAssist ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}

      {/* Floating Toggle Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-[#0d3478] to-[#1253c7] hover:scale-105 border border-white/20 flex items-center justify-center shadow-lg transition-transform duration-300 group"
        aria-label="Accessibility Settings Portal"
        title="Accessibility Tools"
      >
        <Settings className="w-6 h-6 text-white group-hover:rotate-45 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default AccessibilityWidget;
