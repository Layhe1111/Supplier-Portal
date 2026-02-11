# Gamma API PPT Pipeline

This project keeps the same architecture (`Next.js App Router + Supabase jobs + worker + Supabase Storage`) and now uses **Gamma Generate API** as the PPT engine.

---

## 1) Key Principles

### Source-driven rules
- Fixed outline with cover + agenda + required section order.
- Content is built from input JSON facts before calling Gamma.
- Image policy is strict source-only: Gamma `imageOptions.source = "noImages"`.
- Gamma export is `pptx`; file is re-uploaded to Supabase and served via signed URL.

---

## 2) Core File Structure

- `app/api/ppt/generate/route.js`: enqueue job
- `app/api/ppt/worker/route.js`: claim one pending job and create Gamma generation
- `app/api/ppt/status/route.js`: poll Gamma status, finalize download/upload, return signed URL
- `lib/ppt/workerProcess.js`: worker core for Gamma create stage
- `lib/ppt/gammaClient.js`: Gamma API wrapper
- `lib/ppt/gammaPayloadBuilder.js`: input JSON -> Gamma payload conversion
- `lib/ppt/gammaDebug.js`: safe debug snapshots / key masking
- `lib/ppt/jobs.js`: queue CRUD
- `lib/ppt/storage.js`: Supabase upload + signed URL

---

## 3) Job Lifecycle

- `pending`: job inserted by `/api/ppt/generate`
- `running`:
  - worker has created Gamma generation and saved `generationId`
  - `/api/ppt/status` polls Gamma and updates progress
- `done`:
  - Gamma PPTX downloaded server-side
  - uploaded to Supabase bucket (`ppt/{jobId}.pptx`)
  - signed URL returned to frontend
- `failed`: any stage error (Gamma create/status/export/download/upload)

---

## 4) Local Development Reliability

- In local `next dev`, `POST /api/ppt/generate` will also trigger `POST /api/ppt/worker` automatically.
- If `job` remains `pending`, call worker once manually:

```bash
curl -X POST http://localhost:3000/api/ppt/worker
```

---

## 5) Environment Variables

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET=ppt`
- `GAMMA_API_KEY`

Optional:
- `GAMMA_BASE_URL` (default: `https://public-api.gamma.app/v1.0`)
- `GAMMA_BASE_URLS` (comma-separated fallback list, e.g. `https://public-api.gamma.app/v1.0`)
- `GAMMA_TEXT_MODE` (default: `preserve`)
- `GAMMA_EXPORT_AS` (default: `pptx`)
- `GAMMA_THEME_ID`
- `GAMMA_FOLDER_IDS` (comma-separated)
- `GAMMA_FORCE_IPV4` (default: `true`, helps some local networks)
- `GAMMA_PROXY_URL` (e.g. `http://127.0.0.1:7890`)
- `GAMMA_USE_ENV_PROXY` (`true` to honor `HTTPS_PROXY/HTTP_PROXY/ALL_PROXY`)
- `GAMMA_STATUS_USE_CURL` (default auto/true with proxy; use `curl` for status polling stability)
- `GAMMA_CONNECT_TIMEOUT_MS` (default: `10000`)
- `GAMMA_CREATE_TIMEOUT_MS`
- `GAMMA_STATUS_TIMEOUT_MS`
- `GAMMA_DOWNLOAD_TIMEOUT_MS`
- `GAMMA_PENDING_RETRY_AFTER_SEC` (auto-retry with compact payload after pending too long)
- `GAMMA_PENDING_MAX_RETRY` (default: `1`)
- `CRON_SECRET`

If you see:
- `Gamma API ... network error: fetch failed`

Check server-side network reachability first (this is not a browser CORS issue):
```bash
curl -I https://public-api.gamma.app/v1.0/themes
```

If blocked/timeouts in local network:
- keep the app deployed on Vercel and run worker there, or
- configure your network/proxy so server runtime can reach `public-api.gamma.app`.

Proxy quick setup (local):
```bash
GAMMA_PROXY_URL=http://127.0.0.1:7890
# or
GAMMA_USE_ENV_PROXY=true
HTTPS_PROXY=http://127.0.0.1:7890
```

---

## 6) Acceptance Checklist

For the same input JSON, the generated deck should satisfy:

1. `POST /api/ppt/generate` returns `jobId`.
2. `POST /api/ppt/worker` picks one pending job and writes `generationId`.
3. `GET /api/ppt/status` polls Gamma and eventually returns `done + downloadUrl`.
4. Generated PPTX is downloadable from Supabase signed URL.
5. Deck uses only source image URLs (Gamma source=`noImages`).
6. Missing/insufficient source facts are shown as `Not provided`, without fabricated claims.

---

## 7) Local test quick commands

```bash
npm install
npm run dev
```

Create job:
```bash
curl -X POST http://localhost:3000/api/ppt/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Generate a consulting-style deck","dataJson":{"company":{"name":"Atlas"}}}'
```

Trigger worker manually (local):
```bash
curl -X POST http://localhost:3000/api/ppt/worker
```

Query status:
```bash
curl "http://localhost:3000/api/ppt/status?jobId=YOUR_JOB_ID"
```
