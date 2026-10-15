import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 28,
  className = '',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105 drop-shadow-[0_4px_16px_rgba(99,102,241,0.45)]"
      >
        <defs>
          {/* Main Primary Gradient: Violet -> Indigo -> Cyan */}
          <linearGradient id="logoGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          {/* Accent Warm Gradient: Neon Rose -> Sunset Orange */}
          <linearGradient id="logoGradAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="60%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Core Play Prism Gradient */}
          <linearGradient id="logoGradPrism" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Outer Halo */}
        <circle cx="50" cy="50" r="42" fill="url(#logoGradPrimary)" opacity="0.12" filter="url(#logoGlow)" />

        {/* Outer Hexagonal Shield Path */}
        <path
          d="M50 8
             L86 28
             A6 6 0 0 1 89 33
             L89 67
             A6 6 0 0 1 86 72
             L50 92
             A6 6 0 0 1 47 92
             L14 72
             A6 6 0 0 1 11 67
             L11 33
             A6 6 0 0 1 14 28
             L47 8
             A6 6 0 0 1 50 8 Z"
          fill="#0B0F19"
          stroke="url(#logoGradPrimary)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Geometric Shield Highlight */}
        <path
          d="M50 16
             L80 33
             L80 67
             L50 84
             L20 67
             L20 33 Z"
          fill="#131B2E"
          opacity="0.8"
        />

        {/* Stylized 'S' Flow / Dynamic Social Wave */}
        <path
          d="M32 35
             C32 26, 68 22, 68 35
             C68 44, 32 46, 32 58
             C32 72, 68 68, 68 60"
          stroke="url(#logoGradAccent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Forward Video Play Prism / Apex Triangle */}
        <path
          d="M44 38
             L64 50
             L44 62
             Z"
          fill="url(#logoGradPrism)"
          filter="url(#logoGlow)"
        />

        {/* AI Innovation Spark Star (Top Right) */}
        <path
          d="M72 20
             L74 25
             L79 27
             L74 29
             L72 34
             L70 29
             L65 27
             L70 25 Z"
          fill="#FDE047"
        />

        {/* Ambient Center Core Spark */}
        <circle cx="50" cy="50" r="3" fill="#FFFFFF" opacity="0.9" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-wide text-studio-100">
              Social Earnings
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              STUDIO
            </span>
          </div>
          <span className="text-[10px] text-brand-400 font-medium tracking-wider uppercase">
            AI Content Desktop
          </span>
        </div>
      )}
    </div>
  );
};
