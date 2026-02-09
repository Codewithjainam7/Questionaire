import React, { useRef, useState } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
  hoverEffect?: boolean;
  tiltEnabled?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick, 
  noPadding = false,
  hoverEffect = true,
  tiltEnabled = true
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !tiltEnabled) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate rotation (max +/- 2 degrees for subtler feel)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateY = ((x - centerX) / centerX) * 2;
    const rotateX = ((centerY - y) / centerY) * 2; 

    // Calculate glare position (percentage)
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setRotation({ x: rotateX, y: rotateY });
    setGlarePosition({ x: glareX, y: glareY });
  };

  const handleMouseEnter = () => setIsHovered(true);
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: tiltEnabled && isHovered 
          ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.005, 1.005, 1.005)` 
          : 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)',
        transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s ease',
      }}
      className={`
        relative overflow-hidden
        rounded-[32px] 
        bg-black/20 
        backdrop-blur-3xl 
        border border-white/[0.08]
        shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]
        ${hoverEffect ? 'cursor-pointer hover:border-white/[0.15] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' : ''}
        ${noPadding ? '' : 'p-6 md:p-8'} 
        ${className}
      `}
    >
      {/* Inner Gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

      {/* Dynamic Glare Overlay */}
      {tiltEnabled && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-50 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.12) 0%, transparent 60%)`,
            opacity: isHovered ? 1 : 0
          }}
        />
      )}
      
      {/* Content Layer */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};