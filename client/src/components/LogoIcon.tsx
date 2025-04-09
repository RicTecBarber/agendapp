import React from 'react';

interface LogoIconProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ 
  className = "h-8 w-8", 
  showText = false,
  textClassName = "text-xl font-display font-bold ml-2 text-white"
}) => {
  return (
    <>
      <svg 
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="neon-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFFF" />
            <stop offset="100%" stopColor="#0080FF" />
          </linearGradient>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g stroke="none" strokeWidth="0" fill="none" fillRule="evenodd">
          {/* Calendario com cantos arredondados */}
          <rect 
            x="40" 
            y="45" 
            width="120" 
            height="120" 
            rx="20" 
            stroke="url(#neon-blue-gradient)" 
            strokeWidth="10" 
            filter="url(#neon-glow)"
          />
          
          {/* Pinos superiores do calendário */}
          <rect 
            x="65" 
            y="25" 
            width="15" 
            height="30" 
            rx="7.5" 
            fill="url(#neon-blue-gradient)" 
            filter="url(#neon-glow)" 
          />
          
          <rect 
            x="120" 
            y="25" 
            width="15" 
            height="30" 
            rx="7.5" 
            fill="url(#neon-blue-gradient)" 
            filter="url(#neon-glow)"
          />
          
          {/* Marca de verificação dentro do calendário */}
          <path 
            d="M70,110 L90,130 L140,80" 
            stroke="url(#neon-blue-gradient)" 
            strokeWidth="15" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            filter="url(#neon-glow)"
          />
        </g>
      </svg>
      
      {showText && (
        <span className={textClassName}>Agendapp</span>
      )}
    </>
  );
};

export default LogoIcon;