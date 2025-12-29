import React, { useState } from 'react';
import { auth, db } from '../firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const Login = () => {
  const { setCurrentUser } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const userRef = ref(db, `users/${userCredential.user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        localStorage.setItem(
          'app_user',
          JSON.stringify({ ...userCredential.user, ...snapshot.val() })
        );
        navigate('/dashboard');
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-6 py-12">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Side Image */}
        <div
          className="relative hidden md:flex md:w-1/2 items-end bg-cover bg-center"
          style={{ backgroundImage: "url('data:image/png;base64,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')" }}
        >
          <div className="absolute inset-0 bg-[#0F172A]/80" />
          <div className="relative p-10 text-white">
            <h2 className="text-2xl font-semibold mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Secure, fast and professional access to your dashboard.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full md:w-1/2 px-10 py-14">

          {/* Header */}
          <div className="mb-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#3B82F6]/10">
              <ShieldCheck className="h-6 w-6 text-[#3B82F6]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">
              Sign in to your account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your credentials below
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-8 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>

            {/* Email */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-[#0F172A]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm
                  focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-8">
              <label className="mb-2 block text-sm font-medium text-[#0F172A]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm
                  focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#3B82F6]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mb-6 flex w-full items-center justify-center rounded-lg bg-[#3B82F6] py-3 text-sm font-medium text-white
              transition hover:bg-[#2563EB] active:scale-[0.98] disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-xs text-slate-500">
            Having trouble? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
