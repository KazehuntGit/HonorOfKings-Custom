
import React from 'react';
import { Button } from './Button';

interface CookieConsentProps {
  onAccept: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-in">
      {/* Decorative Top Border */}
      <div className="h-1 w-full bg-gradient-to-r from-[#05090f] via-[#dcb06b] to-[#05090f] shadow-[0_0_15px_#dcb06b]"></div>
      
      <div className="bg-[#0a1a2f]/95 backdrop-blur-xl border-t border-[#dcb06b]/30 p-6 md:p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-[#dcb06b] font-cinzel font-bold text-lg mb-2 flex items-center justify-center md:justify-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              SYSTEM NOTICE: DATA PERSISTENCE
            </h3>
            <p className="text-[#8a9db8] font-orbitron text-xs leading-relaxed tracking-wide">
              We utilize <span className="text-white font-bold">Local Browser Storage</span> to store your Squad Roster and Battle Logs directly on your device. 
              This ensures your data remains safe even if you close or refresh the page. No data is sent to external servers.
            </p>
          </div>

          <div className="flex gap-4 shrink-0">
             <Button 
                onClick={onAccept} 
                className="px-8 py-3 text-sm shadow-[0_0_20px_rgba(220,176,107,0.3)] hover:scale-105 transition-transform"
             >
                ACKNOWLEDGE & PROCEED
             </Button>
          </div>

        </div>
      </div>
    </div>
  );
};
