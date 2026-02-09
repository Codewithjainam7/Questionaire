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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyA6YsmIQ1uODrZlAOVyEWVULMtjZRq3TZ4")
MODEL_NAME = "gemini-1.5-flash"

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Strict grounding prompt
SYSTEM_PROMPT = """You are a precise question-answering assistant. You MUST follow these rules strictly:

1. Use ONLY the provided context to answer the question.
2. Do NOT use any external knowledge or information not present in the context.
3. Always cite the page number(s) from which you derived the answer.
4. If the context does not contain enough information to answer the question, respond exactly: "Answer not found in the provided book."
5. Keep your answers clear, concise, and accurate.
6. Format page citations as: (Page X) or (Pages X, Y, Z)

Remember: You have NO knowledge outside the provided context. Only answer from what is given."""


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
