import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import Button from '@mui/material/Button';
import { styled, useTheme } from '@mui/material/styles';
import { FaPlay, FaStop, FaStepForward, FaStepBackward } from 'react-icons/fa';
import { usePathname } from 'next/navigation';

const StyledTourButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  fontWeight: 600,
  minWidth: '210px',
  padding: '8px 16px',
  fontSize: '0.9rem',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  backgroundColor: theme.palette.mode === 'dark' ? '#2196f3' : '#1976d2',
  color: '#fff',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? '#1e88e5' : '#1565c0',
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  '&:active': {
    transform: 'translateY(1px)',
  },
  '& svg': {
    fontSize: '1.1rem',
  },
}));


const BasicJoyrideWrapper = ({ steps }) => {
  const [run, setRun] = useState(false);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  return (
    <div>
      <StyledTourButton onClick={() => setRun(!run)}>
        {run ? <FaStop /> : <FaPlay />} {run ? 'Stop' : 'Start'} Basic Tour
      </StyledTourButton>
      {run && (
        <Joyride
          steps={steps}
          run={run}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              zIndex: 100000,
              arrowColor: '#fff',
              backgroundColor: '#fff',
              primaryColor: '#007bff',
              textColor: '#333',
            },
            tooltip: {
              borderRadius: 8,
            },
            tooltipContainer: {
              textAlign: 'left',
            },
            buttonNext: {
              backgroundColor: '#007bff',
              color: '#fff',
            },
            buttonBack: {
              color: '#007bff',
            },
          }}
        />
      )}
    </div>
  );
};

const MultiRouteJoyrideWrapper = ({ routes }) => {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const pathname = usePathname();

  useEffect(() => {
    const currentRouteSteps = routes[pathname] || [];
    setSteps(currentRouteSteps);
  }, [pathname, routes]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  return (
    <div>
      <StyledTourButton onClick={() => setRun(!run)}>
        {run ? <FaStop /> : <FaPlay />} {run ? 'Stop' : 'Start'} Route Tour
      </StyledTourButton>
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 100000,
          },
        }}
      />
    </div>
  );
};

const ControlledJoyrideWrapper = ({ steps }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    } else if (type === 'step:after' || type === 'tour:end') {
      setStepIndex(index + (action === 'next' ? 1 : -1));
    }
  };

  return (
    <div>
      <StyledTourButton onClick={() => setRun(!run)}>
        {run ? <FaStop /> : <FaPlay />} {run ? 'Stop' : 'Start'} Controlled Tour
      </StyledTourButton>
      {/*<button onClick={() => setStepIndex(Math.max(stepIndex - 1, 0))}>
        <FaStepBackward /> Previous
      </button>
      <button onClick={() => setStepIndex(Math.min(stepIndex + 1, steps.length - 1))}>
        <FaStepForward /> Next
      </button>*/}
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 100000,
          },
        }}
      />
    </div>
  );
};

const CustomJoyrideWrapper = ({ steps }) => {
  const [run, setRun] = useState(false);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  return (
    <div>
      <StyledTourButton onClick={() => setRun(!run)}>
        {run ? <FaStop /> : <FaPlay />} {run ? 'Stop' : 'Start'} Custom Tour
      </StyledTourButton>
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 100000,
          },
        }}
      />
    </div>
  );
};

const CarouselJoyrideWrapper = ({ steps }) => {
  const [run, setRun] = useState(false);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  return (
    <div>
      <StyledTourButton onClick={() => setRun(!run)}>
        {run ? <FaStop /> : <FaPlay />} {run ? 'Stop' : 'Start'} Carousel Tour
      </StyledTourButton>
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 100000,
          },
        }}
        floaterProps={{
          disableAnimation: true,
        }}
      />
    </div>
  );
};

const ModalJoyrideWrapper = ({ steps }) => {
  const [run, setRun] = useState(false);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  return (
    <div>
      <StyledTourButton onClick={() => setRun(!run)}>
        {run ? <FaStop /> : <FaPlay />} {run ? 'Stop' : 'Start'} Modal Tour
      </StyledTourButton>
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        disableOverlayClose={true}
        disableCloseOnEsc={true}
        styles={{
          options: {
            zIndex: 100000,
          },
        }}
      />
    </div>
  );
};


const ScrollJoyrideWrapper = ({ steps }) => {
  const [run, setRun] = useState(false);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  return (
    <div>
      <StyledTourButton onClick={() => setRun(!run)}>
        {run ? <FaStop /> : <FaPlay />} {run ? 'Stop' : 'Start'} Scroll Tour
      </StyledTourButton>
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        scrollToFirstStep={true}
        scrollOffset={100}
        scrollDuration={300}
        styles={{
          options: {
            zIndex: 100000,
          },
        }}
      />
    </div>
  );
};

export { 
  ModalJoyrideWrapper, 
  ScrollJoyrideWrapper, 
  CustomJoyrideWrapper, 
  CarouselJoyrideWrapper, 
  ControlledJoyrideWrapper, 
  MultiRouteJoyrideWrapper, 
  BasicJoyrideWrapper 
};

