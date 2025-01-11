import React, { useState, useRef, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { clamp } from '@/utils/utilities';
import { styled } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore';
import { selectInitialCoverPosition, selectNewCoverPosition, setInitialCoverPosition, setNewCoverPosition } from '@/stores/features/coversSlice';

const DoneButton = styled(Button)({
  boxShadow: 'none',
  color: 'white',
  textTransform: 'none',
  fontSize: 16,
  padding: '6px 12px',
  border: '1px solid',
  lineHeight: 1.5,
  backgroundColor: '#0063cc',
  borderColor: '#0063cc',
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  '&:hover': {
    backgroundColor: '#0069d9',
    borderColor: '#0062cc',
    boxShadow: 'none',
  },
  '&:active': {
    boxShadow: 'none',
    backgroundColor: '#0062cc',
    borderColor: '#005cbf',
  },
  '&:focus': {
    boxShadow: '0 0 0 0.2rem rgba(0,123,255,.5)',
  },
});

const CancelButton = styled(Button)({
  boxShadow: 'none',
  textTransform: 'none',
  color: 'white',
  fontSize: 16,
  padding: '6px 12px',
  border: '1px solid',
  lineHeight: 1.5,
  backgroundColor: '#000',
  borderColor: '#0063cc',
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  '&:hover': {
    backgroundColor: '#0069d9',
    borderColor: '#0062cc',
    boxShadow: 'none',
  },
  '&:active': {
    boxShadow: 'none',
    backgroundColor: '#0062cc',
    borderColor: '#005cbf',
  },
  '&:focus': {
    boxShadow: '0 0 0 0.2rem rgba(0,123,255,.5)',
  },
});


interface CoverImageProps {
  url?: string;
  preview?: boolean;
}

export const Cover: React.FC<CoverImageProps> = ({ url, preview }: CoverImageProps) => {
  const dispatch = useAppDispatch();
  const eleRef = useRef<HTMLDivElement>(null);
  const [coverReposition, setCoverReposition] = useState<boolean>(false);
  const [offset, setOffset] = useState(0);
  const initialCoverPosition = useAppSelector(selectInitialCoverPosition);
  const newCoverPosition = useAppSelector(selectNewCoverPosition);

  const handleResetPosition = () => {
    const ele = eleRef.current;
    if (!ele) return;
    dispatch(setInitialCoverPosition(initialCoverPosition));
    ele.style.transform = `translateY(${initialCoverPosition}px)`;
    setCoverReposition(false);
  };

  const handleSetPosition = () => {
    const ele = eleRef.current;
    if (!ele) return;
    dispatch(setInitialCoverPosition(newCoverPosition));
    ele.style.transform = `translateY(${newCoverPosition}px)`;
    setCoverReposition(false);
  };

  useEffect(() => {
    const ele = eleRef.current;
    if (!ele) return;
    ele.style.transform = `translateY(${initialCoverPosition}px)`;
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if(!coverReposition) return;
    updateCursor();
    const startPos = {
      y: e.clientY - offset,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const ele = eleRef.current;
      if (!ele) return;
      const parent = ele.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const eleRect = ele.getBoundingClientRect();
      const currentY = e.clientY;
      const dragDirection = currentY > startPos.y ? 'down' : 'up';
      let maxY = eleRect.height - parentRect.height;

      if ((dragDirection === 'down' && eleRect.bottom <= parentRect.bottom) || (dragDirection === 'up' && eleRect.top >= parentRect.top)) {
        return;
      }
      let dy = e.clientY - startPos.y;
      dy = clamp(dy, 0, maxY);
      setOffset(dy);
      ele.style.transform = `translateY(${dragDirection === 'down' ? -dy : dy}px)`;
      const newPos = dragDirection === 'down' ? -dy : dy;
      dispatch(setNewCoverPosition(newPos));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.MouseEvent) => {
    if(!coverReposition) return;
    updateCursor();
    const startPos = {
      y: e.touches[0].clientY - offset,
    };

    const handleTouchMove = (e: MouseEvent) => {
      const ele = eleRef.current;
      if (!ele) return;
      const parent = ele.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const eleRect = ele.getBoundingClientRect();
      const currentY = e.touches[0].clientY;
      const dragDirection = currentY > startPos.y ? 'down' : 'up';
      let maxY = eleRect.height - parentRect.height;

      if ((dragDirection === 'down' && eleRect.bottom <= parentRect.bottom) || (dragDirection === 'up' && eleRect.top >= parentRect.top)) {
        return;
      }
      let dy = e.touches[0].clientY - startPos.y;
      dy = clamp(dy, 0, maxY);
      setOffset(dy);
      ele.style.transform = `translateY(${dragDirection === 'down' ? -dy : dy}px)`;
      const newPos = dragDirection === 'down' ? -dy : dy;
      dispatch(setNewCoverPosition(newPos));
    };
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const updateCursor = () => {
    eleRef.current?.style.setProperty('cursor', 'grab');
    eleRef.current?.style.setProperty('user-select', 'none');
  };

  const resetCursor = () => {
    eleRef.current?.style.removeProperty('cursor');
    eleRef.current?.style.removeProperty('user-select');
  };

  useEffect(() => {
    return () => {
      resetCursor();
      document.removeEventListener('mousemove', handleMouseDown);
      document.removeEventListener('touchmove', handleTouchStart);
    };
  }, []);

  return (
    <div className={cn(
      "relative py-4 w-full h-full overflow-hidden h-[45vh] group",
      !url && "h-[12vh]",
      url && "bg-muted"
    )}>
      {!!url && (
        <>
          <div
            className={`relative w-full h-full min-h-[100vh]`}
            style={{ 
              backgroundImage: `url(${url})`, 
              backgroundRepeat: 'no-repeat', 
              backgroundSize: 'cover',
            }}
            ref={eleRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
          </div>
          {coverReposition && (
            <div className="absolute bottom-0 w-full bg-black">
              <Toolbar>
                <Typography variant="h8" component="div" sx={{ color: 'white', flexGrow: 1 }}>
                  Drag to reposition
                </Typography>
                <div className="flex gap-4">
                  <CancelButton size="small" onClick={handleResetPosition}>Cancel</CancelButton>
                  <DoneButton size="small" onClick={handleSetPosition}>Done</DoneButton>
                </div>
              </Toolbar>
            </div>
          )}
        </>
      )}
    </div>
  );
};

Cover.Skeleton = function CoverSkeleton() {
  return (
    <Skeleton className="w-full h-[12vh]" />
  );
};

