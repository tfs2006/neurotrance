import React from 'react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-900 border border-cyan-900/50 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-[0_0_50px_rgba(0,255,255,0.1)] flex flex-col">
        <div className="p-6 border-b border-cyan-900/30 flex justify-between items-center sticky top-0 bg-gray-900/95 backdrop-blur z-10">
          <h2 className="text-xl text-cyan-400 font-bold tracking-widest uppercase font-mono">
            {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-red-400 transition-colors font-mono text-xs uppercase border border-gray-800 hover:border-red-900 px-3 py-1 rounded"
          >
            [CLOSE_TERMINAL]
          </button>
        </div>
        
        <div className="p-8 text-gray-300 font-mono text-xs md:text-sm space-y-6 leading-relaxed">
          {type === 'privacy' ? (
            <>
              <div>
                <p className="text-cyan-600 mb-1 uppercase tracking-wider">Effective Date</p>
                <p>{new Date().getFullYear()}-01-01</p>
              </div>
              
              <p>NeuroTrance ("we", "our", or "us") operates this generative audio application. This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of data when you use our Service.</p>
              
              <div>
                <h3 className="text-cyan-200 font-bold mb-2 uppercase border-l-2 border-cyan-500 pl-2">1. Data Collection</h3>
                <p>We do not collect, store, or transmit any personal data, audio data, or usage analytics to external servers. All audio generation happens locally within your browser using the Web Audio API (Client-Side computation).</p>
              </div>
              
              <div>
                <h3 className="text-cyan-200 font-bold mb-2 uppercase border-l-2 border-cyan-500 pl-2">2. Local Storage</h3>
                <p>We may use local storage or cookies solely to persist your interface preferences (such as volume, mood settings, or generated seeds) between sessions. No tracking cookies or third-party analytics are employed.</p>
              </div>
              
              <div>
                <h3 className="text-cyan-200 font-bold mb-2 uppercase border-l-2 border-cyan-500 pl-2">3. Contact</h3>
                <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:neurotrance@4ourmedia.com" className="text-cyan-400 hover:underline">neurotrance@4ourmedia.com</a>.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-cyan-600 mb-1 uppercase tracking-wider">Last Updated</p>
                <p>{new Date().getFullYear()}-01-01</p>
              </div>

              <p>Please read these Terms of Service ("Terms") carefully before using the NeuroTrance application.</p>
              
              <div>
                <h3 className="text-cyan-200 font-bold mb-2 uppercase border-l-2 border-cyan-500 pl-2">1. Acceptance</h3>
                <p>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.</p>
              </div>
              
              <div>
                <h3 className="text-cyan-200 font-bold mb-2 uppercase border-l-2 border-cyan-500 pl-2">2. Usage & License</h3>
                <p>This application is provided for entertainment and demonstration purposes only. The audio is generated algorithmically in real-time. You are free to use the audio generated for personal or commercial use, attributed to NeuroTrance where possible.</p>
              </div>
              
              <div>
                <h3 className="text-cyan-200 font-bold mb-2 uppercase border-l-2 border-cyan-500 pl-2">3. Disclaimer</h3>
                <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties regarding the uptime, availability, or audio safety of the Service. Please use caution with volume levels.</p>
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-cyan-900/30 bg-gray-900/50 text-center">
           <p className="text-[10px] text-gray-600 uppercase">End of Document // NeuroTrance_Sys_V2</p>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;