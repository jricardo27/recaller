import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
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

  it('should use import.meta.env.BASE_URL for fetch path', () => {
    const appPath = join(__dirname, '../App.tsx');
    const appContent = readFileSync(appPath, 'utf-8');
    expect(appContent).toContain('import.meta.env.BASE_URL');
    expect(appContent).toContain('`${import.meta.env.BASE_URL}data/words.json`');
  });
});
