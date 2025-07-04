// Enhanced retry helper for server warmup scenarios
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
};

export const isWarmupError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code;
  const statusCode = error?.response?.status;
  
  return (
    errorCode === 'ECONNABORTED' ||
    errorCode === 'ERR_NETWORK' ||
    errorCode === 'ECONNREFUSED' ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('starting up') ||
    errorMessage.includes('warming up')
  );
};

export const calculateDelay = (attempt: number, options: RetryOptions): number => {
  const delay = Math.min(
    options.baseDelay * Math.pow(options.backoffFactor, attempt),
    options.maxDelay
  );
  
  return options.jitter ? delay + Math.random() * 1000 : delay;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const config = { ...defaultOptions, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain errors
      if (
        (error as any)?.response?.status === 401 || // Unauthorized
        (error as any)?.response?.status === 403 || // Forbidden
        (error as any)?.response?.status === 404 || // Not found
        (error as any)?.message === 'Duplicate request blocked'
      ) {
        throw error;
      }
      
      // Don't retry if not a warmup error and we're past the first few attempts
      if (!isWarmupError(error) && attempt >= 2) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === config.maxAttempts - 1) {
        break;
      }
      
      const delay = calculateDelay(attempt, config);
      // Retrying request
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
