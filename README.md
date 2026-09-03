# MCCIA RAG frontend

Responsive, multi-user knowledge-assistant frontend built with the Next.js App Router-compatible `app/` structure, React, and strict TypeScript. It is deliberately isolated from the FastAPI/RAG backend: browsers only call internal `/api/*` routes, and those routes use server-only environment variables to contact FastAPI.

## Run locally

1. Install Node.js 22.13 or newer.
2. Copy `.env.example` to `.env.local` and fill in the server-side values.
3. For a UI-only local walkthrough, set `RAG_DEV_MOCKS=true` and provide a long local `RAG_SESSION_SECRET`. For direct local Ollama chat, use `RAG_BACKEND_URL=http://127.0.0.1:11434`, `RAG_BACKEND_PROTOCOL=ollama`, and `RAG_DEV_AUTH=true` instead.
4. Run `npm install` and then `npm run dev`.
5. Open the local URL printed by the development server and sign in with any syntactically valid email only when development mocks are enabled.

## Commands

```bash
npm run dev
npm run lint
npm test
npm run build
```

`npm test` covers OpenAI-compatible/custom SSE parsing, cancelled/duplicate-submission guard behavior, and unsafe-link rejection. The client holds one `AbortController` while generation is active; Stop Generation aborts that request and marks the assistant message as cancelled.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `RAG_BACKEND_URL` | Yes | Private FastAPI base URL, for example `http://127.0.0.1:8000`. It is never sent to the browser. |
| `RAG_BACKEND_API_KEY` | Yes | Private credential sent by the server proxy as a Bearer token. It is never sent to the browser. |
| `RAG_SESSION_SECRET` | Yes | Long random secret for HMAC-signed, HttpOnly session cookies. |
| `RAG_DEV_MOCKS` | Local only | Set to `true` only for local adapter data and development sign-in. Do not enable in production. |
| `RAG_DEV_AUTH` | Local only | Enables the development email session. Never enable in production. |
| `RAG_BACKEND_PROTOCOL` | Optional | Set to `ollama` only when proxying directly to a local Ollama server; FastAPI/RAG is the default. |

For multiple compute laptops, configure `RAG_BACKEND_SERVERS` as the server-only JSON shown in `.env.example`. The header’s Compute server selector receives only `id` and `name`; the private node URL and API key never leave the Next.js server. The proxy rejects IDs outside this allowlist, which prevents server-side request forgery through a user-supplied URL.

The session cookie is `HttpOnly`, `SameSite=Lax`, path-scoped, and eight hours long. It is `Secure` in production. Development omits the Secure attribute so cookies work over local HTTP; deploy behind HTTPS in production.

## Compute-node architecture

```text
Any phone or laptop browser
  → HTTPS frontend /api proxy
  → selected allowlisted RAG compute node
  → FastAPI RAG backend on that node
  → Ollama / Gemma on 127.0.0.1 of that node
  → CPU/GPU work happens on the selected laptop
```

Install and run Ollama plus FastAPI on every laptop that should offer compute. Keep Ollama bound to localhost. FastAPI calls Ollama locally, and the frontend reaches FastAPI over a private HTTPS network such as Tailscale. Put the frontend and every compute laptop in the same tailnet; do not port-forward Ollama or expose it directly to the public internet.

When the frontend runs on the same compute laptop, use `http://127.0.0.1:8000` for its FastAPI URL. When the frontend is hosted on a different machine, use that compute node’s private Tailscale HTTPS URL. Each FastAPI instance must enforce its own API key, tenant identity, authorization, rate limits, and concurrency queue. This frontend only routes a request; it cannot turn an underpowered laptop into a faster GPU.

### Two-server production pattern

Keep these responsibilities separate:

| Node | Runs | Who can reach it |
| --- | --- | --- |
| Primary laptop | Ollama and Gemma, bound to `127.0.0.1:11434` | Only its local frontend proxy |
| Secondary laptop/server | FastAPI RAG, which calls its local Ollama; the MCCIA frontend | Trusted devices over Tailscale HTTPS |

