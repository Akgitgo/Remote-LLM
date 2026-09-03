import type { ReactNode } from 'react';

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

/** Deliberately small Markdown renderer: HTML is never injected into the DOM. */
export function SafeMarkdown({ value }: { value: string }) {
  return <div className="space-y-3 text-sm leading-7 text-slate-700">{value.split(/\n{2,}/).filter(Boolean).map((block, index) => {
    if (block.startsWith('```')) return <pre key={index} className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100"><code>{block.replace(/^```\w*\n?|```$/g, '')}</code></pre>;
    if (block.startsWith('- ')) return <ul key={index} className="list-disc space-y-1 pl-5">{block.split('\n').map((line, i) => <li key={i}>{inline(line.replace(/^-\s*/, ''))}</li>)}</ul>;
    if (block.startsWith('### ')) return <h3 key={index} className="font-semibold text-slate-900">{inline(block.slice(4))}</h3>;
    return <p key={index}>{inline(block)}</p>;
  })}</div>;
}

function inline(text: string): ReactNode[] {
  const tokens = text.split(/(\[[^\]]+\]\([^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) { const url = safeExternalUrl(link[2]); return url ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#075d70] underline underline-offset-2">{link[1]}</a> : <span key={index}>{link[1]}</span>; }
    if (token.startsWith('`')) return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 text-xs">{token.slice(1, -1)}</code>;
    if (token.startsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    return <span key={index}>{token}</span>;
  });
}
