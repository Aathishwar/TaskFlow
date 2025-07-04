import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay]
  ) as T;
}

export function useDebouncedCallback<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<void> {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingRef = useRef(false);
  
  return useCallback(
    async (...args: Parameters<T>): Promise<void> => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // If already executing, don't start another execution
      if (isExecutingRef.current) {
        // Debounced function already executing, skipping
        return;
      }
      
      return new Promise((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          if (isExecutingRef.current) {
            resolve();
            return;
          }
          
          isExecutingRef.current = true;
          try {
            await fn(...args);
            resolve();
          } catch (error) {
            reject(error);
          } finally {
            isExecutingRef.current = false;
          }
        }, delay);
      });
    },
    [fn, delay]
  );
}
