import React, { forwardRef } from 'react';
import styled from 'styled-components';

const StyledSection = styled.div`
  padding: var(--p-space-4);
  border-radius: var(--p-border-radius-2);
  background: var(--surface-neutral);
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: var(--p-shadow-card-hover);
  }
`;

interface SectionWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SectionWrapper = forwardRef<HTMLDivElement, SectionWrapperProps>(
  ({ children, ...props }, ref) => {
    return (
      <StyledSection ref={ref} {...props}>
        {children}
      </StyledSection>
    );
  }
);

SectionWrapper.displayName = 'SectionWrapper';

export default SectionWrapper;
