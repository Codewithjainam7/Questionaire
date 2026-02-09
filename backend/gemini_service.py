"""
Gemini Service - Grounded Answer Generation
--------------------------------------------
Uses Google Gemini API to generate answers ONLY from provided context.
Enforces strict grounding with page citations.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-1.5-flash"

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Strict grounding prompt
SYSTEM_PROMPT = """You are an intelligent and analytical teaching assistant. Your goal is to answer the user's question using ONLY the provided context from the book.
 
 Guidelines:
 1. **Analyze and Synthesize:** The answer might not be explicitly stated sentence-by-sentence. You should aggregate information, read tables (if text representation exists), and draw logical inferences from the provided segments.
 2. **Strict Grounding:** Do NOT use external knowledge. If the answer cannot be derived from the context, state: "Answer not found in the provided book."
 3. **Citations:** Always cite the page number(s) at the end of your answer.
 4. **Flexibility:** Understand the intent of the question. If the user asks "highest poverty", look for statistics, rankings, or comparative statements in the text.
 5. **Summarization:** If the user asks "What is this about?", "Summarize", or provides a keyword like "Poverty", provide a comprehensive summary or relevant details from the context.
 
 Format: Provide a clear, direct answer followed by citations (e.g., [Page 5])."""


def generate_answer(question: str, chunks: list[str], page_numbers: list[int]) -> dict:
    """
    Generate answer using Gemini with strict grounding.
    
    Args:
        question: User's question
        chunks: Retrieved text chunks from the book
        page_numbers: Corresponding page numbers for each chunk
    
    Returns:
        {
            "success": bool,
            "answer": str,
            "error": str (if failed)
        }
    """
    try:
        # Build context with page citations
        context_parts = []
        for i, (chunk, page) in enumerate(zip(chunks, page_numbers)):
            context_parts.append(f"[Page {page}]\n{chunk}")
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Build the prompt
        prompt = f"""{SYSTEM_PROMPT}

CONTEXT FROM THE BOOK:
{context}

---

QUESTION: {question}

ANSWER (cite page numbers):"""

        # Initialize model and generate
        model = genai.GenerativeModel(MODEL_NAME)
        
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,  # Lower temperature for more factual responses
                max_output_tokens=1024,
            )
        )
        
        answer = response.text.strip()
        
        return {
            "success": True,
            "answer": answer
        }
        
    except Exception as e:
        return {
            "success": False,
            "answer": "",
            "error": str(e)
        }


def generate_answer_not_found() -> dict:
    """Return standard 'not found' response."""
    return {
        "success": True,
        "answer": "Answer not found in the provided book."
    }


if __name__ == "__main__":
    # Test
    test_chunks = [
        "Machine learning is a subset of artificial intelligence that enables systems to learn from data.",
        "Deep learning uses neural networks with multiple layers to process complex patterns."
    ]
    test_pages = [1, 5]
    
    result = generate_answer("What is machine learning?", test_chunks, test_pages)
    print(result)