For a remote compute node, install Tailscale on the frontend host and the remote laptop, sign both into the same tailnet, and make only FastAPI available inside that tailnet with Tailscale Serve. Keep Ollama on localhost. Add the remote node to `RAG_BACKEND_SERVERS` with `protocol: "fastapi"`, the node’s Tailscale HTTPS URL, and a distinct backend API key. Every user device should authenticate to Tailscale; Tailscale device/user keys plus ACLs are the access mechanism, not a shared browser API key.

The included `primary-laptop` entry is `protocol: "ollama"` for immediate direct chat. It does not provide RAG uploads or citations. The remote `fastapi` entry is the RAG-capable node and can be added only after you know its private Tailscale URL and FastAPI API key.

During local development, an administrator can also open **Administration → Compute server access**, enter the Tailscale HTTPS URL and node API key, and validate the connection without editing an environment file. The key is sent to the server-only route and is never returned to the browser. This development registry is intentionally memory-only and clears on restart; production must use `RAG_BACKEND_SERVERS` or an encrypted server-side secret store.

## API contract assumptions

### Implemented backend endpoints

The Next.js server routes proxy the following existing FastAPI endpoints. The proxy injects `Authorization: Bearer <RAG_BACKEND_API_KEY>`, `X-User-Id`, `X-Tenant-Id`, `X-User-Role`, and a request ID. The browser never receives that API key.

| Browser route | FastAPI route | Contract |
| --- | --- | --- |
| `GET /api/health` | `GET /health` | Uses 200 as online; proxy returns a normalized status object. |
| `GET /api/models` | `GET /v1/models` | OpenAI list response: `{ data: [{ id, owned_by? }] }`. |
| `POST /api/chat` | `POST /v1/chat/completions` | OpenAI Chat Completions request; proxy forces `stream: true` and forwards `text/event-stream`. |
| `POST /api/documents` | `POST /v1/documents` | Multipart `file`; client/proxy accept PDF, DOCX, TXT up to 25 MB. |

Streaming expects normal OpenAI chunks (`choices[0].delta.content`) and supports custom data frames such as `{ "queue_position": 2 }`, `{ "sources": [...] }`, and `{ "metrics": {...} }`. A source must contain `id`, `documentId`, `filename`, `page` (nullable), `relevance` (0–1), and `excerpt`; `originalUrl` is optional.

Markdown is rendered through a deliberately restricted renderer: it never injects raw HTML, and source/external links are restricted to `http:` and `https:` with `noopener noreferrer`.

## Backend endpoints still required

These are intentionally not created or changed in FastAPI. Typed development adapters return mock data only when `RAG_DEV_MOCKS=true`.

1. `GET /v1/documents` and `GET /v1/documents/{id}`: tenant-scoped document list and details including OCR/embedding status and optional original-source URL.
2. `GET /v1/admin/metrics`: tenant-scoped metrics used by the administration page.
3. `GET`, `POST`, and role updates for `/v1/admin/users`: tenant user management.
4. A production identity-provider/session exchange endpoint. The included `/api/auth/session` POST route is deliberately development-only; it does not authenticate passwords. In production, exchange an IdP assertion server-side and issue the signed cookie only after authorization.
5. Optionally, an upload-status/event endpoint to replace polling and show real upload percentage after FastAPI accepts the file.

## Security notes

- Do not use `NEXT_PUBLIC_` for backend URLs, API keys, credentials, or database connection strings.
- Do not enable wildcard CORS for authenticated API traffic. The browser uses same-origin `/api/*` calls only.
- Enforce tenant and role authorization in FastAPI as well as in the proxy; browser state is not an authorization boundary.
- Place the frontend behind HTTPS before production so the Secure session cookie is always used.
- Preserve backend upload validation; client validation is an early usability check, not a security control.
