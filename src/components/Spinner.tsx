import React from 'react';
import { motion } from 'framer-motion';

const Spinner = () => {
  return (
    <div className="flex justify-center items-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );
};

export default Spinner;