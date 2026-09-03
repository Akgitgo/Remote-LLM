import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './safe-markdown';
import { canSubmitPrompt, parseSsePayload } from './sse';

describe('SSE parsing', () => {
  it('extracts tokens, queue state, citations, and completion', () => {
    const payload = [
      'data: {"queue_position":2}',
      '',
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      '',
      'data: {"sources":[{"id":"a","documentId":"d","filename":"policy.pdf","page":3,"relevance":0.9,"excerpt":"evidence"}]}',
      '',
      'data: [DONE]',
    ].join('\n');
    expect(parseSsePayload(payload)).toEqual([
      { type: 'queue', position: 2 },
      { type: 'token', value: 'Hello' },
      { type: 'sources', sources: [{ id: 'a', documentId: 'd', filename: 'policy.pdf', page: 3, relevance: 0.9, excerpt: 'evidence' }] },
      { type: 'done' },
    ]);
  });

  it('does not allow duplicate submit while a request is active', () => {
    expect(canSubmitPrompt('Question', false)).toBe(true);
    expect(canSubmitPrompt('Question', true)).toBe(false);
    expect(canSubmitPrompt('   ', false)).toBe(false);
  });
});

describe('safe links', () => {
  it('permits http(s) source links only', () => {
    expect(safeExternalUrl('https://docs.example.com/source')).toBe('https://docs.example.com/source');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
  });
});
