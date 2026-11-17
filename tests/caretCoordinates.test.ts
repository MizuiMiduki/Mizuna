import { describe, it, expect, vi } from 'vitest';
import { getCaretCoordinates } from '../src/utils/caretCoordinates';

describe('caretCoordinates utility', () => {
  it('returns safe fallback coordinates if element is null or undefined', () => {
    // @ts-expect-error Testing null element
    const coords = getCaretCoordinates(null, 0);
    expect(coords).toEqual({ top: 0, left: 0, height: 24 });
  });

  it('runs safely on a textarea in JSDOM environment without throwing', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Hello $[rainbow world]';
    document.body.appendChild(textarea);

    const coords = getCaretCoordinates(textarea, 6);
    expect(coords).toHaveProperty('top');
    expect(coords).toHaveProperty('left');
    expect(coords).toHaveProperty('height');
    expect(typeof coords.top).toBe('number');
    expect(typeof coords.left).toBe('number');
    expect(typeof coords.height).toBe('number');

    document.body.removeChild(textarea);
  });

  it('handles empty string or end of string position', () => {
    const textarea = document.createElement('textarea');
    textarea.value = '';
    document.body.appendChild(textarea);

    const coords = getCaretCoordinates(textarea, 0);
    expect(typeof coords.top).toBe('number');
    expect(coords.height).toBeGreaterThan(0);

    document.body.removeChild(textarea);
  });
});
