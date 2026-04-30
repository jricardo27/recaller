import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import App from '../App';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('words.json fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('should fetch version.json first, then words.json when version changes', async () => {
    // Mock version.json response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.0.0',
          wordCount: 100
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.0.0',
          wordCount: 100,
          words: []
        })
      });

    const { unmount } = render(<App />);

    // Wait for the fetch calls to be made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });

    // Verify version.json was fetched first
    const fetchCalls = mockFetch.mock.calls;
    const versionJsonCall = fetchCalls[0];
    expect(versionJsonCall[0]).toMatch(/\/recaller\/.*data\/version\.json$/);

    // Verify words.json was fetched second
    const wordsJsonCall = fetchCalls[1];
    expect(wordsJsonCall[0]).toMatch(/\/recaller\/.*data\/words\.json$/);

    unmount();
  });

  it('should not fetch words.json when version has not changed', async () => {
    // Pre-populate localStorage with existing words and version
    localStorage.setItem('hanzi-memory-storage', JSON.stringify({
      state: {
        words: [{ id: 1, hanzi: 'test', pinyin: 'test', english: 'test', enabled: true }],
        dbVersion: '1.0.0',
        cards: {}
      },
      version: 0
    }));

    // Mock version.json response with same version
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '1.0.0',
        wordCount: 100
      })
    });

    const { unmount } = render(<App />);

    // Wait for the fetch call to be made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Verify only version.json was fetched, not words.json
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCalls = mockFetch.mock.calls;
    const versionJsonCall = fetchCalls[0];
    expect(versionJsonCall[0]).toMatch(/\/recaller\/.*data\/version\.json$/);

    unmount();
  });

  it('should fetch words.json when version changes', async () => {
    // Mock version.json response with new version
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '2.0.0',
          wordCount: 200
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '2.0.0',
          wordCount: 200,
          words: []
        })
      });

    const { unmount } = render(<App />);

    // Wait for the fetch calls to be made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });

    // Verify both version.json and words.json were fetched
    const fetchCalls = mockFetch.mock.calls;
    expect(fetchCalls[0][0]).toMatch(/\/recaller\/.*data\/version\.json$/);
    expect(fetchCalls[1][0]).toMatch(/\/recaller\/.*data\/words\.json$/);

    unmount();
  });

  it('should fetch version.json with cache: no-cache option', async () => {
    // Mock version.json response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '1.0.0',
        wordCount: 100
      })
    });

    const { unmount } = render(<App />);

    // Wait for the fetch call to be made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Verify version.json was fetched with cache: 'no-cache' option
    const fetchCalls = mockFetch.mock.calls;
    const versionJsonCall = fetchCalls[0];
    expect(versionJsonCall[0]).toMatch(/\/recaller\/.*data\/version\.json$/);
    expect(versionJsonCall[1]).toEqual({ cache: 'no-cache' });

    unmount();
  });
});
