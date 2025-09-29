// Test setup file for TypeScript tests

// Mock fetch
(global as any).fetch = jest.fn();

// Mock AbortController
(global as any).AbortController = jest.fn().mockImplementation(() => ({
  signal: {},
  abort: jest.fn()
}));

// Mock console methods to avoid noise in tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});