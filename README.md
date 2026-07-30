# AI Research Assistant

For a beginner-friendly installation guide, architecture walkthrough, complete
API reference, troubleshooting, and extension guide, see
[DOCUMENTATION.md](DOCUMENTATION.md).

An AI-powered research assistant that searches the web, scrapes the top
results, and uses Retrieval-Augmented Generation (RAG) to produce
cited summaries and answer grounded follow-up questions — all from a
single query.

- **Backend:** FastAPI (Python 3.12)
- **Frontend:** React 19 + Vite
- **Web search:** DuckDuckGo (via `ddgs`)
- **Scraping:** `requests` + BeautifulSoup
- **Chunking / orchestration:** LangChain (`RecursiveCharacterTextSplitter`)
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace)
- **Vector store:** FAISS (one in-memory index per search session)
- **LLM:** Groq (`llama-3.3-70b-versatile` by default)

## How it works

1. **Search** — a query is sent to DuckDuckGo, the top results are
   scraped for clean article text, and everything is cached in memory
   under a generated `search_id`.
2. **Summary** — the scraped sources for a `search_id` are chunked,
   embedded, and indexed in a FAISS store; the most relevant chunks
   for the query (or an optional focus query) are retrieved and sent
   to the LLM, which returns a structured, cited summary.
3. **Chat** — follow-up questions reuse the same FAISS index for that
   `search_id`, retrieve relevant passages, and answer strictly from
   that context plus the running conversation history.
4. **History** — past search sessions can be revisited and reused for
   a new summary or chat without re-searching the web.

## Project structure

```
backend/                   FastAPI application
  app/
    main.py                App factory: CORS, router registration, lifespan logging
    core/                  Settings and logging
    api/                   Search, summary, chat, history, and health routes
    models/                Pydantic request/response schemas
    services/              Search, scraping, RAG, LLM, and in-memory stores
  tests/                   pytest unit and integration tests
  pyproject.toml           Python project and dependency definitions
  uv.lock                  Reproducible Python dependency lockfile
  Dockerfile               Backend container image

frontend/                  React + Vite UI
  src/App.jsx              Research workspace and all user flows
  src/api.js               Thin HTTP client for the backend API
  src/styles.css           Responsive visual system
  package.json             Frontend scripts and dependencies
  Dockerfile               Frontend container image

docker-compose.yml         Runs backend + frontend together
```

## Requirements

- Python 3.12
- Node.js 20+
- A [Groq API key](https://console.groq.com/) (for the LLM)
- [uv](https://docs.astral.sh/uv/) (recommended) or `pip` + a virtualenv

## Setup

```bash
# 1. Install dependencies
cd backend
uv sync

# 2. Configure environment
cp .env.example .env
# then edit .env and set GROQ_API_KEY

# 3. Run the backend
uv run uvicorn app.main:app --reload --port 8000

# 4. Install and run the frontend (in a separate terminal)
cd ../frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to
`http://localhost:8000`. For a separately hosted backend, set
`VITE_API_BASE_URL` before building:

```bash
VITE_API_BASE_URL="http://localhost:8001" npm run build
```

## Running with Docker Compose

```bash
docker compose up --build
```

This starts two services:

| Service  | Port | Notes |
|----------|------|-------|
| backend  | 8000 | Waits on `.env`; healthcheck hits `GET /api/health` |
| frontend | 8501 | Nginx serves React and proxies `/api` to `http://backend:8000` |

## Configuration

All settings are read from environment variables (see `.env.example`),
with these defaults:

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `AI Research Assistant` | Display name, used in API title and frontend banner |
| `APP_ENV` | `development` | Environment label (logged at startup) |
| `DEBUG` | `True` | Debug flag (logged at startup) |
| `LOG_LEVEL` | `INFO` | Root log level |
| `API_HOST` | `0.0.0.0` | Bind host for the backend |
| `API_PORT` | `8000` | Bind port for the backend |
| `VITE_API_BASE_URL` | *(same origin)* | Optional backend URL used by the React build |
| `CORS_ALLOWED_ORIGINS` | `*` | Comma-separated allowed origins, or `*` |
| `GROQ_API_KEY` | *(empty)* | Required for summary/chat to work |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model used for summaries and chat |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace embedding model |
| `SEARCH_MAX_RESULTS` | `8` | Default number of web results per search |
| `VECTOR_DB_DIR` | `vector_db` | Reserved for future persistent vector storage |
| `CHUNK_SIZE` | `1000` | Characters per chunk |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `SUMMARY_TOP_K` | `6` | Default number of passages retrieved for a summary |

## API reference

All endpoints are mounted under `/api`. Interactive docs are available
at `/docs` (Swagger) once the backend is running.

| Method | Path | Request body | Description |
|---|---|---|---|
| GET | `/api/health` | — | Backend liveness, name, and version |
| POST | `/api/search` | `{query, max_results?}` | Search the web and scrape the top results; returns a `search_id` |
| POST | `/api/summary` | `{search_id, focus_query?, top_k?}` | Build a FAISS index over the search's sources and generate a cited summary |
| POST | `/api/chat` | `{search_id, message, top_k?}` | Ask a grounded follow-up question over the same sources |
| GET | `/api/history?limit=20` | — | List recent search sessions, most recent first (limit 1-100) |

Notable error responses:

- `POST /api/search` → `502` if the web search returns no results.
- `POST /api/summary` / `POST /api/chat` → `404` for an unknown
  `search_id`, `400` if the search has no successfully scraped
  sources, `502` if the Groq call fails.

### Response shapes (summary)

- **`SearchResponse`**: `search_id`, `query`, `created_at`, `total_sources`, `sources[]` (`url`, `title`, `snippet`, `content`, `word_count`, `scraped`).
- **`SummaryResponse`**: `search_id`, `query`, `summary`, `key_insights[]`, `important_facts[]`, `actionable_takeaways[]`, `citations[]` (`text`, `source_url`, `source_title`, `relevance_score`).
- **`ChatResponse`**: `search_id`, `answer`, `citations[]`, `history[]` (`role`, `content`).
- **`HistoryResponse`**: `items[]` (`search_id`, `query`, `created_at`, `total_sources`, `scraped_sources`), `total`.

## Frontend workspace

| Page | Purpose |
|---|---|
| **Dashboard** | Start research, check backend status, and revisit recent sessions |
| **Sources** | Browse collected sources, extraction status, and source metadata |
| **Synthesis** | Generate a focused summary, insights, facts, actions, and evidence trail |
| **Ask Lattice** | Ask grounded follow-up questions with citations alongside the conversation |

## Testing

```bash
cd backend
uv run pytest
```

Tests cover the API routes (mocked search/LLM calls), the chunking,
chat, and summarization services, the in-memory stores, and the web
search/scraper wrappers.

## Known limitations

- **No persistence**: search sessions, chat history, and FAISS indexes
  live in process memory (`research_store.py`, `chat_store.py`,
  `vector_store_registry.py`) and are lost on backend restart. These
  are explicitly designed to be swappable for Redis/Postgres later.
- **Single-process only**: because state is in-memory, running
  multiple backend workers/replicas will not share search sessions.
