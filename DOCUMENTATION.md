# AI Research Assistant — Complete Project Documentation

## 1. Introduction

The AI Research Assistant is a full-stack application that can:

1. Search the web for a research question.
2. Download and clean text from relevant web pages.
3. Find the passages most related to the question.
4. Generate a structured, source-grounded summary.
5. Answer follow-up questions using the collected sources.
6. Keep a temporary history of research sessions.

The application is divided into two independent projects:

- `frontend/`: the React user interface.
- `backend/`: the FastAPI API, research pipeline, retrieval system, and tests.

The root directory contains shared files such as `docker-compose.yml`.

## 2. What Problem Does This Project Solve?

Ordinary search engines return links. A researcher must open those links, read
each page, compare information, take notes, and decide which facts are useful.

This project automates much of that workflow:

```text
Research question
       |
       v
Web search -> page scraping -> text cleaning
       |
       v
Text chunking -> embeddings -> FAISS index
       |
       v
Relevant passage retrieval
       |
       v
Groq LLM -> summary or follow-up answer
       |
       v
React interface with sources and citations
```

The language model does not receive the entire internet. It receives selected
passages retrieved from the pages collected for the current research session.
This approach is called Retrieval-Augmented Generation.

## 3. Basic Concepts

### 3.1 API

An API allows two applications to communicate. In this project:

- React sends HTTP requests.
- FastAPI receives and validates those requests.
- FastAPI returns JSON responses.

For example, React sends:

```http
POST /api/search
Content-Type: application/json

{
  "query": "How is AI used in medicine?",
  "max_results": 8
}
```

FastAPI returns a search identifier and source documents.

### 3.2 Web scraping

Web scraping means downloading a page and extracting useful text from its HTML.
The backend uses:

- `requests` to download pages.
- BeautifulSoup to parse HTML.
- cleanup rules to remove scripts, styles, navigation, and other noise.

Some sites block scraping or return content that cannot be extracted. Such a
source remains visible, but its `scraped` field is `false`.

### 3.3 Text chunks

Long pages are too large and imprecise to search as single documents. The
backend divides cleaned page text into overlapping chunks.

Default values:

- Chunk size: 1,000 characters.
- Chunk overlap: 150 characters.

Overlap helps preserve information that crosses a chunk boundary.

### 3.4 Embeddings

An embedding converts text into a list of numbers representing its semantic
meaning. Texts with similar meanings produce vectors located close together.

The default model is:

```text
sentence-transformers/all-MiniLM-L6-v2
```

The embedding model is downloaded and loaded the first time summary or chat
retrieval is needed. It is then cached in the backend process.

### 3.5 Vector database and FAISS

FAISS stores the chunk vectors and searches them efficiently. The project
creates one in-memory FAISS index for each `search_id`.

When the user asks a question:

1. The question is embedded.
2. FAISS compares it with stored chunk embeddings.
3. The most relevant chunks are returned.
4. Those chunks become context for the language model.

### 3.6 Retrieval-Augmented Generation

Retrieval-Augmented Generation, or RAG, combines:

- Retrieval: locate relevant evidence.
- Generation: ask an LLM to answer using that evidence.

RAG helps reduce unsupported answers because the model is instructed to use
retrieved source text. It does not guarantee perfect accuracy; users should
still inspect citations.

### 3.7 Search ID

Every successful search receives a unique value such as:

```text
0cc97947df4a44219944ab8284317b29
```

This `search_id` connects the search, summary, chat, and history operations.
Because storage is currently in memory, search IDs stop working after the
backend restarts.

## 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 | User interface and state |
| Frontend tooling | Vite | Development server and production build |
| Icons | Lucide React | Interface icons |
| Production UI server | Nginx | Serves React and proxies API requests |
| Backend | FastAPI | HTTP API |
| Validation | Pydantic | Request, response, and configuration validation |
| Search | `ddgs` | Web search |
| Downloading | Requests | Fetch web pages |
| HTML parsing | BeautifulSoup | Extract readable page text |
| Chunking | LangChain | Split documents into overlapping chunks |
| Embeddings | Hugging Face sentence-transformers | Convert text to vectors |
| Vector search | FAISS | Retrieve semantically related passages |
| LLM | Groq | Generate summaries and answers |
| Python packages | uv | Dependency and virtual-environment management |
| Testing | pytest | Backend unit and API tests |
| Containers | Docker Compose | Run frontend and backend together |

