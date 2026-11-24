import React from 'react';

interface BrandLogoProps {
  className?: string;
  invert?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', invert = false }) => {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="2"
          y="2"
          width="32"
          height="32"
          rx="8"
          fill={invert ? '#FFFFFF' : '#123B67'}
        />
        {/* Luggage handle & frame */}
        <path
          d="M14 10.5V8.5C14 7.67 14.67 7 15.5 7H20.5C21.33 7 22 7.67 22 8.5V10.5"
          stroke={invert ? '#123B67' : '#EAF4FF'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="9.5"
          y="10.5"
          width="17"
          height="16.5"
          rx="3"
          stroke={invert ? '#123B67' : '#EAF4FF'}
          strokeWidth="2"
        />
        {/* Accessibility mobility symbol inside suitcase */}
        <circle cx="18" cy="14.5" r="1.6" fill="#16A6A1" />
        <path
          d="M18 17V20.5H21.2M18 18.5H15.8C14.7 18.5 13.8 19.4 13.8 20.5C13.8 21.8 14.9 22.8 16.2 22.8C17.2 22.8 18.1 22.1 18.4 21.2"
          stroke="#16A6A1"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Luggage wheels */}
        <circle cx="13" cy="28.5" r="1.3" fill={invert ? '#123B67' : '#EAF4FF'} />
        <circle cx="23" cy="28.5" r="1.3" fill={invert ? '#123B67' : '#EAF4FF'} />
      </svg>
      <span
        className={`font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 ${
          invert ? 'text-white' : 'text-[#123B67]'
        }`}
      >
        PortoAssist
      </span>
    </span>
  );
};
