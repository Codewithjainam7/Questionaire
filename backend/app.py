"""
Flask REST API for RAG Question Answering
------------------------------------------
Endpoints:
- POST /qa/ask - Answer questions from the book
- POST /upload - Upload and ingest a PDF book
- GET /analytics/summary - Query statistics
- GET /health - Health check
"""

import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from rag_pipeline import retrieve, reload_index, get_index_info
from gemini_service import generate_answer, generate_answer_not_found
from model.ingest_book import ingest_pdf

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
ALLOWED_EXTENSIONS = {"pdf"}
DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "query_history.db")

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins="*")  # Enable CORS for all origins

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB max file size

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def init_database():
    """Initialize SQLite database for query history."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS query_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            pages TEXT,
            confidence REAL,
            book_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def save_query(question: str, answer: str, pages: list, confidence: float, book_name: str = None):
    """Save query to history database."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    pages_str = ",".join(str(p) for p in pages) if pages else ""
    cursor.execute(
        "INSERT INTO query_history (question, answer, pages, confidence, book_name) VALUES (?, ?, ?, ?, ?)",
        (question, answer, pages_str, confidence, book_name)
    )
    conn.commit()
    conn.close()


# Initialize database on startup
init_database()


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    index_info = get_index_info()
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "index": index_info
    })


@app.route("/upload", methods=["POST"])
def upload_pdf():
    """
    Upload and ingest a PDF book.
    
    Request: multipart/form-data with 'file' field
    Response: {success, book_name, total_pages, total_chunks}
    """
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file provided"}), 400
    
    file = request.files["file"]
    
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "Only PDF files are allowed"}), 400
    
    try:
        # Save file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        
        # Ingest PDF
        result = ingest_pdf(filepath)
        
        # Reload index
        reload_index()
        
        return jsonify({
            "success": True,
            "book_name": result["book_name"],
            "total_pages": result["total_pages"],
            "total_chunks": result["total_chunks"],
            "message": f"Successfully ingested {result['total_pages']} pages into {result['total_chunks']} chunks"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/qa/ask", methods=["POST"])
def ask_question():
    """
    Answer a question from the book.
    
    Request: {"question": "..."}
    Response: {
        "success": bool,
        "answer": str,
        "pages": list[int],
        "confidence": float,
        "snippets": list[str],
        "found": bool
    }
    """
    data = request.get_json()
    
    if not data or "question" not in data:
        return jsonify({"success": False, "error": "Question is required"}), 400
    
    question = data["question"].strip()
    
    if not question:
        return jsonify({"success": False, "error": "Question cannot be empty"}), 400
    
    try:
        # Step 1: Retrieve relevant chunks
        retrieval_result = retrieve(question)
        
        if not retrieval_result["success"]:
            return jsonify({
                "success": False,
                "error": retrieval_result.get("error", "Retrieval failed. Please upload a book first.")
            }), 400
        
        # Step 2: Check confidence threshold
        if not retrieval_result["found"]:
            answer = "Answer not found in the provided book."
            response = {
                "success": True,
                "answer": answer,
                "pages": [],
                "confidence": retrieval_result["confidence"],
                "snippets": [],
                "found": False,
                "book_name": retrieval_result.get("book_name", "unknown")
            }
            save_query(question, answer, [], retrieval_result["confidence"], retrieval_result.get("book_name"))
            return jsonify(response)
        
        # Step 3: Generate answer with Gemini
        gemini_result = generate_answer(
            question,
            retrieval_result["chunks"],
            retrieval_result["page_numbers"]
        )
        
        if not gemini_result["success"]:
            return jsonify({
                "success": False,
                "error": gemini_result.get("error", "Answer generation failed")
            }), 500
        
        # Get unique page numbers
        unique_pages = sorted(set(retrieval_result["page_numbers"]))
        
        response = {
            "success": True,
            "answer": gemini_result["answer"],
            "pages": unique_pages,
            "confidence": retrieval_result["confidence"],
            "snippets": retrieval_result["chunks"][:3],  # Top 3 snippets
            "found": True,
            "book_name": retrieval_result.get("book_name", "unknown")
        }
        
        # Save to history
        save_query(
            question,
            gemini_result["answer"],
            unique_pages,
            retrieval_result["confidence"],
            retrieval_result.get("book_name")
        )
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/analytics/summary", methods=["GET"])
def analytics_summary():
    """
    Get query analytics summary.
    
    Response: {
        "total_queries": int,
        "average_confidence": float,
        "most_cited_pages": list[{page, count}],
        "recent_queries": list[{question, timestamp}]
    }
    """
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Total queries
        cursor.execute("SELECT COUNT(*) FROM query_history")
        total_queries = cursor.fetchone()[0]
        
        # Average confidence
        cursor.execute("SELECT AVG(confidence) FROM query_history WHERE confidence > 0")
        avg_confidence = cursor.fetchone()[0] or 0.0
        
        # Most cited pages
        cursor.execute("SELECT pages FROM query_history WHERE pages != ''")
        all_pages = cursor.fetchall()
        page_counts = {}
        for row in all_pages:
            pages = row[0].split(",")
            for page in pages:
                if page:
                    page = int(page)
                    page_counts[page] = page_counts.get(page, 0) + 1
        
        most_cited = sorted(page_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        most_cited_pages = [{"page": p, "count": c} for p, c in most_cited]
        
        # Recent queries
        cursor.execute(
            "SELECT question, timestamp FROM query_history ORDER BY timestamp DESC LIMIT 10"
        )
        recent = cursor.fetchall()
        recent_queries = [{"question": q, "timestamp": t} for q, t in recent]
        
        conn.close()
        
        return jsonify({
            "success": True,
            "total_queries": total_queries,
            "average_confidence": round(avg_confidence, 4),
            "most_cited_pages": most_cited_pages,
            "recent_queries": recent_queries
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/books/info", methods=["GET"])
def book_info():
    """Get information about the currently loaded book."""
    index_info = get_index_info()
    return jsonify({
        "success": True,
        **index_info
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
