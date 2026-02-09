import React, { useEffect, useState, useRef } from 'react';
import { Layers } from 'lucide-react';

interface BootSequenceProps {
  onComplete: () => void;
}

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const totalDuration = 2500; // 2.5 seconds boot time
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const x = Math.min(1, elapsed / totalDuration);
      
      // Cubic ease out for natural loading feel
      const easedProgress = (1 - Math.pow(1 - x, 3)) * 100;

      if (x >= 1) {
        clearInterval(interval);
        setProgress(100);
        
        if (!completedRef.current) {
            completedRef.current = true;
            setIsExiting(true);
            setTimeout(() => {
                onComplete();
            }, 800); // Wait for exit animation
        }
      } else {
        setProgress(easedProgress);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out overflow-hidden font-sans bg-black ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}
    >
        {/* Dynamic Abstract Wallpaper Background (Provides the color for glass refraction) */}
        <div className="absolute inset-0 overflow-hidden">
             <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-brand-indigo/30 rounded-full blur-[120px] animate-pulse-slow"></div>
             <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-brand-violet/20 rounded-full blur-[100px] animate-float"></div>
             <div className="absolute top-[40%] left-[40%] w-[40vw] h-[40vw] bg-brand-emerald/10 rounded-full blur-[80px] animate-spin-reverse"></div>
        </div>

        {/* Heavy Frost Layer */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col items-center gap-10">
            
            {/* Logo Container - Futuristic Glass Squircle */}
            <div className="relative group">
                {/* Ambient Glow behind logo */}
                <div className="absolute inset-0 bg-brand-primary/40 blur-2xl rounded-[40px] scale-75 opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
                
                {/* Glass Box */}
                <div className="w-32 h-32 rounded-[36px] bg-white/[0.07] backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-hidden transition-transform duration-700 hover:scale-105">
                    {/* Inner sheen */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-50"></div>
                    
                    <Layers size={56} className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] relative z-10" strokeWidth={1.5} />
                    
                    {/* Reflection highlight */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-[36px]"></div>
                </div>
            </div>
            
            {/* Typography */}
            <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tight drop-shadow-lg">
                    EduHub<span className="text-brand-primary font-normal">Pro</span>
                </h1>
                <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.4em]">Personal Study OS</p>
            </div>
            
            {/* iOS 26 Glass Progress Bar */}
            <div className="w-64 h-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 p-[2px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] relative overflow-hidden mt-4">
                <div 
                    className="h-full bg-gradient-to-r from-brand-indigo via-brand-violet to-white rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)] relative overflow-hidden"
                    style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
                >
                    {/* Animated Glare */}
                    <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-r from-transparent via-white/80 to-transparent transform translate-x-full animate-[scan_2s_linear_infinite]" style={{ animationDirection: 'normal' }}></div>
                    <div className="absolute inset-0 bg-white/20 opacity-50"></div>
                </div>
            </div>
      </div>
    </div>
  );
};