## 5. Repository Structure

```text
research-assistant/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat.py
│   │   │   ├── health.py
│   │   │   ├── history.py
│   │   │   ├── search.py
│   │   │   └── summary.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── logging.py
│   │   ├── models/
│   │   │   ├── chat.py
│   │   │   ├── health.py
│   │   │   ├── history.py
│   │   │   ├── search.py
│   │   │   └── summary.py
│   │   ├── services/
│   │   │   ├── chat_service.py
│   │   │   ├── chat_store.py
│   │   │   ├── chunking_service.py
│   │   │   ├── embedding_service.py
│   │   │   ├── llm_service.py
│   │   │   ├── research_store.py
│   │   │   ├── summarization_service.py
│   │   │   ├── vector_store_registry.py
│   │   │   ├── web_scraper.py
│   │   │   └── web_search.py
│   │   └── main.py
│   ├── tests/
│   ├── vector_db/
│   ├── .env.example
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── uv.lock
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── docker-compose.yml
├── DOCUMENTATION.md
└── README.md
```

Generated directories such as `backend/.venv`, `frontend/node_modules`,
`frontend/dist`, `__pycache__`, and `.pytest_cache` are ignored by Git.

## 6. Prerequisites

Install the following:

- Python 3.12.
- Node.js 20 or newer.
- npm, included with Node.js.
- uv, recommended for Python packages.
- A Groq API key for summary and chat.
- Git, recommended.
- Docker Desktop, optional.

Check installed versions:

```powershell
python --version
node --version
npm.cmd --version
uv --version
docker --version
```

On Bash, use `npm` instead of `npm.cmd`.

## 7. Local Installation

### 7.1 Download the project

```bash
git clone <repository-url>
cd research-assistant
```

If the project already exists locally, open a terminal in its root directory.

### 7.2 Install backend dependencies

PowerShell:

```powershell
cd backend
uv sync
```

Bash:

```bash
cd backend
uv sync
```

This creates `backend/.venv` and installs packages from `uv.lock`.

Alternative with `pip`:

```bash
cd backend
python -m venv .venv
```

PowerShell activation:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Bash activation:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### 7.3 Configure the backend

From `backend/`, create `.env` from the example.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Bash:

```bash
cp .env.example .env
```

Open `.env` and replace:

```dotenv
GROQ_API_KEY=your_groq_api_key_here
```

with a real API key:

```dotenv
GROQ_API_KEY=gsk_your_actual_key
```

Never commit `.env`. It is ignored by Git because it may contain secrets.

### 7.4 Start the backend

From `backend/`:

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Expected URLs:

- API root: `http://127.0.0.1:8000`
- Health endpoint: `http://127.0.0.1:8000/api/health`
- Swagger documentation: `http://127.0.0.1:8000/docs`
- ReDoc documentation: `http://127.0.0.1:8000/redoc`

Keep this terminal open.

### 7.5 Install frontend dependencies

Open a second terminal:

```bash
cd research-assistant/frontend
```

PowerShell:

```powershell
npm.cmd install
```

Bash:

```bash
npm install
```

### 7.6 Start the frontend

PowerShell:

```powershell
npm.cmd run dev
```

