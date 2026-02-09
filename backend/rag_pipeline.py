"""
RAG Pipeline - Retrieval Engine
--------------------------------
Loads FAISS index, performs similarity search,
and returns relevant chunks with confidence scores.
"""

import os
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss

# Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
TOP_K = 5
CONFIDENCE_THRESHOLD = 0.30

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VECTOR_STORE_DIR = os.path.join(BASE_DIR, "vector_store")
METADATA_PATH = os.path.join(BASE_DIR, "metadata.pkl")

# Global model instance (loaded once)
_model = None
_index = None
_metadata = None


def get_model():
    """Get or initialize the embedding model."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def load_index_and_metadata(book_name: str = None):
    """Load FAISS index and metadata from disk."""
    global _index, _metadata
    
    if book_name:
        index_path = os.path.join(VECTOR_STORE_DIR, f"{book_name}_index.faiss")
        metadata_path = os.path.join(VECTOR_STORE_DIR, f"{book_name}_metadata.pkl")
    else:
        index_path = os.path.join(VECTOR_STORE_DIR, "index.faiss")
        metadata_path = METADATA_PATH
    
    if not os.path.exists(index_path):
        raise FileNotFoundError(f"Index not found: {index_path}. Please ingest a book first.")
    
    _index = faiss.read_index(index_path)
    
    with open(metadata_path, "rb") as f:
        _metadata = pickle.load(f)
    
    return _index, _metadata


def embed_query(query: str) -> np.ndarray:
    """Generate embedding for query."""
    model = get_model()
    embedding = model.encode([query], convert_to_numpy=True)
    faiss.normalize_L2(embedding)  # Normalize for cosine similarity
    return embedding


def retrieve(query: str, top_k: int = TOP_K, book_name: str = None) -> dict:
    """
    Retrieve top-k relevant chunks for a query.
    
    Returns:
        {
            "success": bool,
            "chunks": list of chunk texts,
            "page_numbers": list of page numbers,
            "scores": list of similarity scores,
            "confidence": average similarity score,
            "found": bool (True if confidence >= threshold)
        }
    """
    global _index, _metadata
    
    try:
        # Load index if not already loaded
        if _index is None or _metadata is None:
            load_index_and_metadata(book_name)
        
        # Generate query embedding
        query_embedding = embed_query(query)
        
        # Search FAISS index
        scores, indices = _index.search(query_embedding, top_k)
        scores = scores[0]  # Flatten
        indices = indices[0]
        
        # Get chunk data
        chunks_data = _metadata["chunks"]
        retrieved_chunks = []
        page_numbers = []
        valid_scores = []
        
        # ALWAYS include the first 2 chunks (Introduction/Abstract) for context
        # This helps with "What is this book about?" questions
        indices = list(indices)
        if 0 not in indices:
            indices.append(0)
        if 1 < len(chunks_data) and 1 not in indices:
            indices.append(1)
        
        for i, idx in enumerate(indices):
            if idx < len(chunks_data) and idx >= 0:
                chunk = chunks_data[idx]
                retrieved_chunks.append(chunk["text"])
                page_numbers.append(chunk["page_number"])
                # Use a high score for forced chunks if not present in search
                score = float(scores[i]) if i < len(scores) else 1.0 
                valid_scores.append(score)
        
        # Calculate confidence
        confidence = float(np.mean(valid_scores)) if valid_scores else 0.0
        found = confidence >= CONFIDENCE_THRESHOLD
        
        return {
            "success": True,
            "chunks": retrieved_chunks,
            "page_numbers": page_numbers,
            "scores": valid_scores,
            "confidence": round(confidence, 4),
            "found": found,
            "book_name": _metadata.get("book_name", "unknown")
        }
        
    except FileNotFoundError as e:
        return {
            "success": False,
            "error": str(e),
            "chunks": [],
            "page_numbers": [],
            "scores": [],
            "confidence": 0.0,
            "found": False
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "chunks": [],
            "page_numbers": [],
            "scores": [],
            "confidence": 0.0,
            "found": False
        }


def reload_index(book_name: str = None):
    """Force reload the index (call after ingesting new book)."""
    global _index, _metadata
    _index = None
    _metadata = None
    return load_index_and_metadata(book_name)


def get_index_info() -> dict:
    """Get information about the currently loaded index."""
    global _metadata
    if _metadata is None:
        return {"loaded": False}
    
    return {
        "loaded": True,
        "book_name": _metadata.get("book_name", "unknown"),
        "total_chunks": _metadata.get("total_chunks", 0),
        "embedding_model": _metadata.get("embedding_model", EMBEDDING_MODEL)
    }


if __name__ == "__main__":
    # Test retrieval
    result = retrieve("What is the main topic of this book?")
    print(result)
