import React from 'react';
import { motion } from 'framer-motion';

export const GradientLoadingCircle: React.FC<{ size?: number; thickness?: number }> = ({ size = 60, thickness = 4 }) => {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[200px]">
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e01cd5">
                <animate attributeName="stop-color" values="#e01cd5; #1CB5E0; #e01cd5" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#1CB5E0">
                <animate attributeName="stop-color" values="#1CB5E0; #e01cd5; #1CB5E0" dur="4s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - thickness) / 2}
            stroke="url(#gradient)"
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * (size - thickness) * 0.75} ${Math.PI * (size - thickness) * 0.25}`}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${size / 2} ${size / 2}`}
              to={`360 ${size / 2} ${size / 2}`}
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </motion.div>
    </div>
  );
};