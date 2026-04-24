/// <reference types="vite/client" />

/**
 * Environment configuration
 * All env variables must be prefixed with VITE_ to be exposed to the client
 */

export const config = {
  // Unsplash API for image fetching
  unsplashKey: import.meta.env.VITE_UNSPLASH_KEY || '',
  
  // Study session settings
  maxNewPerDay: parseInt(import.meta.env.VITE_MAX_NEW_PER_DAY || '10', 10),
  
  // SM-2 algorithm settings
  defaultEaseFactor: parseFloat(import.meta.env.VITE_DEFAULT_EASE_FACTOR || '2.5'),
  
  // Feature flags
  imagesEnabled: !!import.meta.env.VITE_UNSPLASH_KEY,
} as const;

// Validate required config
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.unsplashKey) {
    errors.push('VITE_UNSPLASH_KEY is not set. Images will be disabled.');
  }
  
  if (config.maxNewPerDay < 1 || config.maxNewPerDay > 50) {
    errors.push('VITE_MAX_NEW_PER_DAY should be between 1 and 50.');
  }
  
  if (config.defaultEaseFactor < 1.3 || config.defaultEaseFactor > 3.0) {
    errors.push('VITE_DEFAULT_EASE_FACTOR should be between 1.3 and 3.0.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
