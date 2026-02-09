export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  UPLOADS = 'UPLOADS',
  ROADMAP = 'ROADMAP',
  QUIZ = 'QUIZ',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS',
}

export interface ExamDetails {
  id: string;
  name: string;
  date: string;
  targetScore: number;
  totalMarks: number;
}

export interface DocumentAnalysis {
  summary: string;
  keyConcepts: string[];
  definitions: { term: string; definition: string }[];
  formulas?: string[];
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  date: string;
  status: 'processing' | 'ready' | 'error';
  topics: string[];
  analysis?: DocumentAnalysis;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  userAnswer?: number;
}

export interface Quiz {
  id: string;
  title: string;
  sourceFileId: string;
  questions: QuizQuestion[];
  score?: number;
  completed: boolean;
  createdAt: string;
}

export interface StudySession {
  id: string;
  title: string;
  topic: string;
  date: string;
  durationMinutes: number;
  type: 'STUDY' | 'PRACTICE' | 'QUIZ' | 'REVISION' | 'MOCK_TEST';
  status: 'PENDING' | 'COMPLETED' | 'MISSED';
  calendarEventId?: string;
  description?: string;
}

export interface AnalyticsData {
  topic: string;
  mastery: number;
  hoursStudied: number;
}

export type GeneratorMode = 'MCQ' | 'FLASHCARD' | 'FILL_BLANK' | 'QUESTION_BANK';

export interface GeneratedItem {
  id: string;
  type: string;
  question: string;
  options?: string[];
  answer: string;
  marks?: number;
}

export interface GeneratedSet {
  id: string;
  type: GeneratorMode;
  title: string;
  date: string;
  items: GeneratedItem[];
  sourceFileName: string;
  totalMarks?: number;
}

export interface QuestionBankConfig {
  mode: GeneratorMode;
  shortQuestions?: number;
  longQuestions?: number;
  totalMarks?: number;
}
