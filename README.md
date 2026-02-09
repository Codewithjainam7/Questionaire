# EduHub RAG - Knowledge-Driven Question Answering Platform

A production-grade RAG system that answers questions **only** from uploaded PDF books with page citations and confidence scores.

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

Backend runs at: `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## 📚 Features

- **PDF Upload**: Upload any book/document as PDF
- **Knowledge Q&A**: Ask questions and get answers only from the book
- **Page Citations**: Every answer includes page numbers
- **Confidence Scores**: See how confident the system is
- **Source Snippets**: View exact text used for answers
- **Query Analytics**: Track usage and most cited pages

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload & ingest PDF |
| `/qa/ask` | POST | Ask a question |
| `/analytics/summary` | GET | Get query statistics |
| `/books/info` | GET | Get loaded book info |
| `/health` | GET | Health check |

## 🛠️ Tech Stack

- **Backend**: Python Flask, FAISS, SentenceTransformers, Gemini API
- **Frontend**: React/Vite, TypeScript, Tailwind CSS
- **Deployment**: Render (backend), Vercel (frontend)

## 📦 Deployment

### Backend (Render)
- Push to GitHub
- Connect Render to repo
- Set `GEMINI_API_KEY` environment variable

### Frontend (Vercel)
- Push to GitHub
- Connect Vercel to repo
- Set `VITE_API_URL` to Render backend URL
