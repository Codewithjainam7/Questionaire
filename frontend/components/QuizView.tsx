import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Quiz, UploadedFile } from '../types';
import { ArrowRight, Brain, RefreshCcw, Check, Sparkles, Clock, Target, Play, AlertTriangle, PenTool, FileQuestion, ChevronLeft } from 'lucide-react';
import { generateQuestionBank } from '../services/geminiService';

interface QuizViewProps {
  quizzes: Quiz[];
  onCreateQuiz: () => void;
  loading: boolean;
  uploads: UploadedFile[];
}

export const QuizView: React.FC<QuizViewProps> = ({ quizzes, onCreateQuiz, loading, uploads }) => {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [generatingExam, setGeneratingExam] = useState(false);
  
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [examTerminated, setExamTerminated] = useState(false);
  
  useEffect(() => {
    if (!activeQuiz) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden && !completed && !examTerminated) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        
        if (newCount >= 4) {
          setExamTerminated(true);
          setCompleted(true);
        } else {
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 3000);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeQuiz, completed, examTerminated, tabSwitchCount]);

  const handleGenerateSubjectiveExam = async () => {
    if (uploads.length === 0) {
      alert('Please upload study materials first!');
      return;
    }

    setGeneratingExam(true);
    const latestUpload = uploads[0];

    if (latestUpload.status === 'error') {
      alert('Cannot generate exam from invalid study material.');
      setGeneratingExam(false);
      return;
    }

    const examQuestions = await generateQuestionBank(latestUpload.content, 'QUESTION_BANK', 5, 4);
    
    if (examQuestions.length > 0) {
      const newQuiz: Quiz = {
        id: crypto.randomUUID(),
        title: `Subjective Exam: ${latestUpload.name}`,
        sourceFileId: latestUpload.id,
        questions: examQuestions.map((q, idx) => ({
          id: `q-${idx}`,
          question: q.question,
          options: q.options || [],
          correctAnswer: -1,
          explanation: q.answer,
          userAnswer: undefined
        })),
        completed: false,
        createdAt: new Date().toISOString()
      };

      setActiveQuiz(newQuiz);
      setCurrentQuestionIdx(0);
      setCompleted(false);
      setSelectedOption(null);
      setShowExplanation(false);
      setTextAnswer('');
      setTabSwitchCount(0);
      setExamTerminated(false);
    } else {
      alert('Failed to generate exam. Please try again.');
    }

    setGeneratingExam(false);
  };

  if (!activeQuiz) {
      return (
          <div className="space-y-6 md:space-y-10 animate-fade-in max-w-[1600px] mx-auto text-gray-200 px-2">
              <header className="flex flex-col gap-4 mb-6 md:mb-8 animate-slide-up">
                <div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-2 md:mb-3">Active Recall</h2>
                    <p className="text-gray-500 text-xs md:text-sm uppercase tracking-widest font-medium">Exam Preparation</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={handleGenerateSubjectiveExam}
                        disabled={generatingExam}
                        className="flex items-center justify-center gap-2 md:gap-3 bg-gradient-to-r from-brand-violet to-brand-indigo text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:grayscale"
                    >
                        {generatingExam ? <RefreshCcw className="animate-spin" size={16} /> : <FileQuestion size={16} />}
                        {generatingExam ? 'CREATING...' : 'SUBJECTIVE EXAM'}
                    </button>
                    <button 
                        onClick={onCreateQuiz}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 md:gap-3 bg-white text-black px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:grayscale"
                    >
                        {loading ? <RefreshCcw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        {loading ? 'CREATING...' : 'MCQ QUIZ'}
                    </button>
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 animate-slide-up">
                  {quizzes.map(quiz => (
                      <GlassCard 
                        key={quiz.id} 
                        className="group cursor-pointer relative overflow-hidden min-h-[200px] md:min-h-[240px] flex flex-col justify-between hover:border-brand-primary/50 transition-all duration-500"
                        onClick={() => {
                            setActiveQuiz(quiz);
                            setCurrentQuestionIdx(0);
                            setCompleted(false);
                            setSelectedOption(null);
                            setShowExplanation(false);
                            setTextAnswer('');
                            setTabSwitchCount(0);
                            setExamTerminated(false);
                        }}
                      >
                           <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                           
                           <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4 md:mb-6">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/[0.05] rounded-xl flex items-center justify-center group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors border border-white/[0.05]">
                                        <Brain size={20} className="md:w-6 md:h-6" />
                                    </div>
                                    {quiz.completed && <div className="text-green-500 bg-green-500/10 p-1.5 md:p-2 rounded-full"><Check size={14} /></div>}
                                </div>
                                <h3 className="text-base md:text-xl font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">{quiz.title}</h3>
                                <p className="text-[10px] md:text-xs text-gray-500 font-mono">{new Date(quiz.createdAt).toLocaleDateString()}</p>
                           </div>

                           <div className="relative z-10 flex items-center justify-between pt-4 md:pt-6 border-t border-white/[0.05]">
                               <div className="flex gap-3 md:gap-4 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                   <span className="flex items-center gap-1 md:gap-1.5"><Target size={12} /> {quiz.questions.length} Qs</span>
                                   <span className="flex items-center gap-1 md:gap-1.5"><Clock size={12} /> 5m</span>
                               </div>
                               <span className="text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0 duration-300">
                                   <Play size={18} fill="currentColor" />
                               </span>
                           </div>
                      </GlassCard>
                  ))}
              </div>
          </div>
      )
  }

  const question = activeQuiz.questions[currentQuestionIdx];
  const isLast = currentQuestionIdx === activeQuiz.questions.length - 1;
  const isSubjectiveQuestion = !question.options || question.options.length === 0;

  const handleNext = () => {
      if (isLast) {
          setCompleted(true);
      } else {
          setCurrentQuestionIdx(prev => prev + 1);
          setSelectedOption(null);
          setShowExplanation(false);
          setTextAnswer('');
      }
  };

  if (completed) {
      return (
          <div className="max-w-2xl mx-auto pt-10 md:pt-20 px-4 animate-fade-in text-center text-gray-200">
              <GlassCard className={`p-10 md:p-20 flex flex-col items-center ${examTerminated ? 'border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]'}`}>
                    <div className={`w-20 h-20 md:w-28 md:h-28 ${examTerminated ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'} rounded-full flex items-center justify-center mb-6 md:mb-10 border shadow-[0_0_30px_rgba(34,197,94,0.2)]`}>
                        {examTerminated ? <AlertTriangle size={32} className="md:w-12 md:h-12" /> : <TrophyIcon />}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 md:mb-6 tracking-tight">
                        {examTerminated ? 'Exam Terminated' : 'Quiz Completed'}
                    </h2>
                    <p className="text-base md:text-xl text-gray-400 mb-8 md:mb-12 font-light">
                        {examTerminated 
                            ? 'Multiple tab switches detected. Exam terminated for academic integrity.'
                            : 'Your results have been saved to your progress report.'}
                    </p>
                    <button 
                        onClick={() => setActiveQuiz(null)}
                        className="bg-white/[0.05] hover:bg-white/[0.1] text-white px-8 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm border border-white/[0.1] transition-all"
                    >
                        Return to Dashboard
                    </button>
              </GlassCard>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pt-6 md:pt-10 px-4 animate-fade-in text-gray-200 pb-20">
        {showWarning && (
            <div className="fixed top-20 md:top-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-[90%] max-w-md">
                <div className="bg-red-500/90 backdrop-blur-xl border border-red-400 px-4 md:px-8 py-4 md:py-6 rounded-xl md:rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.4)] flex items-center gap-3 md:gap-4">
                    <AlertTriangle size={24} className="text-white shrink-0" />
                    <div>
                        <h3 className="text-white font-bold text-sm md:text-lg mb-1">Tab Switch Detected!</h3>
                        <p className="text-white/90 text-xs md:text-sm">Warning {tabSwitchCount}/3</p>
                    </div>
                </div>
            </div>
        )}

        <div className="mb-6 md:mb-10 flex items-center justify-between gap-4">
            <button onClick={() => setActiveQuiz(null)} className="flex items-center gap-2 text-gray-500 hover:text-white text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors px-3 md:px-4 py-2 hover:bg-white/[0.05] rounded-lg">
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Exit</span>
            </button>
            <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2 bg-red-500/10 px-2 md:px-4 py-1.5 md:py-2 rounded-full border border-red-500/20">
                    <AlertTriangle size={12} className="text-red-400" />
                    <span className="text-[10px] md:text-xs font-mono text-red-400">
                        {tabSwitchCount}/3
                    </span>
                </div>
                
                <div className="bg-white/[0.03] px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/[0.05] flex items-center gap-2 md:gap-4">
                    <div className="h-1 md:h-1.5 w-20 md:w-40 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-primary shadow-[0_0_10px_rgba(139,92,246,0.8)] transition-all duration-500" style={{width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`}}></div>
                    </div>
                    <span className="text-[10px] md:text-xs font-mono text-brand-primary">
                        {currentQuestionIdx + 1}/{activeQuiz.questions.length}
                    </span>
                </div>
            </div>
        </div>

        <GlassCard className="mb-6 md:mb-10 flex flex-col relative border-white/[0.08]" hoverEffect={false}>
             <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
             
             <div className="relative z-10 p-4 md:p-8">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                    <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-white leading-tight flex-1">
                        {question.question}
                    </h3>
                    {isSubjectiveQuestion && (
                        <div className="px-3 py-1.5 md:px-4 md:py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-lg md:rounded-xl shrink-0">
                            <span className="text-brand-primary font-bold text-xs md:text-sm flex items-center gap-2">
                                <PenTool size={12} className="md:w-3.5 md:h-3.5" />
                                Subjective
                            </span>
                        </div>
                    )}
                </div>

                {isSubjectiveQuestion ? (
                    <div className="mt-4 md:mt-8">
                        <textarea
                            value={textAnswer}
                            onChange={(e) => setTextAnswer(e.target.value)}
                            placeholder="Write your answer here... Explain in detail."
                            disabled={showExplanation}
                            className="w-full min-h-[200px] md:min-h-[300px] bg-white/[0.02] border border-white/[0.05] rounded-xl md:rounded-2xl p-4 md:p-6 text-sm md:text-base text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary/50 focus:bg-white/[0.03] transition-all resize-none"
                        />
                        <div className="mt-2 text-[10px] md:text-xs text-gray-500 flex items-center gap-2">
                            <PenTool size={10} className="md:w-3 md:h-3" />
                            <span>Write a detailed answer for evaluation</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-3 md:gap-5 mt-6 md:mt-12">
                        {question.options?.map((opt, idx) => {
                            let btnClass = "w-full text-left p-4 md:p-6 rounded-xl md:rounded-2xl border transition-all duration-300 font-medium text-sm md:text-lg relative group overflow-hidden ";
                            
                            if (showExplanation) {
                                if (idx === question.correctAnswer) btnClass += "bg-green-500/10 border-green-500/50 text-green-400";
                                else if (selectedOption === idx) btnClass += "bg-red-500/10 border-red-500/50 text-red-400 opacity-60";
                                else btnClass += "border-transparent bg-white/[0.02] opacity-30 text-gray-500";
                            } else {
                                if (selectedOption === idx) btnClass += "bg-brand-primary/20 border-brand-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]";
                                else btnClass += "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.2] text-gray-300";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !showExplanation && setSelectedOption(idx)}
                                    disabled={showExplanation}
                                    className={btnClass}
                                >
                                    <div className="flex items-center gap-3 md:gap-6 relative z-10">
                                        <div className={`
                                            w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0 transition-colors border
                                            ${showExplanation && idx === question.correctAnswer ? 'bg-green-500 border-green-500 text-black' : 
                                              selectedOption === idx && !showExplanation ? 'bg-brand-primary border-brand-primary text-white' :
                                              'border-white/[0.1] text-gray-500 bg-transparent group-hover:border-white/[0.3]'}
                                        `}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <span className="break-words">{opt}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {showExplanation && (
                     <div className="mt-6 md:mt-8 p-4 md:p-6 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/[0.1] text-gray-300 text-sm md:text-base">
                         <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 text-brand-primary">
                            <Sparkles size={16} className="md:w-5 md:h-5" />
                            <span className="font-bold text-[10px] md:text-xs uppercase tracking-widest">Model Answer</span>
                         </div>
                         <p className="leading-relaxed font-light">{question.explanation}</p>
                     </div>
                )}

                <div className="flex justify-end mt-6 md:mt-8">
                    {!showExplanation ? (
                        <button 
                            onClick={() => setShowExplanation(true)}
                            disabled={isSubjectiveQuestion ? !textAnswer.trim() : selectedOption === null}
                            className="bg-white text-black px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                        >
                            CONFIRM
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext}
                            className="bg-brand-primary hover:bg-brand-primary/90 text-white px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all flex items-center gap-2 md:gap-3 hover:scale-105"
                        >
                            {isLast ? 'FINISH' : 'NEXT'} <ArrowRight size={18} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>
        </GlassCard>
    </div>
  );
};

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
