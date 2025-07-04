import { useCallback, useRef } from 'react';

// Custom hook to optimize tab changes and reduce INP
export const useOptimizedTabChange = (onTabChange: (index: number) => void) => {
  const isChangingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const optimizedTabChange = useCallback((index: number) => {
    // Prevent multiple rapid tab changes
    if (isChangingRef.current) {
      return;
    }

    isChangingRef.current = true;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Use requestAnimationFrame for smooth transitions
    requestAnimationFrame(() => {
      onTabChange(index);

      // Reset the flag after a short delay
      timeoutRef.current = setTimeout(() => {
        isChangingRef.current = false;
      }, 100);
    });
  }, [onTabChange]);

  return optimizedTabChange;
};
