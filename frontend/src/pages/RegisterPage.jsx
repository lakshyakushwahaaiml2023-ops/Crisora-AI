import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Shield, Loader2, User, Mail, Phone, Lock, Landmark, Sparkles, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../services/api';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'citizen',
    district: '',
    state: ''
  });
  const [coordinates, setCoordinates] = useState({ longitude: 77.4126, latitude: 23.2599 }); // Bhopal / LNCT Campus default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          });
        },
        (error) => {
          console.warn("Using default Bhopal/LNCT coordinates for registration:", error.message);
        }
      );
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      return toast.error("Please fill in all required fields");
    }

    const payload = {
      ...formData,
      location: {
        type: 'Point',
        coordinates: [coordinates.longitude, coordinates.latitude]
      }
    };

    setIsSubmitting(true);
    try {
      await auth.register(payload);
      toast.success("Registration successful! Please log in.");
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4 font-sans text-theme-text relative overflow-hidden">
      
      <div className="absolute inset-x-0 top-0 h-2 bg-theme-primary pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-theme-primary/5 pointer-events-none"></div>

      <div className="w-full max-w-[500px] z-10 py-6">
        {/* Glassmorphic Card Container */}
        <div className="bg-theme-card border border-theme-border rounded-2xl p-8 shadow-xl relative">
          
          {/* Subtle top glow line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-theme-primary rounded-t-2xl"></div>

          {/* Logo / Header Area */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="relative p-3 bg-theme-card border border-theme-border rounded-2xl shadow-inner flex items-center justify-center">
                <Shield className="w-8 h-8 text-theme-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-theme-text tracking-tight mt-3">
              Crisora AI
            </h1>
            <p className="text-theme-muted mt-1.5 text-xs font-medium">Create your Command Center account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">Full Name *</label>
              <div className="flex items-center bg-theme-card/60 border border-theme-border/80 rounded-xl focus-within:border-theme-primary focus-within:shadow-[0_0_12px_rgba(21,101,192,0.15)] transition-all duration-300 overflow-hidden group">
                <div className="pl-4 pr-2 py-2.5 flex items-center justify-center">
                  <User className="w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-2.5 pr-4 text-sm placeholder:text-theme-muted font-medium"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">Email Address *</label>
              <div className="flex items-center bg-theme-card/60 border border-theme-border/80 rounded-xl focus-within:border-theme-primary focus-within:shadow-[0_0_12px_rgba(21,101,192,0.15)] transition-all duration-300 overflow-hidden group">
                <div className="pl-4 pr-2 py-2.5 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-2.5 pr-4 text-sm placeholder:text-theme-muted font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">Phone Number *</label>
              <div className="flex items-center bg-theme-card/60 border border-theme-border/80 rounded-xl focus-within:border-theme-primary focus-within:shadow-[0_0_12px_rgba(21,101,192,0.15)] transition-all duration-300 overflow-hidden group">
                <div className="pl-4 pr-2 py-2.5 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-2.5 pr-4 text-sm placeholder:text-theme-muted font-medium"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">Password *</label>
              <div className="flex items-center bg-theme-card/60 border border-theme-border/80 rounded-xl focus-within:border-theme-primary focus-within:shadow-[0_0_12px_rgba(21,101,192,0.15)] transition-all duration-300 overflow-hidden group">
                <div className="pl-4 pr-2 py-2.5 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-2.5 pr-4 text-sm placeholder:text-theme-muted font-medium tracking-wide"
                  placeholder="********"
                />
              </div>
            </div>

            {/* Role & Geolocation Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">Role</label>
                <div className="bg-theme-card/60 border border-theme-border/80 rounded-xl overflow-hidden px-1 focus-within:border-theme-primary">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-2.5 px-3 text-sm font-medium cursor-pointer"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="collector">Collector</option>
                    <option value="district_authority">District Authority</option>
                    <option value="state_authority">State Authority</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">Detected Location</label>
                <div className="flex items-center bg-theme-card/60 border border-theme-border/80 rounded-xl py-2.5 px-3.5 text-xs text-theme-success font-semibold">
                  <MapPin className="w-4 h-4 text-theme-success mr-2 flex-shrink-0" />
                  <span className="truncate">
                    {coordinates.longitude.toFixed(4)}, {coordinates.latitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* District & State */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">District</label>
                <div className="flex items-center bg-theme-card/60 border border-theme-border/80 rounded-xl focus-within:border-theme-primary transition-all duration-300 overflow-hidden group">
                  <div className="pl-3.5 pr-1.5 py-2.5 flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-2.5 pr-3 text-sm placeholder:text-theme-muted font-medium"
                    placeholder="e.g. Bhopal"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-theme-muted tracking-wider uppercase">State</label>
                <div className="flex items-center bg-theme-card/60 border border-theme-border/80 rounded-xl focus-within:border-theme-primary transition-all duration-300 overflow-hidden group">
                  <div className="pl-3.5 pr-1.5 py-2.5 flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="flex-1 bg-transparent border-none text-theme-text focus:outline-none focus:ring-0 py-2.5 pr-3 text-sm placeholder:text-theme-muted font-medium"
                    placeholder="e.g. MP"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-theme-primary hover:bg-theme-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/20 mt-6 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Create Account <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-theme-muted text-sm font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-theme-primary hover:text-theme-primary/80 font-bold transition-colors">
              Log in here
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
