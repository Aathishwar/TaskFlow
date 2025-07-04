// Retry utility with exponential backoff
interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 2,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds max
  backoffFactor: 2
};

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        // Operation succeeded
      }
      return result;
    } catch (error: any) {
      lastError = error;
      // Retry attempt failed

      // Don't retry certain errors
      if (shouldNotRetry(error)) {
        // Error type should not be retried
        throw error;
      }

      // If this was the last attempt, throw the original error to preserve Firebase error codes
      if (attempt === opts.maxAttempts) {
        // All retry attempts exhausted
        throw error; // Preserve original error instead of creating generic one
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      // Waiting before retry
      await sleep(delay);
    }
  }

  throw lastError!;
}

function shouldNotRetry(error: any): boolean {
  // Don't retry authentication errors that are permanent
  const nonRetryableErrors = [
    'auth/user-not-found',
    'auth/wrong-password',
    'auth/invalid-credential', // Don't retry - let it be handled properly
    'auth/email-already-in-use',
    'auth/weak-password',
    'auth/invalid-email',
    'auth/user-disabled',
    'auth/operation-not-allowed'
  ];

  // Check Firebase auth error codes
  if (error.code && nonRetryableErrors.includes(error.code)) {
    return true;
  }

  // Check HTTP status codes that shouldn't be retried
  if (error.response?.status) {
    const status = error.response.status;
    // Don't retry client errors (400-499) except 408, 429
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return true;
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default retryOperation;
