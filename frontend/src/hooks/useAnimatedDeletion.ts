import { useState, useEffect, useCallback, useRef } from 'react';

export interface AnimatedDeletionState {
  isDeleting: boolean;
  progress: number; // 0-100, progress of the line animation
  countdown: number; // 5-0, countdown timer
  showCountdown: boolean;
  isUndoable: boolean;
}

export const useAnimatedDeletion = (
  onDelete: () => void,
  onUndo?: () => void,
  animationDuration: number = 800, // Duration of line animation in ms
  countdownDuration: number = 5 // Countdown duration in seconds
) => {
  const [state, setState] = useState<AnimatedDeletionState>({
    isDeleting: false,
    progress: 0,
    countdown: countdownDuration,
    showCountdown: false,
    isUndoable: false,
  });

  const animationFrameRef = useRef<number>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const deletionTimeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (deletionTimeoutRef.current) {
      clearTimeout(deletionTimeoutRef.current);
    }
  }, []);

  const startDeletion = useCallback(() => {
    cleanup();
    
    setState({
      isDeleting: true,
      progress: 0,
      countdown: countdownDuration,
      showCountdown: false,
      isUndoable: false,
    });

    startTimeRef.current = Date.now();

    // Animate the line progress
    const animateLine = () => {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const progress = Math.min((elapsed / animationDuration) * 100, 100);

      setState(prev => ({
        ...prev,
        progress,
      }));

      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(animateLine);
      } else {
        // Line animation complete, start countdown
        setState(prev => ({
          ...prev,
          showCountdown: true,
          isUndoable: true,
        }));

        // Start countdown
        let remainingTime = countdownDuration;
        countdownIntervalRef.current = setInterval(() => {
          remainingTime -= 1;
          setState(prev => ({
            ...prev,
            countdown: remainingTime,
          }));

          if (remainingTime <= 0) {
            // Countdown finished, execute deletion
            clearInterval(countdownIntervalRef.current!);
            onDelete();
          }
        }, 1000);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateLine);
  }, [animationDuration, countdownDuration, onDelete, cleanup]);

  const cancelDeletion = useCallback(() => {
    cleanup();
    setState({
      isDeleting: false,
      progress: 0,
      countdown: countdownDuration,
      showCountdown: false,
      isUndoable: false,
    });
    onUndo?.();
  }, [countdownDuration, onUndo, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    startDeletion,
    cancelDeletion,
  };
};
