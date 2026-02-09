import React, { useState, useEffect, useRef } from 'react';
import { Layers, Shield, ScanFace, Chrome } from 'lucide-react';

interface LoginViewProps {
  onLogin: (username: string, userData?: any) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'GUEST' | 'GOOGLE'>('GOOGLE');
  const [codename, setCodename] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Wait for Google script to load
  useEffect(() => {
    const checkGoogle = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGoogleLoaded(true);
        clearInterval(checkGoogle);
      }
    }, 100);

    return () => clearInterval(checkGoogle);
  }, []);

  useEffect(() => {
    if (mode === 'GOOGLE' && googleLoaded && googleButtonRef.current) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error('Google Client ID not found');
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
        });

        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: 300,
            text: 'signin_with',
            logo_alignment: 'left',
          }
        );
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    }
  }, [mode, googleLoaded]);

  const handleGoogleResponse = (response: any) => {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const userData = JSON.parse(jsonPayload);
      
      localStorage.setItem('eduhub_user', JSON.stringify({
        name: userData.name,
        email: userData.email,
        picture: userData.picture,
        sub: userData.sub
      }));
      
      onLogin(userData.name || userData.email.split('@')[0], userData);
    } catch (error) {
      console.error('Error parsing Google response:', error);
      alert('Authentication failed. Please try again.');
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (codename.trim()) {
      localStorage.setItem('eduhub_guest', codename);
      onLogin(codename);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 relative z-50 overflow-hidden">
       
       <div className="w-full max-w-[380px] relative">
            <div className="absolute inset-0 bg-brand-primary/20 blur-[60px] rounded-full scale-110 opacity-50 pointer-events-none"></div>

            <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[44px] overflow-hidden shadow-2xl ring-1 ring-white/5 p-8 flex flex-col gap-6 animate-slide-up">
                
                <div className="flex flex-col items-center gap-4 pt-2">
                    <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center shadow-lg relative group overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                         <Layers size={32} className="text-white relative z-10 drop-shadow-md" />
                         <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>
                    </div>
                    
                    <div className="text-center">
                         <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight">
                            EduHub<span className="text-brand-primary font-normal">Pro</span>
                         </h1>
                         <p className="text-[10px] text-white/40 font-medium uppercase tracking-[0.3em] mt-1">Student Portal</p>
                    </div>
                </div>

                <div className="bg-black/30 p-1 rounded-full flex relative h-10">
                     <div 
                        className={`absolute top-1 bottom-1 rounded-full bg-white/10 border border-white/5 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]`}
                        style={{
                            left: mode === 'GOOGLE' ? '0.25rem' : '50%',
                            width: 'calc(50% - 0.25rem)'
                        }}
                     ></div>
                     <button 
                        onClick={() => setMode('GOOGLE')}
                        className={`flex-1 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors flex items-center justify-center gap-1.5 ${mode === 'GOOGLE' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                        <Chrome size={12} />
                        Google
                     </button>
                     <button 
                        onClick={() => setMode('GUEST')}
                        className={`flex-1 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors ${mode === 'GUEST' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                        Guest
                     </button>
                </div>

                <div className="min-h-[220px] flex flex-col justify-center">
                    {mode === 'GOOGLE' ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="text-center mb-4">
                                <h3 className="text-lg font-bold text-white mb-2">Sign in with Google</h3>
                                <p className="text-xs text-white/50">
                                    Secure authentication via Google OAuth
                                </p>
                            </div>

                            {googleLoaded ? (
                              <div ref={googleButtonRef} className="flex justify-center"></div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="w-8 h-8 border-2 border-white/20 border-t-brand-primary rounded-full animate-spin"></div>
                              </div>
                            )}

                            <p className="text-center text-[10px] text-gray-500 leading-relaxed px-4 mt-4">
                                Your data is encrypted and stored securely. We only access your basic profile information.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-4">
                                <div className="relative group">
                                     <div className="absolute inset-y-0 left-4 flex items-center text-gray-500 group-focus-within:text-brand-primary transition-colors pointer-events-none">
                                        <ScanFace size={20} />
                                     </div>
                                     <input 
                                        type="text" 
                                        value={codename}
                                        onChange={(e) => setCodename(e.target.value)}
                                        placeholder="ENTER NAME"
                                        className="w-full bg-white/5 border border-white/10 focus:border-brand-primary/50 rounded-2xl py-4 pl-12 pr-4 text-center text-white text-sm placeholder-gray-600 font-mono tracking-widest uppercase focus:outline-none focus:bg-brand-primary/5 transition-all shadow-inner"
                                        autoFocus
                                     />
                                </div>
                                <p className="text-center text-[10px] text-gray-500 leading-relaxed px-4">
                                    Guest Mode: Data is stored locally and persists between sessions.
                                </p>
                            </div>
                            
                            <button 
                                onClick={handleGuestLogin}
                                disabled={!codename.trim()}
                                className="w-full bg-gradient-to-r from-brand-indigo to-brand-violet hover:brightness-110 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-[0.98]"
                            >
                                <span>Start Session</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/20 font-medium uppercase tracking-widest pt-1 px-1">
                    <span className="flex items-center gap-1.5"><Shield size={10} /> Encrypted Session</span>
                    <span>v2.5.0</span>
                </div>
            </div>
       </div>
    </div>
  );
};
