/**
 * RAG Service - API calls to the Flask backend
 * Handles PDF upload, Q&A, and analytics
 */

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface QAResponse {
    success: boolean;
    answer: string;
    pages: number[];
    confidence: number;
    snippets: string[];
    found: boolean;
    book_name?: string;
    error?: string;
}

export interface UploadResponse {
    success: boolean;
    book_name?: string;
    total_pages?: number;
    total_chunks?: number;
    message?: string;
    error?: string;
}

export interface AnalyticsResponse {
    success: boolean;
    total_queries: number;
    average_confidence: number;
    most_cited_pages: { page: number; count: number }[];
    recent_queries: { question: string; timestamp: string }[];
    error?: string;
}

export interface BookInfoResponse {
    success: boolean;
    loaded: boolean;
    book_name?: string;
    total_chunks?: number;
    embedding_model?: string;
}

/**
 * Upload a PDF book for ingestion
 */
export const uploadPDF = async (file: File): Promise<UploadResponse> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        return data;
    } catch (error: any) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: error.message || 'Failed to upload PDF',
        };
    }
};

/**
 * Ask a question to the RAG system
 */
export const askQuestion = async (question: string): Promise<QAResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/qa/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question }),
        });

        const data = await response.json();
        return data;
    } catch (error: any) {
        console.error('QA error:', error);
        return {
            success: false,
            answer: '',
            pages: [],
            confidence: 0,
            snippets: [],
            found: false,
            error: error.message || 'Failed to get answer',
        };
    }
};

/**
 * Get analytics summary
 */
export const getAnalytics = async (): Promise<AnalyticsResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/summary`);
        const data = await response.json();
        return data;
    } catch (error: any) {
        console.error('Analytics error:', error);
        return {
            success: false,
            total_queries: 0,
            average_confidence: 0,
            most_cited_pages: [],
            recent_queries: [],
            error: error.message || 'Failed to fetch analytics',
        };
    }
};

/**
 * Get book info
 */
export const getBookInfo = async (): Promise<BookInfoResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/books/info`);
        const data = await response.json();
        return data;
    } catch (error: any) {
        console.error('Book info error:', error);
        return {
            success: false,
            loaded: false,
        };
    }
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return data.status === 'healthy';
    } catch {
        return false;
    }
};
