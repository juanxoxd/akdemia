// Utility for simulating network delay
export const mockDelay = (minMs: number = 200, maxMs: number = 800): Promise<void> => {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Simulate occasional errors (for testing error handling)
export const mockMaybeError = (errorRate: number = 0.05): void => {
  if (Math.random() < errorRate) {
    throw new Error('Simulated network error');
  }
};
