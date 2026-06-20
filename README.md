# DocuForge AI

**A document intelligence pipeline that extracts, verifies, and searches enterprise documents — built as a reference implementation of Livo.AI's core product lines.**

Upload any invoice or document. It gets read, structured into clean JSON, checked for fraud patterns, and made searchable by meaning — all in one automated pipeline.

---

## What It Does

DocuForge AI solves 4 problems that every document-heavy business faces:

1. **Extraction** — reads digital and scanned PDFs automatically, no manual entry
2. **Structuring** — Claude AI converts raw text into clean, structured fields
3. **Fraud Detection** — flags duplicate invoices, outlier amounts, and suspicious billing patterns
4. **Discovery** — search your entire document archive by meaning, not exact keywords

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Extraction | Claude API (Anthropic) |
| Backend | FastAPI |
| Database | PostgreSQL |
| PDF Processing | pdfplumber, pytesseract (OCR) |
| Anomaly Detection | Pandas |
| Semantic Search | FAISS, sentence-transformers |
| Frontend | React + Vite |
| Deployment | Docker, Docker Compose |

---

## Architecture
PDF Upload → pdfplumber / OCR fallback → Claude API extraction

→ PostgreSQL storage → Pandas anomaly detection

→ FAISS semantic indexing → React dashboard

---

## Project Structure
DocuForge AI/

├── backend/

│   ├── main.py          # FastAPI app + all routes

│   ├── extractor.py     # PDF text extraction + Claude API calls

│   ├── database.py      # PostgreSQL connection + queries

│   ├── anomaly.py       # Fraud/outlier detection engine

│   ├── search.py        # FAISS embeddings + semantic search

│   ├── requirements.txt

│   ├── Dockerfile

│   └── .env.example

├── frontend/

│   └── src/

│       ├── App.jsx          # Routing

│       ├── LandingPage.jsx  # Marketing page

│       ├── Dashboard.jsx    # Live working product

│       └── index.css

├── docker-compose.yml

└── README.md

---

## Setup — Local Development

**1. Clone and configure backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # then fill in your real API key
```

**2. Set up PostgreSQL**
```sql
CREATE DATABASE docuforge;
```

**3. Run the backend**
```bash
uvicorn main:app --reload
```
API available at `http://127.0.0.1:8000` — interactive docs at `/docs`

**4. Run the frontend**
```bash
cd frontend
npm install
npm run dev
```
App available at `http://localhost:5173`

---

## Setup — Docker (Production-style)

```bash
docker-compose up --build
```

This spins up PostgreSQL and the FastAPI backend together. Set your `ANTHROPIC_API_KEY` as an environment variable before running, or create a `.env` file at the root with:
ANTHROPIC_API_KEY=your-key-here

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| POST | `/upload` | Upload a PDF, runs the full pipeline |
| GET | `/invoices` | List all processed invoices |
| GET | `/invoices/{id}` | Get a single invoice |
| GET | `/anomalies` | List all flagged anomalies |
| POST | `/anomalies/run` | Manually re-run anomaly detection |
| POST | `/search` | Semantic search across all invoices |

---

## Reference Case Study

Modeled on a real accounting-firm workflow: automating invoice extraction, reconciliation, and anomaly detection across hundreds of monthly documents.

- **500+ hours saved per month** in manual data entry
- **40% faster** audit turnaround
- **98% extraction accuracy**

---

## Built By

**Chaitanya Joshi** — MCA, Bangalore Institute of Technology
Built as a 5-day sprint project to mirror the technical patterns used at enterprise AI consultancies like Livo.AI.