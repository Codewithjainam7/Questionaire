import React, { useState, useRef, useEffect } from 'react';
import { uploadPDF, askQuestion, getBookInfo, QAResponse, BookInfoResponse } from '../services/ragService';

// Icons
const BookIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const UploadIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const SendIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const SparklesIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    pages?: number[];
    confidence?: number;
    snippets?: string[];
    found?: boolean;
    timestamp: Date;
}

export const QAView: React.FC = () => {
    const [bookInfo, setBookInfo] = useState<BookInfoResponse | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showSnippets, setShowSnippets] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Fetch book info on mount
    useEffect(() => {
        fetchBookInfo();
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchBookInfo = async () => {
        const info = await getBookInfo();
        setBookInfo(info);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert('Please upload a PDF file only.');
            return;
        }

        setUploading(true);
        const result = await uploadPDF(file);

        if (result.success) {
            setMessages([{
                id: crypto.randomUUID(),
                type: 'assistant',
                content: `📚 **Book Uploaded Successfully!**\n\n**${result.book_name}**\n\n- Pages: ${result.total_pages}\n- Chunks: ${result.total_chunks}\n\nYou can now ask questions about this book.`,
                timestamp: new Date(),
            }]);
            fetchBookInfo();
        } else {
            alert(`Upload failed: ${result.error}`);
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const question = input.trim();
        setInput('');

        // Add user message
        const userMessage: Message = {
            id: crypto.randomUUID(),
            type: 'user',
            content: question,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        setLoading(true);

        const response = await askQuestion(question);

        // Add assistant response
        const assistantMessage: Message = {
            id: crypto.randomUUID(),
            type: 'assistant',
            content: response.success ? response.answer : `Error: ${response.error}`,
            pages: response.pages,
            confidence: response.confidence,
            snippets: response.snippets,
            found: response.found,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        setLoading(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.7) return 'text-green-400 bg-green-500/20';
        if (confidence >= 0.5) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-red-400 bg-red-500/20';
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    📖 Knowledge Q&A
                </h1>
                <p className="text-gray-400">
                    Ask questions about your uploaded book. Get accurate answers with page citations.
                </p>
            </div>

            {/* Book Status Card */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/20">
                            <BookIcon />
                        </div>
                        <div>
                            {bookInfo?.loaded ? (
                                <>
                                    <h3 className="font-semibold text-white">{bookInfo.book_name}</h3>
                                    <p className="text-sm text-gray-400">{bookInfo.total_chunks} indexed chunks</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-semibold text-gray-300">No book loaded</h3>
                                    <p className="text-sm text-gray-500">Upload a PDF to get started</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium transition-all duration-300 disabled:opacity-50"
                        >
                            {uploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <UploadIcon />
                                    Upload PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Container */}
            <div className="glass-card flex flex-col h-[500px]">
                {/* Messages */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                            <SparklesIcon />
                            <p className="mt-2">Ask any question about your uploaded book</p>
                            <p className="text-sm text-gray-500">
                                Every answer includes page citations and confidence scores
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl p-4 ${msg.type === 'user'
                                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                                            : 'bg-white/5 border border-white/10 text-gray-200'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap">{msg.content}</div>

                                    {/* Metadata for assistant messages */}
                                    {msg.type === 'assistant' && msg.pages && msg.pages.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                            {/* Page citations */}
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-xs text-gray-400">Pages:</span>
                                                {msg.pages.map((page) => (
                                                    <span
                                                        key={page}
                                                        className="px-2 py-0.5 text-xs rounded-full bg-violet-500/30 text-violet-300"
                                                    >
                                                        Page {page}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Confidence score */}
                                            {msg.confidence !== undefined && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">Confidence:</span>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getConfidenceColor(msg.confidence)}`}>
                                                        {(msg.confidence * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            )}

                                            {/* Source snippets accordion */}
                                            {msg.snippets && msg.snippets.length > 0 && (
                                                <div>
                                                    <button
                                                        onClick={() => setShowSnippets(showSnippets === msg.id ? null : msg.id)}
                                                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                                                    >
                                                        {showSnippets === msg.id ? '▼ Hide' : '▶ Show'} source snippets ({msg.snippets.length})
                                                    </button>
                                                    {showSnippets === msg.id && (
                                                        <div className="mt-2 space-y-2">
                                                            {msg.snippets.map((snippet, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="p-2 rounded bg-black/30 text-xs text-gray-300 max-h-24 overflow-y-auto"
                                                                >
                                                                    {snippet.substring(0, 300)}...
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {/* Loading indicator */}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={bookInfo?.loaded ? "Ask a question about the book..." : "Upload a PDF first..."}
                            disabled={!bookInfo?.loaded || loading}
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading || !bookInfo?.loaded}
                            className="px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <SendIcon />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">💡 Tips</h3>
                <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Answers are generated <strong>only</strong> from the uploaded book content</li>
                    <li>• Higher confidence scores indicate more reliable answers</li>
                    <li>• Click "Show source snippets" to see the exact text used for the answer</li>
                    <li>• If confidence is low, the system will indicate the answer wasn't found</li>
                </ul>
            </div>
        </div>
    );
};
