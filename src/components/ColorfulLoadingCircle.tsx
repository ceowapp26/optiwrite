import React from 'react';
import { motion } from 'framer-motion';

interface ColorfulLoadingCircleProps {
  width?: string;
  height?: string;
  background?: string;
}

const ColorfulLoadingCircle: React.FC<ColorfulLoadingCircleProps> = ({ 
  width = '32', 
  height = '32', 
  background = 'purple' 
}) => {
  const spinnerSize = `h-${height} w-${width}`;
  const borderStyle = `border-t-2 border-b-2 border-${background}-500`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex justify-center items-center h-64"
    >
      <div
        className={`animate-spin rounded-full ${spinnerSize} ${borderStyle}`}
        style={{ borderColor: `${background}` }}
      ></div>
    </motion.div>
  );
};

export default ColorfulLoadingCircle;
