# FallDetect

AI-assisted fall detection for senior care facilities. A model detects a
fall, an ingest server validates and forwards the event, and a Next.js app
shows it live to the on-shift nurse for acknowledgement and response.

```
model (Python) → server (Python, FastAPI) → frontend (Next.js) → DB → Live Monitor UI
```

## Project structure

```
full-fall-detect/
├── model/      Fall-detection model (see model's own docs, if any)
├── backend/    Python ingest server — receives events from the model,
│               validates, forwards to the frontend. See server/README.md
└── frontend/   Next.js app — auth, Live Monitor UI, incident lifecycle,
                Prisma/Postgres database. See frontend/README.md
```

## Running the full stack locally

Three things need to run at once, each in its own terminal:

1. **`frontend/`** — the Next.js app + database.
   See [`frontend/README.md`](./frontend/README.md) for full setup
   (Node install, `npx create-db@latest`, Prisma migrate, `npm run dev`).

2. **`server/`** — the Python ingest server.
   See [`server/README.md`](./server/README.md) for full setup
   (Python/venv, `pip install -r requirements.txt`,
   `python -m uvicorn app.main:app --reload --port 8000`).

3. **`model/`** — the detection model, once wired to call the server's
   `/events/fall` endpoint.

Start the frontend first (the server has nowhere to forward events to
otherwise), then the server, then the model.

## Quick links

- Frontend setup + troubleshooting → [`frontend/README.md`](./frontend/README.md)
- Ingest server setup + mock curl requests → [`server/README.md`](./server/README.md)