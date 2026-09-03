import type { Citation, GenerationMetrics } from './types';

export type StreamEvent =
  | { type: 'token'; value: string }
  | { type: 'queue'; position: number }
  | { type: 'sources'; sources: Citation[] }
  | { type: 'metrics'; metrics: GenerationMetrics }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Parses OpenAI-compatible and MCCIA custom SSE data without interpreting HTML. */
export function parseSsePayload(payload: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  for (const raw of payload.split(/\r?\n\r?\n/)) {
    const data = raw.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data) continue;
    if (data === '[DONE]') { events.push({ type: 'done' }); continue; }
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      const position = Number(parsed.queue_position ?? parsed.queuePosition);
      if (Number.isInteger(position) && position > 0) events.push({ type: 'queue', position });
      const choice = Array.isArray(parsed.choices) ? parsed.choices[0] as Record<string, unknown> | undefined : undefined;
      const delta = choice?.delta as Record<string, unknown> | undefined;
      if (typeof delta?.content === 'string') events.push({ type: 'token', value: delta.content });
      if (typeof parsed.content === 'string') events.push({ type: 'token', value: parsed.content });
      if (Array.isArray(parsed.sources)) events.push({ type: 'sources', sources: parsed.sources as Citation[] });
      if (parsed.metrics && typeof parsed.metrics === 'object') events.push({ type: 'metrics', metrics: parsed.metrics as GenerationMetrics });
      if (typeof parsed.error === 'string') events.push({ type: 'error', message: parsed.error });
    } catch { events.push({ type: 'error', message: 'Received an invalid streaming response.' }); }
  }
  return events;
}

export function canSubmitPrompt(value: string, busy: boolean): boolean {
  return value.trim().length > 0 && !busy;
}
