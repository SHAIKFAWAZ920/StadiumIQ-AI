import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { Shield, Sparkles, User, Lock, Chrome, Users, HelpCircle } from 'lucide-react';
import { auth } from '../services/firebase';
import { authApi } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Demo Persona Cards configuration
  const DEMO_PERSONAS = [
    { name: "Fan Terminal", role: "fan", desc: "SOS alert, concession wait times, eco carbon counts." },
    { name: "Volunteer Hub", role: "volunteer", desc: "Shift tasks, incident logger, FAQ vector search." },
    { name: "Security Console", role: "security", desc: "Heatmaps, real-time CCTV filter grids, alerts translation." },
    { name: "Emergency Dispatch", role: "medical", desc: "Ambulance trackers, casualty counts, triage tags." },
    { name: "Transit Control", role: "transport", desc: "Metro schedules, parking space capacity charts." },
    { name: "Operations Center", role: "manager", desc: "KPI telemetry graphs, Gemini operational summaries." }
  ];

  // 1. Google Popup Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const token = await userCred.user.getIdToken();
      
      // Save Firebase JWT in local storage
      localStorage.setItem('stadium_iq_token', token);
      localStorage.setItem('stadium_iq_role', 'fan'); // Default Google login to fan
      localStorage.setItem('stadium_iq_username', userCred.user.displayName || "Google User");
      
      navigate('/fan');
    } catch (err: any) {
      console.warn("Firebase Google login failed, falling back to local database...", err);
      
      try {
        const mockUsername = "google_demo";
        const mockEmail = "google_demo@stadiumiq.com";
        const mockPassword = "google_password_mock";
        
        try {
          await authApi.signup({
            username: mockUsername,
            email: mockEmail,
            role_name: "fan",
            password: mockPassword
          });
        } catch (signupErr) {
          // User already created, proceed to login
        }
        
        const res = await authApi.login(mockUsername, mockPassword);
        localStorage.setItem('stadium_iq_token', res.access_token);
        localStorage.setItem('stadium_iq_role', res.role);
        localStorage.setItem('stadium_iq_username', "Google User (Mock)");
        
        navigate('/fan');
      } catch (dbErr) {
        setError(err.message || "Failed to log in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Anonymous Guest Login
  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userCred = await signInAnonymously(auth);
      const token = await userCred.user.getIdToken();
      
      localStorage.setItem('stadium_iq_token', token);
      localStorage.setItem('stadium_iq_role', 'fan');
      localStorage.setItem('stadium_iq_username', "Guest Fan");
      
      navigate('/fan');
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in as Anonymous Guest. Falling back to local offline guest...");
      
      // Local fallback
      localStorage.setItem('stadium_iq_token', "mock_guest_token");
      localStorage.setItem('stadium_iq_role', 'fan');
      localStorage.setItem('stadium_iq_username', "Guest Fan (Offline)");
      navigate('/fan');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Email & Password Signin/Register
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      if (isRegister) {
        // Register in Firebase
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const token = await userCred.user.getIdToken();
        localStorage.setItem('stadium_iq_token', token);
        
        // Inferred role (default to fan)
        let role = "fan";
        const emailLower = email.toLowerCase();
        for (const r of ["volunteer", "security", "medical", "manager", "transport"]) {
          if (emailLower.includes(r)) { role = r; break; }
        }
        localStorage.setItem('stadium_iq_role', role);
        localStorage.setItem('stadium_iq_username', email.split('@')[0]);
      } else {
        // Login in Firebase
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCred.user.getIdToken();
        localStorage.setItem('stadium_iq_token', token);
        
        let role = "fan";
        const emailLower = email.toLowerCase();
        for (const r of ["volunteer", "security", "medical", "manager", "transport"]) {
          if (emailLower.includes(r)) { role = r; break; }
        }
        localStorage.setItem('stadium_iq_role', role);
        localStorage.setItem('stadium_iq_username', email.split('@')[0]);
      }
      const finalRole = localStorage.getItem('stadium_iq_role') || 'fan';
      navigate(finalRole === 'manager' ? '/manager' : `/${finalRole}`);
    } catch (err: any) {
      console.warn("Firebase Auth failed, falling back to local SQLite DB check...", err);
      
      // Fallback: Sign up or Login via FastAPI backend database
      try {
        // Sanitize username (replace dots, spaces, etc. with underscores)
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
        
        if (isRegister) {
          let role = "fan";
          const emailLower = email.toLowerCase();
          for (const r of ["volunteer", "security", "medical", "manager", "transport"]) {
            if (emailLower.includes(r)) { role = r; break; }
          }
          try {
            await authApi.signup({
              username: username,
              email: email,
              role_name: role,
              password: password
            });
          } catch (signupErr: any) {
            const detail = signupErr.response?.data?.detail || "";
            if (detail.includes("already registered") || detail.includes("already in use")) {
              console.log("User already exists locally. Attempting direct login...");
            } else {
              throw signupErr;
            }
          }
        } else {
          // Attempt implicit auto-registration if login fails (user does not exist yet)
          try {
            const res = await authApi.login(username, password);
            localStorage.setItem('stadium_iq_token', res.access_token);
            localStorage.setItem('stadium_iq_role', res.role);
            localStorage.setItem('stadium_iq_username', res.username);
            navigate('/dashboard');
            return;
          } catch (loginErr) {
            // User does not exist, let's auto-register them
            let role = "fan";
            const emailLower = email.toLowerCase();
            for (const r of ["volunteer", "security", "medical", "manager", "transport"]) {
              if (emailLower.includes(r)) { role = r; break; }
            }
            
            try {
              await authApi.signup({
                username: username,
                email: email,
                role_name: role,
                password: password
              });
            } catch (signupErr) {
              throw new Error("Login failed. Please verify your password configuration.");
            }
          }
        }
        
        // Final log in
        const res = await authApi.login(username, password);
        localStorage.setItem('stadium_iq_token', res.access_token);
        localStorage.setItem('stadium_iq_role', res.role);
        localStorage.setItem('stadium_iq_username', res.username);
        navigate(res.role === 'manager' ? '/manager' : `/${res.role}`);
      } catch (dbErr: any) {
        const customMessage = dbErr.response?.data?.detail || dbErr.message;
        setError(customMessage || "Invalid credentials. Please enter a valid email and password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Quick Auto-Login Persona Cards
  const handleQuickLogin = async (roleName: string) => {
    setIsLoading(true);
    setError(null);
    const demoEmail = `${roleName}@stadiumiq.com`;
    const demoPassword = roleName; // Aligns with get_password_hash(roleName) in db seed

    try {
      // Try Firebase Signin first (if pre-configured on Google Console)
      const userCred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      const token = await userCred.user.getIdToken();
      localStorage.setItem('stadium_iq_token', token);
      localStorage.setItem('stadium_iq_role', roleName);
      localStorage.setItem('stadium_iq_username', roleName);
      navigate(roleName === 'manager' ? '/manager' : `/${roleName}`);
    } catch (err) {
      console.log(`Firebase email login unavailable for ${roleName}. Simulating JWT authorization key locally.`);
      
      // Local fallback: bypass directly to dashboard (perfect for offline development)
      try {
        const res = await authApi.login(roleName, roleName);
        localStorage.setItem('stadium_iq_token', res.access_token);
        localStorage.setItem('stadium_iq_role', res.role);
        localStorage.setItem('stadium_iq_username', res.username);
        navigate(res.role === 'manager' ? '/manager' : `/${res.role}`);
      } catch (dbErr) {
        setError(`Failed to perform quick login for ${roleName}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030914] text-white flex flex-col items-center justify-center p-4 relative overflow-x-hidden">
      
      {/* Background Neon glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-fifa-emerald/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#0a3680]/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left column - Login Form */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="glass-card p-8 rounded-2xl border border-white/10 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-fifa-accent" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-fifa-accent bg-clip-text text-transparent">
                  StadiumIQ AI
                </h1>
                <p className="text-[10px] text-fifa-textSecondary uppercase tracking-widest">
                  Smart Tournament Operations
                </p>
              </div>
            </div>

            <p className="text-xs text-fifa-textSecondary mb-6 leading-relaxed">
              Authenticate via Firebase Identity provider to view designated terminal controls.
            </p>

            {error && (
              <div className="bg-red-950/40 border border-red-500/25 p-3 rounded-lg text-xs text-red-300 mb-4 animate-shake">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-fifa-textSecondary uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-fifa-textSecondary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@stadiumiq.com"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-fifa-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-fifa-textSecondary uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-fifa-textSecondary" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-fifa-accent"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-fifa-accent hover:bg-fifa-accentHover text-fifa-dark py-2.5 rounded-lg text-sm font-bold tracking-wider uppercase transition-all shadow-md shadow-fifa-accent/15"
              >
                {isLoading ? "Validating..." : isRegister ? "Create Credentials" : "Sign In"}
              </button>
            </form>

            <div className="flex justify-between items-center mt-3 text-xs">
              <button 
                onClick={() => setIsRegister(!isRegister)} 
                className="text-fifa-accent hover:underline"
              >
                {isRegister ? "Already registered? Login" : "Create new account"}
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[#0b1424] px-2 text-fifa-textSecondary">OR</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/5 py-2.5 rounded-lg text-xs font-semibold transition-all"
              >
                <Chrome className="w-4 h-4 text-red-400" />
                Google
              </button>
              <button
                onClick={handleAnonymousLogin}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/5 py-2.5 rounded-lg text-xs font-semibold transition-all"
              >
                <Users className="w-4 h-4 text-fifa-accent" />
                Guest Mode
              </button>
            </div>
          </div>
        </div>

        {/* Right column - Quick access demo personas */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-fifa-accent" />
            <h2 className="text-lg font-bold">Quick-Access Demo Terminals</h2>
          </div>
          <p className="text-xs text-fifa-textSecondary mb-6">
            Bypass cloud credentials config to instantly open designated dashboards with preloaded database seeds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_PERSONAS.map((persona) => (
              <div
                key={persona.role}
                onClick={() => handleQuickLogin(persona.role)}
                className="glass-card hover:bg-white/[0.04] p-4 rounded-xl border border-white/5 hover:border-fifa-accent/30 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-xs tracking-wider text-white group-hover:text-fifa-accent transition-colors uppercase">
                    {persona.name}
                  </h3>
                  <p className="text-[10px] text-fifa-textSecondary mt-1 leading-relaxed">
                    {persona.desc}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[9px] bg-fifa-accent/10 text-fifa-accent px-2 py-0.5 rounded font-bold uppercase">
                    {persona.role}
                  </span>
                  <span className="text-[10px] text-fifa-textSecondary group-hover:translate-x-1 transition-transform">
                    Initialize →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer copyright */}
      <span className="text-[10px] text-fifa-textSecondary mt-12 z-10">
        © 2026 StadiumIQ AI. Prepared for the FIFA World Cup Hackathon.
      </span>
    </div>
  );
};
export default Login;
