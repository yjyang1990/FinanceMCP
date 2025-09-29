// Test setup file
import { jest } from '@jest/globals';

global.fetch = jest.fn();

global.AbortController = jest.fn().mockImplementation(() => ({
  signal: {},
  abort: jest.fn()
}));

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});