import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('words.json fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '1.0.0',
        wordCount: 100,
        words: []
      })
    });
  });

  it('should fetch words.json using BASE_URL', async () => {
    render(<App />);

    // Wait for the fetch call to be made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Verify the fetch was called with the correct URL containing BASE_URL
    const fetchCalls = mockFetch.mock.calls;
    const wordsJsonCall = fetchCalls.find(call =>
      call[0].includes('data/words.json')
    );

    expect(wordsJsonCall).toBeTruthy();
    // The URL should use BASE_URL (which is /recaller/ in vite.config.ts)
    expect(wordsJsonCall[0]).toMatch(/\/recaller\/.*data\/words\.json$/);
  });
});
