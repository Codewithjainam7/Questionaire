import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import {
  LayoutGrid,
  FolderOpen,
  CalendarDays,
  Brain,
  PieChart,
  Activity,
  Layers,
  Menu,
  X,
  User,
  LogOut,
  MessageCircle
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  user?: string;
  onLogout?: () => void;
}

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user = 'GUEST', onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);

  useEffect(() => {
    // Load Google user data from localStorage
    const savedUser = localStorage.getItem('eduhub_user');
    if (savedUser) {
      try {
        setGoogleUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user data');
      }
    }
  }, []);

  const handleLogout = () => {
    // Clear Google user data
    localStorage.removeItem('eduhub_user');
    setGoogleUser(null);
    if (onLogout) onLogout();
  };

  const menuItems = [
    { id: ViewState.DASHBOARD, label: 'HOME', icon: LayoutGrid },
    { id: ViewState.QA, label: 'Q&A', icon: MessageCircle },
    { id: ViewState.UPLOADS, label: 'NOTES', icon: FolderOpen },
    { id: ViewState.ROADMAP, label: 'PLAN', icon: CalendarDays },
    { id: ViewState.QUIZ, label: 'EXAMS', icon: Brain },
    { id: ViewState.ANALYTICS, label: 'METRICS', icon: PieChart },
  ];

  return (
    <>
      {/* DESKTOP: Centered Floating HUD */}
      <div className="hidden md:flex fixed top-6 left-0 right-0 z-50 justify-center pointer-events-none px-4 animate-slide-up">
        <div className="bg-black/40 backdrop-blur-2xl border border-white/[0.08] rounded-full p-1.5 flex items-center gap-1 pointer-events-auto shadow-[0_10px_40px_rgba(0,0,0,0.5)]">

          {/* Brand Mark */}
          <div className="pl-3 pr-4 flex items-center gap-2 border-r border-white/[0.1] mr-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-violet flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Layers size={16} className="text-white" />
            </div>
            <span className="text-white font-bold tracking-tight text-sm">EduHub<span className="text-brand-indigo">Pro</span></span>
          </div>

          {/* Navigation Pills */}
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`
                  relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 group
                  ${isActive
                    ? 'bg-white/[0.1] text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/[0.05]'
                    : 'text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent'}
                `}
              >
                <Icon
                  size={16}
                  className={`transition-colors ${isActive ? 'text-brand-indigo' : 'group-hover:text-gray-300'}`}
                />
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase block">
                  {item.label}
                </span>

                {/* Active Indicator Dot */}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-indigo rounded-full shadow-[0_0_5px_rgba(99,102,241,1)]"></span>
                )}
              </button>
            );
          })}

          {/* User Profile Section */}
          <div className="pl-3 pr-2 ml-1 border-l border-white/[0.1] flex items-center gap-3">
            <div className="flex flex-col items-end hidden lg:flex">
              <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">Student</span>
              <span className="text-[10px] text-white font-bold max-w-[80px] truncate">
                {googleUser?.name || user}
              </span>
            </div>

            <div className="relative group">
              <button className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:border-brand-primary/50 transition-all shadow-lg overflow-hidden">
                {googleUser?.picture ? (
                  <img
                    src={googleUser.picture}
                    alt={googleUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={16} />
                )}
              </button>

              {/* Dropdown Logout */}
              {onLogout && (
                <div className="absolute top-full right-0 mt-2 w-48 py-1 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                  {googleUser && (
                    <div className="px-4 py-3 border-b border-white/10 mb-1">
                      <div className="text-xs text-white font-bold truncate">{googleUser.name}</div>
                      <div className="text-[10px] text-white/40 truncate mt-0.5">{googleUser.email}</div>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={12} />
                    SIGN OUT
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MOBILE: Top Bar + Hamburger */}
      <div className="md:hidden fixed top-4 left-4 right-4 z-50 flex justify-between items-center pointer-events-none">
        {/* Mobile Brand Pill */}
        <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-2.5 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-violet flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.3)]">
            <Layers size={16} className="text-white" />
          </div>
          <span className="text-white font-bold tracking-tight text-sm pr-2">EduHub<span className="text-brand-indigo">Pro</span></span>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-3 text-white shadow-lg active:scale-95 transition-transform hover:bg-white/[0.1]"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* MOBILE FULLSCREEN MENU OVERLAY */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl animate-fade-in overflow-y-auto">
          <div className="min-h-full flex flex-col p-6">
            {/* Background Effects */}
            <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[50%] bg-brand-indigo/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[60%] h-[40%] bg-brand-violet/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="flex justify-between items-center mb-8 relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-violet flex items-center justify-center">
                  <Layers size={16} className="text-white" />
                </div>
                <span className="text-white font-bold tracking-tight text-xl">EduHub<span className="text-brand-indigo">Pro</span></span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-3 bg-white/[0.05] hover:bg-white/[0.1] rounded-full text-white border border-white/[0.1] transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white overflow-hidden border-2 border-white/10">
                {googleUser?.picture ? (
                  <img
                    src={googleUser.picture}
                    alt={googleUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-mono uppercase">Current Student</div>
                <div className="text-lg font-bold text-white truncate">
                  {googleUser?.name || user}
                </div>
                {googleUser?.email && (
                  <div className="text-xs text-gray-400 truncate">{googleUser.email}</div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-4 my-auto relative z-10 shrink-0 py-4">
              {menuItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setIsOpen(false);
                  }}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`
                                p-6 rounded-3xl border flex items-center gap-6 transition-all animate-slide-up opacity-0 fill-mode-forwards shrink-0
                                ${currentView === item.id
                      ? 'bg-brand-indigo/20 border-brand-indigo text-white shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                      : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-white'}
                            `}
                >
                  <item.icon size={28} className={currentView === item.id ? 'text-brand-indigo' : ''} />
                  <span className="text-xl font-bold tracking-widest uppercase font-mono">{item.label}</span>
                  {currentView === item.id && <div className="ml-auto w-2 h-2 rounded-full bg-brand-indigo shadow-[0_0_10px_brand-indigo]"></div>}
                </button>
              ))}
            </nav>

            {/* Logout Button */}
            <div className="mt-8 relative z-10 shrink-0">
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={18} /> SIGN OUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
