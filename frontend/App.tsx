import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { UploadView } from './components/UploadView';
import { RoadmapView } from './components/RoadmapView';
import { QuizView } from './components/QuizView';
import { AnalyticsView } from './components/AnalyticsView';

import { LoginView } from './components/LoginView';
import { BootSequence } from './components/BootSequence';
import { ViewState, UploadedFile, StudySession, Quiz, AnalyticsData, ExamDetails, GeneratedSet } from './types';
import { generateQuizFromContent, generateSmartRoadmap } from './services/geminiService';

type AppPhase = 'LOGIN' | 'BOOTING' | 'APP';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('LOGIN');
  const [user, setUser] = useState<string>('');
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [loading, setLoading] = useState(false);

  const [examInfo, setExamInfo] = useState<ExamDetails>({
    id: 'exam-1',
    name: 'Calculus Final',
    date: '2025-01-15',
    targetScore: 90,
    totalMarks: 100
  });

  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedSet[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([
    { topic: 'Limits', mastery: 92, hoursStudied: 12 },
    { topic: 'Differentiation', mastery: 78, hoursStudied: 15 },
    { topic: 'Integration', mastery: 45, hoursStudied: 4 },
    { topic: 'Applications', mastery: 60, hoursStudied: 6 },
  ]);

  // Load persisted data on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('eduhub_user') || localStorage.getItem('eduhub_guest');
    if (savedUser) {
      try {
        const userData = localStorage.getItem('eduhub_user') ? JSON.parse(savedUser) : null;
        const username = userData ? (userData.name || userData.email) : savedUser;

        setUser(username);
        setPhase('BOOTING');

        // Load all persisted data
        const savedUploads = localStorage.getItem('eduhub_uploads');
        const savedHistory = localStorage.getItem('eduhub_history');
        const savedSessions = localStorage.getItem('eduhub_sessions');
        const savedQuizzes = localStorage.getItem('eduhub_quizzes');
        const savedAnalytics = localStorage.getItem('eduhub_analytics');
        const savedExam = localStorage.getItem('eduhub_exam');

        if (savedUploads) setUploads(JSON.parse(savedUploads));
        if (savedHistory) setGeneratedHistory(JSON.parse(savedHistory));
        if (savedSessions) setSessions(JSON.parse(savedSessions));
        if (savedQuizzes) setQuizzes(JSON.parse(savedQuizzes));
        if (savedAnalytics) setAnalytics(JSON.parse(savedAnalytics));
        if (savedExam) setExamInfo(JSON.parse(savedExam));
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  // Persist data whenever it changes
  useEffect(() => {
    if (phase === 'APP') {
      localStorage.setItem('eduhub_uploads', JSON.stringify(uploads));
      localStorage.setItem('eduhub_history', JSON.stringify(generatedHistory));
      localStorage.setItem('eduhub_sessions', JSON.stringify(sessions));
      localStorage.setItem('eduhub_quizzes', JSON.stringify(quizzes));
      localStorage.setItem('eduhub_analytics', JSON.stringify(analytics));
      localStorage.setItem('eduhub_exam', JSON.stringify(examInfo));
    }
  }, [uploads, generatedHistory, sessions, quizzes, analytics, examInfo, phase]);

  const handleLogin = (username: string, userData?: any) => {
    setUser(username);
    if (userData) {
      localStorage.setItem('eduhub_user', JSON.stringify(userData));
    } else {
      localStorage.setItem('eduhub_guest', username);
    }
    setPhase('BOOTING');
  };

  const handleInstantFlashcards = async () => {
    if (uploads.length === 0) {
      alert('Please upload study materials first!');
      return;
    }

    setLoading(true);
    const latestUpload = uploads[0];

    if (latestUpload.status === 'error') {
      alert('Cannot generate flashcards from invalid study material.');
      setLoading(false);
      return;
    }

    const { generateQuestionBank } = await import('./services/geminiService');
    const flashcards = await generateQuestionBank(latestUpload.content, 'FLASHCARD');

    if (flashcards.length > 0) {
      const newSet: GeneratedSet = {
        id: crypto.randomUUID(),
        type: 'FLASHCARD',
        title: 'Instant Flashcard Set',
        date: new Date().toISOString(),
        items: flashcards,
        sourceFileName: latestUpload.name
      };

      handleAddToHistory(newSet);
      setCurrentView(ViewState.UPLOADS);
      alert(`✨ Created ${flashcards.length} flashcards! Check the History tab in Question Forge.`);
    } else {
      alert('Failed to generate flashcards. Please try again.');
    }

    setLoading(false);
  };

  const handleBootComplete = () => {
    setPhase('APP');
  };

  const handleLogout = () => {
    localStorage.removeItem('eduhub_user');
    localStorage.removeItem('eduhub_guest');
    localStorage.removeItem('eduhub_uploads');
    localStorage.removeItem('eduhub_history');
    localStorage.removeItem('eduhub_sessions');
    localStorage.removeItem('eduhub_quizzes');
    localStorage.removeItem('eduhub_analytics');
    localStorage.removeItem('eduhub_exam');

    setPhase('LOGIN');
    setUser('');
    setCurrentView(ViewState.DASHBOARD);
    setUploads([]);
    setGeneratedHistory([]);
    setSessions([]);
    setQuizzes([]);
  };

  const handleUpload = (file: UploadedFile) => {
    setUploads([file, ...uploads]);
  };

  const handleAddToHistory = (set: GeneratedSet) => {
    setGeneratedHistory([set, ...generatedHistory]);
  };

  const handleGenerateQuiz = async () => {
    if (uploads.length === 0) {
      alert('Please upload some study material first!');
      return;
    }
    setLoading(true);

    const latestUpload = uploads[0];

    if (latestUpload.status === 'error') {
      alert('Cannot generate quiz from invalid study material.');
      setLoading(false);
      return;
    }

    const quiz = await generateQuizFromContent(latestUpload.content, latestUpload.name);
    if (quiz) {
      setQuizzes([quiz, ...quizzes]);
      setCurrentView(ViewState.QUIZ);
    } else {
      alert('Failed to generate quiz. Please try again.');
    }
    setLoading(false);
  };

  const handleGenerateRoadmap = async () => {
    if (uploads.length === 0) {
      alert('Please upload study materials first!');
      return;
    }

    setLoading(true);
    const topics = uploads.flatMap(u => u.topics).filter(Boolean);
    const weakAreas = analytics.filter(a => a.mastery < 60).map(a => a.topic);

    if (topics.length === 0) {
      alert('No valid topics found in uploaded materials.');
      setLoading(false);
      return;
    }

    const newSessions = await generateSmartRoadmap(
      topics,
      examInfo.name,
      examInfo.date,
      new Date().toISOString().split('T')[0],
      weakAreas
    );

    if (newSessions.length > 0) {
      setSessions(newSessions);
    }
    setLoading(false);
  };

  const daysUntilExam = Math.ceil((new Date(examInfo.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard
          sessions={sessions}
          analytics={analytics}
          recentUploads={uploads}
          examName={examInfo.name}
          daysUntilExam={daysUntilExam}
          username={user}
          onInstantFlashcards={handleInstantFlashcards}
          loading={loading}
          onUpload={handleUpload}
        />;
      case ViewState.UPLOADS:
        return <UploadView files={uploads} onUpload={handleUpload} history={generatedHistory} onAddToHistory={handleAddToHistory} />;
      case ViewState.ROADMAP:
        return <RoadmapView sessions={sessions} generatePlan={handleGenerateRoadmap} loading={loading} />;
      case ViewState.QUIZ:
        return <QuizView quizzes={quizzes} onCreateQuiz={handleGenerateQuiz} loading={loading} uploads={uploads} />;
      case ViewState.ANALYTICS:
        return <AnalyticsView data={analytics} />;
      default:
        return <Dashboard
          sessions={sessions}
          analytics={analytics}
          recentUploads={uploads}
          examName={examInfo.name}
          daysUntilExam={daysUntilExam}
          username={user}
          onInstantFlashcards={handleInstantFlashcards}
          loading={loading}
          onUpload={handleUpload}
        />;
    }
  };

  const [stars, setStars] = useState<{ id: number, top: string, left: string, delay: string, duration: string }[]>([]);
  useEffect(() => {
    const newStars = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
      size: `${1 + Math.random() * 2}px`
    }));
    setStars(newStars as any);
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-void selection:bg-brand-indigo/30 cursor-custom">

      <div className="bg-grid-container">
        <div className="bg-grid"></div>
      </div>

      {stars.map(star => (
        <div
          key={star.id}
          className="star animate-twinkle"
          style={{
            top: star.top,
            left: star.left,
            width: (star as any).size,
            height: (star as any).size,
            animationDelay: star.delay,
            animationDuration: star.duration
          }}
        ></div>
      ))}

      <div className="aurora-blob w-[500px] h-[500px] bg-brand-violet/20 top-[-100px] left-[10%] animate-pulse-slow"></div>
      <div className="aurora-blob w-[400px] h-[400px] bg-brand-indigo/20 bottom-[-100px] right-[10%] animate-float" style={{ animationDelay: '-2s' }}></div>

      {phase === 'LOGIN' && (
        <LoginView onLogin={handleLogin} />
      )}

      {phase === 'BOOTING' && (
        <BootSequence onComplete={handleBootComplete} />
      )}

      {phase === 'APP' && (
        <>
          <Sidebar currentView={currentView} setView={setCurrentView} user={user} onLogout={handleLogout} />
          <main className="pt-24 px-4 md:px-8 pb-8 transition-all duration-300 relative z-10">
            {renderContent()}
          </main>
        </>
      )}

    </div>
  );
};

export default App;
