import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('index.html meta tags', () => {
  it('should have apple-mobile-web-app-capable meta tag for iOS compatibility', () => {
    const indexPath = join(__dirname, '../../index.html');
    const htmlContent = readFileSync(indexPath, 'utf-8');

    expect(htmlContent).toContain('apple-mobile-web-app-capable');
    expect(htmlContent).toContain('content="yes"');
  });

  it('should have apple-mobile-web-app-status-bar-style meta tag', () => {
    const indexPath = join(__dirname, '../../index.html');
    const htmlContent = readFileSync(indexPath, 'utf-8');

    expect(htmlContent).toContain('apple-mobile-web-app-status-bar-style');
    expect(htmlContent).toContain('content="default"');
  });
});
