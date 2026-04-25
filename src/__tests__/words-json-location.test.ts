import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('words.json location', () => {
  it('should exist in public/data directory for static asset serving', () => {
    const publicPath = join(__dirname, '../../public/data/words.json');
    expect(existsSync(publicPath)).toBe(true);
  });

  it('should NOT exist in src/data directory (old location)', () => {
    const oldPath = join(__dirname, '../../src/data/words.json');
    expect(existsSync(oldPath)).toBe(false);
  });
});
