import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Shield, Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, User, ShieldAlert, BadgeInfo } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const [selectedDistrict, setSelectedDistrict] = useState('bhopal');

  const handleDemoFill = (role) => {
    // Map selectedDistrict to stateShort
    let stateShort = 'mp';
    if (selectedDistrict === 'mumbaisuburban') stateShort = 'maharashtra';
    else if (selectedDistrict === 'nagapattinam') stateShort = 'tamilnadu';
    else if (selectedDistrict === 'rudraprayag') stateShort = 'uttarakhand';

    switch (role) {
      case 'citizen':
        setEmail(`citizen.${selectedDistrict}@crisora.ai`);
        setPassword('password123');
        toast.success(`Filled Citizen Demo (${selectedDistrict})`);
        break;
      case 'collector':
        setEmail(`collector.${selectedDistrict}@crisora.ai`);
        setPassword('password123');
        toast.success(`Filled Collector Demo (${selectedDistrict})`);
        break;
      case 'district':
        setEmail(`authority.${selectedDistrict}@crisora.ai`);
        setPassword('password123');
        toast.success(`Filled District Authority Demo (${selectedDistrict})`);
        break;
      case 'state':
        setEmail(`state.${stateShort}@crisora.ai`);
        setPassword('password123');
        toast.success(`Filled State Authority Demo (${stateShort})`);
        break;
      case 'ndma':
        setEmail('ndma@crisora.ai');
        setPassword('password123');
        toast.success('Filled NDMA Officer Demo');
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");
    
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials. Please make sure the user is registered.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4 font-sans text-theme-text relative overflow-hidden">
      
      <div className="absolute inset-x-0 top-0 h-2 bg-theme-primary pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-theme-primary/5 pointer-events-none"></div>

      {/* Helper dots menu in upper right */}
      <div className="absolute top-6 right-6 z-10">
        <button className="p-2.5 bg-theme-card/60 hover:bg-theme-bg rounded-xl border border-theme-border/80 text-theme-muted hover:text-theme-text transition-all cursor-pointer">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      <div className="w-full max-w-[440px] z-10">
        {/* Glassmorphic Card Container */}
        <div className="bg-theme-card border border-theme-border rounded-2xl p-8 shadow-xl relative">
          
          {/* Subtle top glow line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-theme-primary rounded-t-2xl"></div>

          {/* Logo / Header Area */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-1.5 bg-theme-primary/10 border border-theme-primary/25 text-theme-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-wide mb-3">
              <span className="w-1.5 h-1.5 bg-theme-success rounded-full animate-pulse inline-block"/>
              System Online
            </div>
            <div className="relative group">
              <div className="relative p-3.5 bg-theme-card border border-theme-border rounded-2xl shadow-inner flex items-center justify-center">
                <Shield className="w-8 h-8 text-theme-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-theme-text tracking-tight mt-4">
              Crisora AI
            </h1>
            <p className="text-theme-muted mt-2 text-sm font-medium">Disaster Management Command Center</p>
          </div>

          {/* Demo Login Autofill Helpers */}
          <div className="mb-6 bg-theme-card/40 border border-theme-border/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-theme-primary uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Quick Fill</span>
              </div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-theme-bg border border-theme-border rounded-lg text-[10px] font-bold text-theme-text px-2 py-1 focus:outline-none focus:border-theme-primary cursor-pointer"
              >
                <option value="bhopal">Bhopal (MP)</option>
                <option value="indore">Indore (MP)</option>
                <option value="mumbaisuburban">Mumbai Suburban (MH)</option>
                <option value="nagapattinam">Nagapattinam (TN)</option>
                <option value="rudraprayag">Rudraprayag (UK)</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button 
                type="button"
                onClick={() => handleDemoFill('citizen')}
                className="py-1.5 px-2 bg-theme-card hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 text-[11px] font-semibold text-theme-text rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                Citizen
              </button>
              <button 
                type="button"
                onClick={() => handleDemoFill('collector')}
                className="py-1.5 px-2 bg-theme-card hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 text-[11px] font-semibold text-theme-text rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                Collector
              </button>
              <button 
                type="button"
                onClick={() => handleDemoFill('district')}
                className="py-1.5 px-2 bg-theme-card hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 text-[11px] font-semibold text-theme-text rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                District
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                type="button"
                onClick={() => handleDemoFill('state')}
                className="py-1.5 px-2 bg-theme-card hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 text-[11px] font-semibold text-theme-text rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                State Auth
              </button>
              <button 
                type="button"
                onClick={() => handleDemoFill('ndma')}
                className="py-1.5 px-2 bg-theme-card hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 text-[11px] font-semibold text-theme-text rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                NDMA
              </button>
            </div>
            <p className="text-[10px] text-theme-muted mt-2 text-center flex items-center justify-center gap-1">
              <BadgeInfo className="w-3 h-3 text-theme-primary flex-shrink-0" />
              <span>Autofills credentials for selected district. Password: password123</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-theme-muted tracking-wider uppercase">Email Address</label>
              <div className="flex items-center bg-theme-bg border border-theme-border/80 rounded-xl focus-within:border-theme-primary focus-within:shadow-[0_0_0_3px_rgba(21,101,192,0.12)] transition-all duration-300 overflow-hidden group">
                <div className="pl-4 pr-2 py-3 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-3 pr-4 text-sm placeholder:text-theme-muted font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-semibold text-theme-muted tracking-wider uppercase">Password</label>
                <button type="button" className="text-[11px] font-bold text-theme-primary hover:text-theme-primary/80 transition-colors cursor-pointer">
                  Forgot password?
                </button>
              </div>
              <div className="flex items-center bg-theme-bg border border-theme-border/80 rounded-xl focus-within:border-theme-primary focus-within:shadow-[0_0_0_3px_rgba(21,101,192,0.12)] transition-all duration-300 overflow-hidden group">
                <div className="pl-4 pr-2 py-3 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-3 pr-2 text-sm placeholder:text-theme-muted font-medium tracking-wide"
                  placeholder="********"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-4 pl-2 py-3 text-theme-muted hover:text-theme-text transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-theme-primary hover:bg-theme-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/20 mt-6 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme-border/80"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-theme-card text-theme-muted text-xs font-semibold">or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={() => toast("Google OAuth coming soon!")}
            className="w-full py-3 px-4 bg-theme-bg border border-theme-border hover:bg-theme-primary/10 hover:border-theme-primary/30 rounded-xl font-semibold text-theme-text transition-all flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer"
          >
            <GoogleIcon />
            Google
          </button>

          {/* Footer */}
          <p className="mt-8 text-center text-theme-muted text-sm font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-theme-primary hover:text-theme-primary/80 font-bold transition-colors">
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