Bash:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:8501
```

Vite proxies requests beginning with `/api` to the backend on port 8000.

## 8. Running with Docker Compose

Docker Compose builds and runs both applications.

Before starting, make sure `backend/.env` exists and contains a valid Groq key.

From the repository root:

```bash
docker compose up --build
```

Services:

| Service | Host port | Container behavior |
|---|---:|---|
| Frontend | 8501 | Nginx serves the React production build |
| Backend | 8000 | Uvicorn serves FastAPI |

Nginx forwards `/api/*` to the Docker service named `backend`.

Run in the background:

```bash
docker compose up --build -d
```

View logs:

```bash
docker compose logs -f
```

Stop containers:

```bash
docker compose down
```

Rebuild after dependency or Dockerfile changes:

```bash
docker compose build --no-cache
docker compose up
```

## 9. Environment Variables

Backend settings are loaded by `backend/app/core/config.py` using
`pydantic-settings`.

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `AI Research Assistant` | API display name |
| `APP_ENV` | `development` | Runtime environment label |
| `DEBUG` | `true` | Application debug setting |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `API_HOST` | `0.0.0.0` | Suggested backend bind address |
| `API_PORT` | `8000` | Suggested backend port |
| `API_BASE_URL` | `http://localhost:8000` | Backend base URL setting |
| `CORS_ALLOWED_ORIGINS` | `*` | Allowed browser origins |
| `GROQ_API_KEY` | empty | Groq secret key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model name |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `SEARCH_MAX_RESULTS` | `8` | Default search result count |
| `VECTOR_DB_DIR` | `vector_db` | Reserved vector-data path |
| `CHUNK_SIZE` | `1000` | Chunk size in characters |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `SUMMARY_TOP_K` | `6` | Passages retrieved for RAG |

Frontend environment variable:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | empty/same origin | Optional external backend URL |

For normal local development, leave `VITE_API_BASE_URL` unset because Vite
already proxies `/api`.

For a separately hosted backend:

PowerShell:

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"
npm.cmd run build
```

Bash:

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

In production, replace `CORS_ALLOWED_ORIGINS=*` with the real frontend origin.

## 10. Application Workflow

### 10.1 Search workflow

1. The user enters a question in React.
2. `frontend/src/api.js` sends `POST /api/search`.
3. Pydantic validates the question and result limit.
4. `WebSearchService` requests web results through `ddgs`.
5. `WebScraperService` downloads result pages concurrently.
6. Source text is cleaned and word counts are calculated.
7. A random `search_id` is created.
8. `ResearchStore` saves the session in memory.
9. React displays source cards.

### 10.2 Summary workflow

1. React sends the `search_id`, optional focus question, and `top_k`.
2. The backend locates the search session.
3. Scraped documents are split into chunks.
4. The embedding model converts chunks into vectors.
5. FAISS stores the vectors for that search.
6. FAISS retrieves the most relevant passages.
7. The passages and question are added to a structured prompt.
8. Groq returns JSON containing:
   - a summary;
   - key insights;
   - important facts;
   - actionable takeaways.
9. The backend adds citation metadata.
10. React renders the synthesis and evidence trail.

### 10.3 Chat workflow

1. The user asks a follow-up question.
2. The backend retrieves relevant passages from the same FAISS index.
3. Previous chat messages are loaded from `ChatStore`.
4. The passages, history, and question are sent to Groq.
5. The answer and updated conversation are stored in memory.
6. React displays the answer and sources used.

### 10.4 History workflow

`GET /api/history` reads recent items from `ResearchStore`, sorts them newest
first, and returns lightweight metadata.

History contains search identifiers and counts, not persistent database rows.

## 11. Backend Architecture

### 11.1 Application entry point

`backend/app/main.py`:

- Configures logging.
- Creates the FastAPI application.
- Configures CORS.
- Registers API routers.
- Defines startup and shutdown logging.
- Exposes the root endpoint.

The Uvicorn import string is:

```text
app.main:app
```

It means: import the `app` variable from the `app/main.py` module.

### 11.2 API layer

Files under `backend/app/api/` are HTTP controllers. They:

- Accept validated requests.
- Coordinate services.
- Translate service failures into HTTP errors.
- Return typed Pydantic responses.

Business logic should remain in services rather than growing inside route files.

### 11.3 Model layer

Files under `backend/app/models/` define Pydantic models.

Benefits:

- Invalid inputs are rejected automatically.
- API responses have a consistent schema.
- Swagger documentation is generated automatically.
- Python code receives typed values.

### 11.4 Service layer

| Service | Responsibility |
|---|---|
| `web_search.py` | Search the web and normalize result fields |
| `web_scraper.py` | Fetch and clean page text |
| `chunking_service.py` | Turn sources into LangChain documents and chunks |
| `embedding_service.py` | Load and cache the Hugging Face embedding model |
| `vector_store_registry.py` | Build, cache, and query FAISS indexes |
| `llm_service.py` | Call Groq and normalize LLM errors |
| `summarization_service.py` | Construct summary prompts and parse JSON |
| `chat_service.py` | Construct grounded chat prompts |
| `research_store.py` | Store search sessions in memory |
| `chat_store.py` | Store conversation turns in memory |

### 11.5 Thread safety

The in-memory stores and FAISS registry use locks around shared dictionaries.
This protects basic access when FastAPI handles multiple requests concurrently.

It does not make state available across multiple worker processes.

## 12. Frontend Architecture

### 12.1 Entry point

`frontend/src/main.jsx` mounts the React application into the `root` element
defined by `index.html`.

### 12.2 Main component

`frontend/src/App.jsx` manages:

- Selected workspace tab.
- Current query.
- Search depth.
- Current search response.
- Generated summary.
- Recent history.
- Backend health.
- Loading and error states.
- Chat messages and citations.
- Responsive sidebar state.

The main views are:

- Overview.
- Sources.
- Synthesis.
- Ask Lattice.

### 12.3 API client

`frontend/src/api.js` centralizes `fetch` calls. It:

- Adds JSON headers.
- Decodes JSON responses.
- Converts non-success responses into JavaScript errors.
- Exposes `health`, `history`, `search`, `summary`, and `chat` methods.

### 12.4 Styling

`frontend/src/styles.css` contains:

- Design tokens.
- Desktop sidebar layout.
- Search interface.
- Source and synthesis cards.
- Chat layout.
- Loading animations.
- Responsive breakpoints.

No external component framework is required.

### 12.5 Development and production networking

Development:

```text
Browser -> Vite :8501 -> /api proxy -> FastAPI :8000
```

Docker production:

```text
Browser -> Nginx :8501 -> /api proxy -> backend container :8000
```

## 13. API Reference

Base URL during local development:

```text
http://127.0.0.1:8000
```

### 13.1 Health

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "app_name": "AI Research Assistant",
  "version": "0.1.0"
}
```

### 13.2 Search

```http
POST /api/search
```

Request:

```json
{
  "query": "What are the benefits and risks of RAG?",
  "max_results": 6
}
```

Constraints:

- `query`: 3–500 characters.
- `max_results`: 1–10 or omitted.

Abbreviated response:

```json
{
  "search_id": "abc123",
  "query": "What are the benefits and risks of RAG?",
  "created_at": "2026-07-30T12:00:00Z",
  "total_sources": 6,
  "sources": [
    {
      "url": "https://example.com/article",
      "title": "Example Article",
      "snippet": "A search result preview",
      "content": "Cleaned article text...",
      "word_count": 1500,
      "scraped": true
    }
  ]
}
```

Possible errors:

- `422`: invalid input.
- `502`: search provider unavailable or no results.

### 13.3 Summary

```http
POST /api/summary
```

Request:

```json
{
  "search_id": "abc123",
  "focus_query": "Focus on security risks",
  "top_k": 6
}
```

Constraints:

- `focus_query`: optional, 3–500 characters.
- `top_k`: optional, 1–20.

Abbreviated response:

```json
{
  "search_id": "abc123",
  "query": "Focus on security risks",
  "summary": "The collected evidence indicates...",
  "key_insights": ["Insight one"],
  "important_facts": ["Fact one"],
  "actionable_takeaways": ["Action one"],
  "citations": [
    {
      "text": "Retrieved source passage...",
      "source_url": "https://example.com/article",
      "source_title": "Example Article",
      "relevance_score": 0.82
    }
  ]
}
```

Possible errors:

- `400`: no usable scraped content.
- `404`: unknown or expired `search_id`.
- `502`: Groq request failed.

### 13.4 Chat

```http
POST /api/chat
```

Request:

```json
{
  "search_id": "abc123",
  "message": "Which risk is most important?",
  "top_k": 6
}
```

Constraints:

- `message`: 1–1,000 characters.
- `top_k`: optional, 1–20.

Abbreviated response:

```json
{
  "search_id": "abc123",
  "answer": "Based on the retrieved sources...",
  "citations": [],
  "history": [
    {
      "role": "user",
      "content": "Which risk is most important?"
    },
    {
      "role": "assistant",
      "content": "Based on the retrieved sources..."
    }
  ]
}
```

### 13.5 History

```http
GET /api/history?limit=20
```

`limit` must be between 1 and 100.

Example response:

```json
{
  "items": [
    {
      "search_id": "abc123",
      "query": "What are the benefits and risks of RAG?",
      "created_at": "2026-07-30T12:00:00Z",
      "total_sources": 6,
      "scraped_sources": 5
    }
  ],
  "total": 1
}
```

## 14. Calling the API Manually

PowerShell search example:

```powershell
$body = @{
  query = "What is retrieval-augmented generation?"
  max_results = 4
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/search" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

curl example:

```bash
curl -X POST http://127.0.0.1:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"What is retrieval-augmented generation?","max_results":4}'
```

Swagger at `/docs` is the easiest option for beginners because it provides
forms for every endpoint.

## 15. Testing

From `backend/`:

```bash
uv run pytest
```

Short output:

```bash
uv run pytest -q
```

Run one file:

```bash
uv run pytest tests/test_search_api.py -q
```

Run one test:

```bash
uv run pytest tests/test_search_api.py::test_search_endpoint_returns_sources -q
```

Current tests cover:

- Search endpoint behavior.
- Summary endpoint behavior.
- Chat endpoint behavior.
- History endpoint behavior.
- Search and scraper wrappers.
- Chunking.
- Summarization.
- Chat service and store.

External web search and LLM calls are mocked in API tests. This makes tests
repeatable and avoids consuming API quota.

Frontend production build check:

PowerShell:

```powershell
cd frontend
npm.cmd run build
```

Bash:

```bash
cd frontend
npm run build
```

## 16. Common Errors and Troubleshooting

### Backend is offline

Symptoms:

- Frontend shows “Backend offline.”
- `/api` calls fail.

Check:

```text
http://127.0.0.1:8000/api/health
```

Start FastAPI from `backend/`, not the repository root:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

### Web search provider unavailable

Message:

```text
The web search provider is unavailable or returned no results.
```

Possible causes:

- No internet connection.
- Firewall or sandbox blocks outbound sockets.
- Search provider rate limiting.
- Temporary provider outage.

The backend must have outbound internet access for search and scraping.

### Missing Groq API key

Message:

```text
GROQ_API_KEY is not configured.
```

Fix `backend/.env`:

```dotenv
GROQ_API_KEY=gsk_your_actual_key
```

Restart the backend because settings and the LLM client are cached.

### Unknown search ID

Cause:

- Backend restarted.
- Search ID was copied incorrectly.
- Search came from another backend process.

Run a new search. Current state is process-local and temporary.

### First summary is slow

The first summary may download and initialize the embedding model and build the
first FAISS index. Later requests reuse cached objects and are faster.

### Port already in use

Windows:

```powershell
netstat -ano | Select-String ":8000|:8501"
```

Use another port or stop the process already using it.

Backend on another port:

```bash
uv run uvicorn app.main:app --port 8001
```

Update the Vite proxy in `frontend/vite.config.js` or use
`VITE_API_BASE_URL`.

### PowerShell blocks `npm.ps1`

Use:

```powershell
npm.cmd install
npm.cmd run dev
```

### `DEBUG` environment validation error

`DEBUG` must be a Boolean-like value such as `true` or `false`. A system-level
environment variable named `DEBUG` can override `.env`.

PowerShell:

```powershell
$env:DEBUG="false"
```

Then start or test the backend in the same terminal.

### CORS error

For local development:

```dotenv
CORS_ALLOWED_ORIGINS=*
```

For production:

```dotenv
CORS_ALLOWED_ORIGINS=https://research.example.com
```

Restart FastAPI after changing `.env`.

## 17. Security Considerations

Before production use:

1. Never commit `backend/.env`.
2. Restrict `CORS_ALLOWED_ORIGINS`.
3. Add authentication and authorization.
4. Add rate limiting.
5. Limit maximum scraped content and request sizes.
6. Validate URLs to reduce server-side request forgery risk.
7. Add outbound-domain controls if required.
8. Store secrets in a deployment secret manager.
9. Use HTTPS.
10. Review scraped content as untrusted input.
11. Add prompt-injection defenses for retrieved web pages.
12. Avoid logging keys, tokens, or sensitive user queries.

The current project is suitable as a local application or learning project. It
is not a complete hardened multi-tenant production service.

## 18. Current Limitations

### In-memory state

The following are lost when FastAPI restarts:

- Research sessions.
- Search history.
- Chat messages.
- FAISS indexes.

### Single backend process

Multiple Uvicorn workers do not share memory. A request sent to a different
worker may not find the search ID.

### Search and scraping reliability

Web providers may rate-limit requests. Pages may block automated access,
require JavaScript, or contain little extractable text.

### Citation limitations

Citations identify retrieved passages. The LLM may still summarize incorrectly,
so important decisions require reading the original sources.

### No user accounts

All users of one backend process share the same in-memory history.

## 19. Recommended Production Architecture

A production version could use:

| Current component | Production replacement or addition |
|---|---|
| In-memory research store | PostgreSQL |
| In-memory chat store | PostgreSQL or Redis |
| In-memory FAISS registry | Persistent vector database |
| Direct scraping in API request | Background task queue |
| No authentication | OAuth, session auth, or JWT |
| Process logs | Centralized structured logging |
| Local secrets | Cloud secret manager |
| Single instance | Load-balanced API replicas |

Possible request flow:

```text
React
  |
API gateway / authentication
  |
FastAPI
  |---- PostgreSQL
  |---- Redis
  |---- task queue ---- scraping workers
  |---- vector database
  |---- Groq API
```

## 20. How to Extend the Project

### Add persistent searches

Create a database-backed implementation with the same conceptual methods as
`ResearchStore`:

- `save`
- `get`
- `list_recent`

Replace the singleton provider without changing route contracts.

### Add a new API endpoint

1. Create a Pydantic request/response model.
2. Create a route module under `backend/app/api/`.
3. Put business logic in a service.
4. Register the router in `backend/app/main.py`.
5. Add tests.
6. Add a method in `frontend/src/api.js`.
7. Add the React interface.

### Change the LLM

`GroqLLMService` isolates provider-specific calls. Create another service with
equivalent JSON and chat generation methods, then inject or select it through
configuration.

### Change the embedding model

Update:

```dotenv
EMBEDDING_MODEL=another-sentence-transformer
```

Confirm its vector dimensions and resource requirements. Restart the backend so
the cached model is recreated.

### Add frontend tests

Recommended tools:

- Vitest for unit tests.
- React Testing Library for component behavior.
- Playwright for end-to-end tests.

Important scenarios:

- Successful search.
- Provider error.
- Summary loading.
- Chat conversation.
- Mobile navigation.
- Backend offline state.

## 21. Development Conventions

Recommended practices:

- Keep routes thin and services focused.
- Define all external request and response shapes with Pydantic.
- Add tests with each backend behavior change.
- Keep API calls centralized in `frontend/src/api.js`.
- Never place secrets in React environment variables; frontend values are
  visible to users.
- Regenerate `uv.lock` when Python dependencies change.
- Commit `package-lock.json` when npm dependencies change.
- Run backend tests and the frontend build before committing.

Suggested checks:

```powershell
cd backend
$env:DEBUG="false"
uv run pytest -q

cd ..\frontend
npm.cmd run build

cd ..
docker compose config
```

## 22. Quick Start Checklist

- [ ] Install Python 3.12.
- [ ] Install Node.js 20+.
- [ ] Install uv.
- [ ] Open the project root.
- [ ] Run `uv sync` inside `backend/`.
- [ ] Copy `backend/.env.example` to `backend/.env`.
- [ ] Add `GROQ_API_KEY`.
- [ ] Start FastAPI on port 8000.
- [ ] Run `npm install` inside `frontend/`.
- [ ] Start Vite on port 8501.
- [ ] Open `http://127.0.0.1:8501`.
- [ ] Run a search.
- [ ] Review sources.
- [ ] Generate a synthesis.
- [ ] Ask a follow-up question.

## 23. Summary

This project demonstrates a complete RAG application:

- React provides a responsive research workspace.
- FastAPI exposes typed endpoints.
- Web search and scraping collect evidence.
- LangChain chunks the text.
- Hugging Face produces embeddings.
- FAISS retrieves relevant passages.
- Groq generates structured summaries and grounded answers.
- Docker Compose runs both applications together.

The code is intentionally separated into models, routes, services, stores, and
frontend modules so individual components can be understood and replaced as the
project grows.
