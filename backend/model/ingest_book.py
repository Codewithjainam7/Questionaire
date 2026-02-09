"""
Book Ingestion Pipeline
-----------------------
Processes PDF files, extracts text, creates chunks with metadata,
generates embeddings, and stores in FAISS vector database.
"""

import os
import pickle
import fitz  # PyMuPDF
import numpy as np
import tiktoken
from sentence_transformers import SentenceTransformer
import faiss

# Configuration
CHUNK_SIZE = 384  # tokens (Aligned with all-MiniLM-L6-v2 max sequence)
CHUNK_OVERLAP = 50  # tokens
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VECTOR_STORE_DIR = os.path.join(BASE_DIR, "vector_store")
METADATA_PATH = os.path.join(BASE_DIR, "metadata.pkl")

# Initialize tokenizer for accurate token counting
tokenizer = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Count tokens in text using tiktoken."""
    return len(tokenizer.encode(text))


def extract_text_from_pdf(pdf_path: str) -> list[dict]:
    """
    Extract text from PDF page by page.
    Returns list of {page_number, text} dicts.
    """
    doc = fitz.open(pdf_path)
    pages = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            pages.append({
                "page_number": page_num + 1,  # 1-indexed
                "text": text.strip()
            })
    
    doc.close()
    return pages


def chunk_text(pages: list[dict], chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[dict]:
    """
    Create overlapping chunks from pages with metadata.
    Each chunk includes page_number and chunk_id.
    """
    chunks = []
    chunk_id = 0
    
    for page_data in pages:
        page_num = page_data["page_number"]
        text = page_data["text"]
        
        # Split into sentences for better chunking
        sentences = text.replace("\n", " ").split(". ")
        
        current_chunk = ""
        current_tokens = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            sentence_tokens = count_tokens(sentence)
            
            if current_tokens + sentence_tokens <= chunk_size:
                current_chunk += sentence + ". "
                current_tokens += sentence_tokens
            else:
                if current_chunk.strip():
                    chunks.append({
                        "chunk_id": chunk_id,
                        "page_number": page_num,
                        "text": current_chunk.strip(),
                        "token_count": current_tokens
                    })
                    chunk_id += 1
                
                # Start new chunk with overlap
                overlap_text = current_chunk.split(". ")[-3:]  # Last 3 sentences as overlap
                current_chunk = ". ".join(overlap_text) + " " + sentence + ". "
                current_tokens = count_tokens(current_chunk)
        
        # Add remaining text as chunk
        if current_chunk.strip():
            chunks.append({
                "chunk_id": chunk_id,
                "page_number": page_num,
                "text": current_chunk.strip(),
                "token_count": current_tokens
            })
            chunk_id += 1
    
    return chunks


def generate_embeddings(chunks: list[dict], model_name: str = EMBEDDING_MODEL) -> np.ndarray:
    """Generate embeddings for all chunks using SentenceTransformers."""
    model = SentenceTransformer(model_name)
    texts = [chunk["text"] for chunk in chunks]
    # Use batch_size=64 for faster CPU processing (default is 32)
    embeddings = model.encode(texts, batch_size=64, show_progress_bar=True, convert_to_numpy=True)
    return embeddings


def create_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatIP:
    """Create FAISS index with inner product (cosine similarity after normalization)."""
    # Normalize embeddings for cosine similarity
    faiss.normalize_L2(embeddings)
    
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)  # Inner product = cosine sim after normalization
    index.add(embeddings)
    
    return index


def save_index_and_metadata(index: faiss.IndexFlatIP, chunks: list[dict], book_name: str = "default"):
    """Save FAISS index and metadata to disk."""
    os.makedirs(VECTOR_STORE_DIR, exist_ok=True)
    
    # Save FAISS index
    index_path = os.path.join(VECTOR_STORE_DIR, f"{book_name}_index.faiss")
    faiss.write_index(index, index_path)
    
    # Save metadata
    metadata = {
        "book_name": book_name,
        "chunks": chunks,
        "total_chunks": len(chunks),
        "embedding_model": EMBEDDING_MODEL
    }
    metadata_path = os.path.join(VECTOR_STORE_DIR, f"{book_name}_metadata.pkl")
    with open(metadata_path, "wb") as f:
        pickle.dump(metadata, f)
    
    # Also save as default
    faiss.write_index(index, os.path.join(VECTOR_STORE_DIR, "index.faiss"))
    with open(METADATA_PATH, "wb") as f:
        pickle.dump(metadata, f)
    
    return index_path, metadata_path


def ingest_pdf(pdf_path: str, book_name: str = None) -> dict:
    """
    Main ingestion pipeline.
    1. Extract text from PDF
    2. Chunk text with overlap
    3. Generate embeddings
    4. Store in FAISS
    5. Save metadata
    """
    if book_name is None:
        book_name = os.path.splitext(os.path.basename(pdf_path))[0]
    
    print(f"📚 Ingesting PDF: {pdf_path}")
    
    # Step 1: Extract text
    print("📄 Extracting text from PDF...")
    pages = extract_text_from_pdf(pdf_path)
    print(f"   Extracted {len(pages)} pages")
    
    # Step 2: Chunk text
    print("✂️  Chunking text...")
    chunks = chunk_text(pages)
    print(f"   Created {len(chunks)} chunks")
    
    # Step 3: Generate embeddings
    print("🧠 Generating embeddings...")
    embeddings = generate_embeddings(chunks)
    print(f"   Generated embeddings: {embeddings.shape}")
    
    # Step 4: Create FAISS index
    print("📊 Creating FAISS index...")
    index = create_faiss_index(embeddings)
    
    # Step 5: Save everything
    print("💾 Saving index and metadata...")
    index_path, metadata_path = save_index_and_metadata(index, chunks, book_name)
    
    result = {
        "success": True,
        "book_name": book_name,
        "total_pages": len(pages),
        "total_chunks": len(chunks),
        "index_path": index_path,
        "metadata_path": metadata_path
    }
    
    print(f"✅ Ingestion complete!")
    print(f"   Book: {book_name}")
    print(f"   Pages: {len(pages)}")
    print(f"   Chunks: {len(chunks)}")
    
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        result = ingest_pdf(pdf_path)
        print(result)
    else:
        print("Usage: python ingest_book.py <path_to_pdf>")
