import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock axios before any imports
vi.mock('axios', () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
      },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
  };

  // Mock axios.create to return the same mock instance
  mockAxios.create = vi.fn(() => mockAxios);

  return {
    default: mockAxios,
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup()
  localStorage.clear()
})
