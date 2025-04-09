import React from 'react';

const LogoIcon: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => {
  return (
    <svg 
      width="200" 
      height="200" 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient x1="0%" y1="0%" x2="100%" y2="100%" id="agendapp-gradient">
          <stop stopColor="#2563EB" offset="0%"></stop>
          <stop stopColor="#3B82F6" offset="100%"></stop>
        </linearGradient>
      </defs>
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <circle fill="url(#agendapp-gradient)" cx="100" cy="100" r="90"></circle>
        <g transform="translate(50.000000, 50.000000)" fill="#FFFFFF">
          <path d="M50,0 C77.6142375,0 100,22.3857625 100,50 C100,77.6142375 77.6142375,100 50,100 C22.3857625,100 0,77.6142375 0,50 C0,22.3857625 22.3857625,0 50,0 Z M50,20 C33.4314575,20 20,33.4314575 20,50 C20,66.5685425 33.4314575,80 50,80 C66.5685425,80 80,66.5685425 80,50 C80,33.4314575 66.5685425,20 50,20 Z" fillOpacity="0.3"></path>
          <rect x="45" y="0" width="10" height="30" rx="5"></rect>
          <rect x="45" y="70" width="10" height="30" rx="5"></rect>
          <rect x="70" y="45" width="30" height="10" rx="5"></rect>
          <rect x="0" y="45" width="30" height="10" rx="5"></rect>
          <path d="M50,30 C61.045695,30 70,38.954305 70,50 C70,61.045695 61.045695,70 50,70 C38.954305,70 30,61.045695 30,50 C30,38.954305 38.954305,30 50,30 Z" fillOpacity="0.6"></path>
          <polygon points="48 40 58 50 48 60 46 58 54 50 46 42"></polygon>
        </g>
      </g>
    </svg>
  );
};

export default LogoIcon;