import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

export const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  inset: 0;
  opacity: 80%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const StyledOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 40;
`;

export const LayoutContainer = styled(motion.div)`
  transition: margin 300ms ease-in-out;
`;

export const layoutVariants = {
  expanded: {
    marginLeft: '360px',
    opacity: 0.8,
  },
  collapsed: {
    marginLeft: 0,
    opacity: 1,
  },
};

interface OverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export const OverlayWrapper: React.FC<OverlayProps> = ({ isVisible }) => {
  return (
    <Overlay
      key={`overlay-${isVisible ? 'visible' : 'hidden'}`}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      exit="exit"
      variants={overlayVariants}
    />
  );
};
