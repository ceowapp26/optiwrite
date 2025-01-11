import { TextField } from '@shopify/polaris';
import styled from 'styled-components';

const StyledTextField = styled(TextField)`
  .Polaris-TextField__Input {
    background: ${props => props.$isDark ? 'rgb(32, 33, 35)' : 'rgb(255, 255, 255)'};
    color: ${props => props.$isDark ? 'black !important' : 'rgb(32, 34, 35)'};
    border-color: ${props => props.$isDark ? 'rgb(64, 64, 64)' : 'rgb(203, 213, 225)'};

    &:focus {
      border-color: ${props => props.$isDark ? 'rgb(147, 197, 253)' : 'rgb(59, 130, 246)'};
      box-shadow: ${props => props.$isDark 
        ? '0 0 0 1px rgb(147, 197, 253)' 
        : '0 0 0 1px rgb(59, 130, 246)'};
    }

    &::placeholder {
      color: ${props => props.$isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'};
    }

    &:disabled {
      background: ${props => props.$isDark ? 'rgb(39, 39, 42)' : 'rgb(243, 244, 246)'};
      color: ${props => props.$isDark ? 'rgba(241, 241, 241, 1)' : 'rgb(156, 163, 175)'};
      border-color: ${props => props.$isDark ? 'rgb(63, 63, 70)' : 'rgb(229, 231, 235)'};
      cursor: not-allowed;

      &:hover {
        background: ${props => props.$isDark ? 'rgb(39, 39, 42)' : 'rgb(243, 244, 246)'};
        border-color: ${props => props.$isDark ? 'rgb(63, 63, 70)' : 'rgb(229, 231, 235)'};
      }
    }

    &[aria-invalid="true"] {
      border-color: ${props => props.$isDark ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)'};
      
      &:focus {
        border-color: ${props => props.$isDark ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)'};
        box-shadow: ${props => props.$isDark 
          ? '0 0 0 1px rgb(239, 68, 68)' 
          : '0 0 0 1px rgb(220, 38, 38)'};
      }
    }

    &:hover:not(:disabled) {
      border-color: ${props => props.$isDark ? 'rgb(82, 82, 91)' : 'rgb(148, 163, 184)'};
    }
  }
`;

const ThemedTextField = (props) => {
  const isDark = localStorage.getItem('theme') === 'dark-experimental';
  return <StyledTextField $isDark={isDark} {...props} />;
};

export default ThemedTextField;