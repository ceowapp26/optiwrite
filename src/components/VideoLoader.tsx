import React from 'react';
import { styled, keyframes } from '@mui/system';

const bounce = keyframes`
  0%, 100% {
    transform: scale(0);
  }
  50% {
    transform: scale(1);
  }
`;

const StyledSpinner = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '400px',
  '@media (max-width: 768px)': {
    height: '250px',
  },
  '& > div': {
    width: '60px',
    height: '60px',
    backgroundColor: (theme) => theme.palette.primary.main,
    borderRadius: '50%',
    animation: `${bounce} 1.2s infinite ease-in-out`,
  },
});

const VideoLoadingSpinner = () => {
  return (
    <StyledSpinner>
      <div />
    </StyledSpinner>
  );
};

export default VideoLoadingSpinner;