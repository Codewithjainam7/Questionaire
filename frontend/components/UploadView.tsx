import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { UploadedFile, GeneratorMode, GeneratedItem, GeneratedSet, DocumentAnalysis } from '../types';
import { Upload, FileText, Loader2, X, Sparkles, Check, ChevronRight, Settings, FileQuestion, BookOpen, PenTool, LayoutTemplate, ArrowRight, Download, RefreshCw, Plus, Minus, History, Calendar, Clock, ChevronLeft, ScanLine, AlertTriangle, MessageSquare, Send, Bot, User } from 'lucide-react';
import { generateQuestionBank, analyzeDocument, askDocumentQuestion } from '../services/geminiService';
import { jsPDF } from 'jspdf';

interface UploadViewProps {
  files: UploadedFile[];
  onUpload: (file: UploadedFile) => void;
  history: GeneratedSet[];
  onAddToHistory: (set: GeneratedSet) => void;
}

type Step = 'UPLOAD' | 'CONFIG' | 'GENERATING' | 'RESULT';
type Tab = 'CREATE' | 'HISTORY';
type ConfigMode = 'GENERATOR' | 'CHAT';

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

export const UploadView: React.FC<UploadViewProps> = ({ files, onUpload, history, onAddToHistory }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>('CREATE');
  
  // Generator State
  const [step, setStep] = useState<Step>('UPLOAD');
  const [activeFile, setActiveFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<GeneratorMode>('QUESTION_BANK');
  const [dragActive, setDragActive] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Config View State (Chat vs Gen)
  const [configMode, setConfigMode] = useState<ConfigMode>('GENERATOR');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Question Bank Config
  const [shortQCount, setShortQCount] = useState(5);
  const [longQCount, setLongQCount] = useState(2);
  
  // Result State
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [currentSetId, setCurrentSetId] = useState<string>(''); // To track if we are viewing a history item
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, configMode]);

  // --- Handlers ---

  const processFile = async (file: File) => {
    setProcessingFile(true);
    
    // Call Gemini Service to analyze the document (Real-time)
    const analysisResult = await analyzeDocument(file);
    
    if (analysisResult && !('error' in analysisResult)) {
        // Success: It's valid study material
        const successData = analysisResult as { text: string, topics: string[], analysis: DocumentAnalysis };
        
        const newFileObj: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            content: successData.text,
            type: file.type,
            date: new Date().toISOString(),
            status: 'ready',
            topics: successData.topics,
            analysis: successData.analysis
        };
        
        onUpload(newFileObj);
        setActiveFile(newFileObj);
        setChatMessages([{
            id: 'init',
            role: 'ai',
            text: `I've analyzed ${file.name}. You can generate study materials or ask me questions about the content.`,
            timestamp: new Date()
        }]);
        setStep('CONFIG');
    } else {
        // Error or Rejection
        const errorMessage = (analysisResult && 'error' in analysisResult) 
            ? (analysisResult as { error: string }).error 
            : "Error reading file or API key missing. Please check your configuration.";

         const newFileObj: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            content: errorMessage,
            type: file.type,
            date: new Date().toISOString(),
            status: 'error',
            topics: ['Analysis Failed'],
            analysis: {
                summary: errorMessage,
                keyConcepts: [],
                definitions: [],
                formulas: []
            }
        };
        onUpload(newFileObj);
        setActiveFile(newFileObj);
        setStep('CONFIG');
    }

    setProcessingFile(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const handleGenerate = async () => {
    if (!activeFile || activeFile.status === 'error') return;
    setGenerating(true);
    setStep('GENERATING');
    
    const items = await generateQuestionBank(activeFile.content, mode, shortQCount, longQCount);
    
    // Save to History
    const newSet: GeneratedSet = {
        id: crypto.randomUUID(),
        type: mode,
        title: mode === 'QUESTION_BANK' ? 'Exam Paper' : `${mode} Set`,
        date: new Date().toISOString(),
        items: items,
        sourceFileName: activeFile.name,
        totalMarks: mode === 'QUESTION_BANK' ? (shortQCount * 3) + (longQCount * 6) : undefined
    };

    onAddToHistory(newSet);
    
    setGeneratedItems(items);
    setCurrentSetId(newSet.id);
    setGenerating(false);
    setStep('RESULT');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    let yPosition = 20;

    const checkPageBreak = (heightNeeded: number) => {
        if (yPosition + heightNeeded > pageHeight - margin) {
            doc.addPage();
            yPosition = 20;
        }
    };

    // Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80); // Dark Blue-Gray
    doc.setFont("helvetica", "bold");
    doc.text("EduHub Pro Study Set", margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 140, 141); // Gray
    doc.text(`Generated on ${new Date().toLocaleDateString()} | Source: ${activeFile?.name || 'AI Generated'}`, margin, yPosition);
    yPosition += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    generatedItems.forEach((item, index) => {
        // Question Block Calculation
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);

        const questionTitle = `Q${index + 1}. ${item.question}`;
        const questionLines = doc.splitTextToSize(questionTitle, maxLineWidth);
        const questionHeight = questionLines.length * 7;

        checkPageBreak(questionHeight + 10);

        doc.text(questionLines, margin, yPosition);
        yPosition += questionHeight + 5;

        // Options
        if (item.options && item.options.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            
            item.options.forEach((opt, i) => {
                const optText = `${String.fromCharCode(65 + i)}) ${opt}`;
                const optLines = doc.splitTextToSize(optText, maxLineWidth - 10);
                const optHeight = optLines.length * 6;
                
                checkPageBreak(optHeight);
                doc.text(optLines, margin + 5, yPosition);
                yPosition += optHeight + 2;
            });
            yPosition += 5;
        }

        // Answer Section
        const answerPrefix = "Model Answer: ";
        const answerText = item.answer;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(39, 174, 96); // Green

        checkPageBreak(20); 
        doc.text(answerPrefix, margin, yPosition);
        yPosition += 5;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        
        const answerLines = doc.splitTextToSize(answerText, maxLineWidth);
        const answerHeight = answerLines.length * 5;
        
        checkPageBreak(answerHeight);
        doc.text(answerLines, margin, yPosition);
        yPosition += answerHeight + 15; // Spacing after item
    });

    doc.save(`${mode.toLowerCase()}_set_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleAskQuestion = async () => {
      if (!chatInput.trim() || !activeFile) return;
      
      const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          text: chatInput,
          timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
      setChatLoading(true);

      const answer = await askDocumentQuestion(activeFile.content, userMsg.text);

      const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'ai',
          text: answer,
          timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMsg]);
      setChatLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleAskQuestion();
      }
  };

  const reset = () => {
    setStep('UPLOAD');
    setGeneratedItems([]);
    setActiveFile(null);
    setCurrentSetId('');
    setConfigMode('GENERATOR');
    setChatMessages([]);
  };

  const viewHistoryItem = (item: GeneratedSet) => {
      setGeneratedItems(item.items);
      setCurrentSetId(item.id);
      // Hack: Reuse 'RESULT' step to show the viewer
      setStep('RESULT'); 
      setActiveTab('CREATE'); // Switch view context to show the result
  };

  // --- Render ---

  return (
    <div className="h-full max-w-[1200px] mx-auto animate-fade-in text-gray-200 pb-20 pt-4">
      
      {/* Header & Controls */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between px-2 gap-6">
         <div>
            <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight">
                Question Forge
            </h2>
            <div className="flex items-center gap-2 mt-2">
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
                    <Sparkles size={12} className="text-brand-primary" />
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">AI Tutor Engine</span>
                </div>
            </div>
         </div>

         {/* Center Tab Switcher */}
         <div className="bg-black/30 p-1 rounded-full flex relative h-10 w-full md:w-64 border border-white/10">
             <div 
                className={`absolute top-1 bottom-1 rounded-full bg-white/10 border border-white/5 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]`}
                style={{
                    left: activeTab === 'CREATE' ? '0.25rem' : '50%',
                    width: 'calc(50% - 0.25rem)'
                }}
             ></div>
             <button 
                onClick={() => { setActiveTab('CREATE'); if(step === 'RESULT' && !currentSetId) reset(); }}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CREATE' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
             >
                <Sparkles size={12} />
                Generator
             </button>
             <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
             >
                <History size={12} />
                Library
             </button>
         </div>
      </header>

      {/* --- TAB: CREATE GENERATOR --- */}
      {activeTab === 'CREATE' && (
        <>
            {/* Header Actions (Only show reset if we are deep in the process) */}
            {step !== 'UPLOAD' && (
                 <div className="mb-6 flex justify-start">
                     <button 
                        onClick={reset} 
                        className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all active:scale-95"
                     >
                        <ChevronLeft size={14} className="text-gray-400 group-hover:text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Back / Reset</span>
                     </button>
                 </div>
            )}

            {/* STEP 1: UPLOAD */}
            {step === 'UPLOAD' && (
                <div className="animate-scale-in max-w-4xl mx-auto">
                    <div 
                        className={`
                            w-full h-[380px] rounded-[44px] flex flex-col items-center justify-center p-12 transition-all duration-500 relative overflow-hidden cursor-pointer group
                            ${dragActive 
                                ? 'bg-brand-primary/10 border-brand-primary shadow-[0_0_60px_rgba(59,130,246,0.2)] scale-[1.01]' 
                                : 'bg-black/20 backdrop-blur-3xl border border-white/[0.08] hover:border-white/20 hover:shadow-2xl'}
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <input ref={inputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.txt,.doc,.docx,.jpg,.png" />
                        
                        {/* Background Ambient Effects */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
                        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-primary/10 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        {processingFile ? (
                            <div className="flex flex-col items-center z-10">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-brand-primary animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <ScanLine size={24} className="text-white animate-pulse" />
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-white tracking-tight">Analyzing Study Material</span>
                                <span className="text-xs text-white/40 font-bold uppercase tracking-[0.2em] mt-2">Extracting Concepts & Definitions</span>
                            </div>
                        ) : (
                            <>
                                <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-[0_10px_40px_rgba(0,0,0,0.3)] group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <Upload size={40} className="text-white relative z-10" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-3 text-center">Drop Source Material</h3>
                                <p className="text-white/40 mb-8 max-w-sm text-center text-sm leading-relaxed">
                                    Support for PDF, Images, and Text. <br/> Gemini 2.5 real-time analysis enabled.
                                </p>
                                <button className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
                                    <span className="w-4 h-4 bg-black rounded-full flex items-center justify-center text-white">
                                        <Plus size={10} />
                                    </span>
                                    Select File
                                </button>
                            </>
                        )}
                    </div>

                    {/* Recent Files */}
                    {files.length > 0 && (
                        <div className="mt-10">
                            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 pl-4">Quick Select</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {files.map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => { setActiveFile(f); setStep('CONFIG'); }}
                                        className="flex items-center gap-4 p-4 rounded-[24px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all text-left group active:scale-[0.98]"
                                    >
                                        <div className={`
                                            w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                                            ${f.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white/40 group-hover:text-brand-primary group-hover:bg-brand-primary/10'}
                                        `}>
                                            {f.status === 'error' ? <AlertTriangle size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{f.name}</div>
                                            <div className="text-[10px] text-white/30 font-medium mt-0.5">{new Date(f.date).toLocaleDateString()}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: CONFIGURATION & CHAT */}
            {step === 'CONFIG' && activeFile && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up h-[600px]">
                    {/* Left Column: Context & Mode */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <GlassCard className={`p-6 !rounded-[32px] bg-gradient-to-br ${activeFile.status === 'error' ? 'from-red-500/10 to-transparent border-red-500/20' : 'from-white/[0.05] to-transparent'}`}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner
                                    ${activeFile.status === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-black/40 text-brand-primary border-white/10'}
                                `}>
                                    {activeFile.status === 'error' ? <AlertTriangle size={24} /> : <FileText size={24} />}
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${activeFile.status === 'error' ? 'text-red-400' : 'text-brand-primary'}`}>Source Context</div>
                                    <div className="text-white font-bold text-lg truncate max-w-[180px]">{activeFile.name}</div>
                                </div>
                            </div>
                            
                            {/* Extracted Analysis Preview */}
                            {activeFile.analysis && (
                                <div className={`rounded-2xl p-4 border text-xs space-y-3 ${activeFile.status === 'error' ? 'bg-red-500/5 border-red-500/10 text-red-200' : 'bg-black/20 border-white/5 text-gray-400'}`}>
                                    <div>
                                        <span className={`block text-[9px] font-bold uppercase tracking-widest mb-1 ${activeFile.status === 'error' ? 'text-red-400' : 'text-white/30'}`}>
                                            {activeFile.status === 'error' ? 'Rejection Reason' : 'Detected Summary'}
                                        </span>
                                        <p className="line-clamp-3">{activeFile.analysis.summary}</p>
                                    </div>
                                    {activeFile.status !== 'error' && (
                                        <div>
                                            <span className="block text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Key Topics</span>
                                            <div className="flex flex-wrap gap-2">
                                                {activeFile.topics.slice(0,4).map(t => (
                                                    <span key={t} className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </GlassCard>
                        
                        <div className={`bg-black/20 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 space-y-1 flex-1 overflow-y-auto ${activeFile.status === 'error' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            {[
                                { id: 'QUESTION_BANK', label: 'Exam Paper', icon: FileQuestion },
                                { id: 'MCQ', label: 'Multiple Choice', icon: LayoutTemplate },
                                { id: 'FLASHCARD', label: 'Flashcards', icon: BookOpen },
                                { id: 'FILL_BLANK', label: 'Fill in Blanks', icon: PenTool },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => { setMode(m.id as GeneratorMode); setConfigMode('GENERATOR'); }}
                                    className={`w-full flex items-center justify-between p-4 rounded-[24px] transition-all duration-300 group relative overflow-hidden
                                        ${mode === m.id 
                                            ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                                            : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}
                                    `}
                                >
                                    {mode === m.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary"></div>
                                    )}
                                    <div className="flex items-center gap-4">
                                        <m.icon size={20} className={mode === m.id ? 'text-brand-primary' : 'opacity-70'} />
                                        <span className="font-bold text-sm tracking-wide">{m.label}</span>
                                    </div>
                                    {mode === m.id && <Check size={16} className="text-brand-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Dynamic Configuration OR Chat */}
                    <div className="lg:col-span-8">
                        <GlassCard className="h-full flex flex-col justify-between !rounded-[40px] relative overflow-hidden bg-black/40" noPadding>
                            
                            {/* Header / Toggle */}
                            <div className="flex items-center justify-between p-8 border-b border-white/[0.05]">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">
                                        {configMode === 'GENERATOR' ? 'Generator Config' : 'Chat with Document'}
                                    </h3>
                                    <p className="text-white/40 text-xs font-medium">
                                        {configMode === 'GENERATOR' ? 'Fine-tune output parameters' : 'Ask questions based on context'}
                                    </p>
                                </div>
                                <div className="bg-black/40 p-1 rounded-full border border-white/10 flex">
                                    <button 
                                        onClick={() => setConfigMode('GENERATOR')}
                                        className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${configMode === 'GENERATOR' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        Settings
                                    </button>
                                    <button 
                                        onClick={() => setConfigMode('CHAT')}
                                        className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${configMode === 'CHAT' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        Ask AI
                                    </button>
                                </div>
                            </div>

                            {activeFile.status === 'error' && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-center p-8">
                                    <div className="w-20 h-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Access Locked</h3>
                                    <p className="text-white/50 max-w-md">
                                        Non-educational content detected.
                                    </p>
                                </div>
                            )}

                            {/* Main Content Area */}
                            <div className="flex-1 relative overflow-hidden flex flex-col">
                                {configMode === 'GENERATOR' ? (
                                    <div className="p-8 h-full flex flex-col justify-between animate-fade-in relative z-10">
                                         <div className="absolute top-[-20%] right-[-20%] w-[400px] h-[400px] bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

                                        {mode === 'QUESTION_BANK' ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Short Q */}
                                                    <div className="bg-white/[0.03] p-6 rounded-[32px] border border-white/5 relative group hover:border-white/10 transition-colors">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div>
                                                                <label className="block text-xs font-bold text-white uppercase tracking-widest mb-1">Short Answer</label>
                                                                <span className="text-[10px] text-white/30 font-mono">3 Marks Each</span>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                                <PenTool size={14} />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between bg-black/20 rounded-2xl p-2 border border-white/5">
                                                            <button onClick={() => setShortQCount(Math.max(0, shortQCount - 1))} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors active:scale-95"><Minus size={18}/></button>
                                                            <span className="text-2xl font-bold text-white font-mono tabular-nums">{shortQCount}</span>
                                                            <button onClick={() => setShortQCount(shortQCount + 1)} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors active:scale-95"><Plus size={18}/></button>
                                                        </div>
                                                    </div>

                                                    {/* Long Q */}
                                                    <div className="bg-white/[0.03] p-6 rounded-[32px] border border-white/5 relative group hover:border-white/10 transition-colors">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div>
                                                                <label className="block text-xs font-bold text-white uppercase tracking-widest mb-1">Long Answer</label>
                                                                <span className="text-[10px] text-white/30 font-mono">6 Marks Each</span>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-brand-violet/10 flex items-center justify-center text-brand-violet">
                                                                <FileText size={14} />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between bg-black/20 rounded-2xl p-2 border border-white/5">
                                                            <button onClick={() => setLongQCount(Math.max(0, longQCount - 1))} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors active:scale-95"><Minus size={18}/></button>
                                                            <span className="text-2xl font-bold text-white font-mono tabular-nums">{longQCount}</span>
                                                            <button onClick={() => setLongQCount(longQCount + 1)} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors active:scale-95"><Plus size={18}/></button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-6 rounded-[24px] bg-gradient-to-r from-brand-primary/10 via-brand-violet/5 to-transparent border border-brand-primary/20">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-brand-primary rounded-xl text-white shadow-lg shadow-brand-primary/40">
                                                            <Sparkles size={20} fill="currentColor" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-0.5">Total Marks</div>
                                                            <div className="text-white/50 text-xs">Based on current selection</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-4xl font-bold text-white tabular-nums tracking-tight">
                                                        {(shortQCount * 3) + (longQCount * 6)}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center flex-1 bg-white/[0.02] rounded-[32px] border border-white/5 text-center p-8 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent opacity-50"></div>
                                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                                                    <Sparkles className="text-brand-primary" size={32} />
                                                </div>
                                                <h4 className="text-xl font-bold text-white mb-2 relative z-10">Smart Formatting</h4>
                                                <p className="text-white/40 max-w-sm text-sm relative z-10 leading-relaxed">
                                                    The AI will determine the optimal structure for {mode === 'MCQ' ? 'multiple choice' : mode === 'FLASHCARD' ? 'flashcards' : 'fill-in-the-blank'} based on content density.
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-8 flex justify-end">
                                            <button 
                                                onClick={handleGenerate}
                                                disabled={activeFile.status === 'error'}
                                                className="group relative bg-white text-black pl-8 pr-6 py-5 rounded-[24px] font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-6 overflow-hidden disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                                            >
                                                <span className="relative z-10">Generate Study Set</span>
                                                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:rotate-90 transition-transform duration-500 relative z-10">
                                                    <ArrowRight size={18} />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // CHAT INTERFACE
                                    <div className="flex flex-col h-full animate-fade-in bg-black/20">
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                            {chatMessages.length === 0 && (
                                                <div className="flex flex-col items-center justify-center h-full text-white/30">
                                                    <MessageSquare size={48} className="mb-4 opacity-50" />
                                                    <p className="text-sm font-medium">Ask anything about this document.</p>
                                                </div>
                                            )}
                                            {chatMessages.map((msg) => (
                                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`
                                                        max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed
                                                        ${msg.role === 'user' 
                                                            ? 'bg-brand-primary text-white rounded-br-sm shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                                                            : 'bg-white/10 text-gray-200 rounded-bl-sm border border-white/5'}
                                                    `}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            ))}
                                            {chatLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-white/5 p-4 rounded-2xl rounded-bl-sm border border-white/5 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
                                                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>
                                        
                                        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={chatInput}
                                                    onChange={(e) => setChatInput(e.target.value)}
                                                    onKeyDown={handleKeyPress}
                                                    placeholder="Ask a follow-up question..."
                                                    disabled={chatLoading}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/10 focus:border-brand-primary/50 transition-all"
                                                />
                                                <button 
                                                    onClick={handleAskQuestion}
                                                    disabled={!chatInput.trim() || chatLoading}
                                                    className="absolute right-2 top-2 p-2 bg-brand-primary text-white rounded-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg"
                                                >
                                                    <Send size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}

            {/* STEP 3: GENERATING */}
            {step === 'GENERATING' && (
                <div className="flex flex-col items-center justify-center h-[600px] animate-fade-in relative">
                    <div className="relative">
                        <div className="w-48 h-48 rounded-full border border-white/10 animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute top-4 left-4 right-4 bottom-4 rounded-full border border-white/5 animate-[spin_8s_linear_infinite_reverse]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-brand-primary animate-spin shadow-[0_0_30px_rgba(59,130,246,0.3)]"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles size={32} className="text-white animate-pulse" fill="currentColor" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mt-12 tracking-tight">Creating Question Set</h3>
                    <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></div>
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Preparing {mode === 'QUESTION_BANK' ? 'Exam Paper' : mode}</span>
                    </div>
                </div>
            )}

            {/* STEP 4: RESULTS */}
            {step === 'RESULT' && (
                <div className="animate-slide-up space-y-8 max-w-5xl mx-auto">
                    <GlassCard className="!rounded-[32px] p-8 flex items-center justify-between border-white/10 bg-gradient-to-r from-brand-primary/10 to-transparent relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                                    <Check size={16} />
                                </div>
                                <h3 className="text-2xl font-bold text-white">{currentSetId ? 'Generation Retrieved' : 'Generation Complete'}</h3>
                            </div>
                            <p className="text-white/60 text-sm font-medium pl-1">{generatedItems.length} items successfully loaded.</p>
                        </div>
                        <div className="relative z-10 flex gap-4">
                            <button 
                                onClick={handleExportPDF}
                                className="flex items-center gap-3 px-6 py-4 bg-black/40 border border-white/10 hover:bg-white/5 rounded-[20px] text-xs font-bold text-white uppercase tracking-widest transition-all"
                            >
                                <Download size={16} /> Export PDF
                            </button>
                            <button onClick={() => { setStep('CONFIG'); setGenerating(false); }} className="flex items-center gap-3 px-6 py-4 bg-white text-black hover:bg-gray-200 rounded-[20px] text-xs font-bold uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95">
                                <RefreshCw size={16} /> New Set
                            </button>
                        </div>
                    </GlassCard>

                    <div className="space-y-4">
                        {generatedItems.map((item, idx) => (
                            <GlassCard key={idx} className="p-8 !rounded-[32px] relative overflow-hidden group border-white/[0.05] hover:border-brand-primary/30 transition-all bg-black/20" noPadding>
                                <div className="flex items-start gap-6">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/40 font-mono shrink-0 mt-1">
                                        {String(idx + 1).padStart(2, '0')}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                                                item.type === 'SHORT_ANSWER' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' :
                                                item.type === 'LONG_ANSWER' ? 'bg-brand-violet/10 text-brand-violet border-brand-violet/20' :
                                                'bg-white/5 text-gray-400 border-white/10'
                                            }`}>
                                                {item.type.replace('_', ' ')}
                                            </span>
                                            {item.marks && (
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest border border-white/5 px-2 py-1 rounded-full">
                                                    {item.marks} Marks
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xl font-medium text-white mb-6 leading-relaxed">{item.question}</p>
                                        
                                        {item.options && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                                {item.options.map((opt, i) => (
                                                    <div key={i} className="px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-gray-300 flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500">{String.fromCharCode(65 + i)}</span>
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="bg-black/40 rounded-[24px] p-6 border border-white/5 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                            <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Check size={12} /> Model Answer
                                            </p>
                                            <p className="text-sm text-gray-300 leading-relaxed opacity-90">{item.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            )}
        </>
      )}

      {/* --- TAB: HISTORY --- */}
      {activeTab === 'HISTORY' && (
          <div className="animate-slide-up max-w-5xl mx-auto space-y-6">
              {history.length === 0 ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-50">
                      <History size={48} className="text-white mb-4" />
                      <h3 className="text-xl font-bold text-white">No History Archived</h3>
                      <p className="text-white/50 text-sm mt-2">Generated exams and quizzes will appear here.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {history.map((set) => (
                          <GlassCard 
                             key={set.id} 
                             className="group cursor-pointer hover:border-brand-primary/40 transition-all active:scale-[0.98]"
                             onClick={() => viewHistoryItem(set)}
                          >
                              <div className="flex justify-between items-start mb-6">
                                  <div className={`
                                      w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10
                                      ${set.type === 'QUESTION_BANK' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-white/5'}
                                  `}>
                                      {set.type === 'QUESTION_BANK' ? <FileQuestion size={24} /> : 
                                       set.type === 'MCQ' ? <LayoutTemplate size={24} /> :
                                       <Sparkles size={24} />}
                                  </div>
                                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                      {new Date(set.date).toLocaleDateString()}
                                  </div>
                              </div>
                              
                              <h3 className="text-xl font-bold text-white mb-1">{set.title}</h3>
                              <p className="text-sm text-gray-500 mb-6 truncate">Source: {set.sourceFileName}</p>
                              
                              <div className="flex items-center gap-4 text-xs font-medium text-gray-400 border-t border-white/5 pt-4">
                                  <div className="flex items-center gap-2">
                                      <Calendar size={14} />
                                      {set.items.length} Items
                                  </div>
                                  {set.totalMarks && (
                                      <div className="flex items-center gap-2">
                                          <Sparkles size={14} />
                                          {set.totalMarks} Marks
                                      </div>
                                  )}
                                  <div className="ml-auto text-brand-primary group-hover:translate-x-1 transition-transform">
                                      <ChevronRight size={16} />
                                  </div>
                              </div>
                          </GlassCard>
                      ))}
                  </div>
              )}
          </div>
      )}

    </div>
  );
};
