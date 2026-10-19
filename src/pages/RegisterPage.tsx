import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { LifeBuoy, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('REQUESTER');
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register(name.trim(), email.trim(), password, role, setupKey.trim());
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 flex flex-col justify-center">
      {/* Top Brand & Theme Switch */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-role-primary flex items-center justify-center text-role-contrast shadow-xs">
            <LifeBuoy className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
            SupportFlow
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-xl font-bold tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
          Create SupportFlow Account
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
          Technical Support Management System
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#192330] p-6 rounded-lg border border-[#E1E6EE] dark:border-[#344153] shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-[#381E24] border border-red-200 dark:border-[#5C2A34] text-red-700 dark:text-[#F87171] text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Account Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
              >
                <option value="REQUESTER">Requester (Employee / Client)</option>
                <option value="SUPPORT_AGENT">Support Engineer</option>
                <option value="ADMIN">Administrator (Requires Setup Key)</option>
              </select>
            </div>

            {/* Protected setup key input when ADMIN is selected */}
            {role === 'ADMIN' && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-md space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-300">
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                  <span>Administrator Setup Key Required</span>
                </div>
                <p className="text-[11px] text-purple-700 dark:text-purple-300/80">
                  Self-registration as ADMIN requires the key generated in <code className="font-mono">.admin-setup-key</code>.
                </p>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-[#8B95A5] absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    required
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    placeholder="Enter Admin Setup Key"
                    className="w-full pl-8 pr-3 py-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] font-mono focus-role-ring"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2 px-3 text-xs font-semibold btn-role-primary rounded-md transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
              {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#E1E6EE] dark:border-[#344153] flex items-center justify-between text-xs text-[#667085] dark:text-[#A5B1C2]">
            <span>Already have an account?</span>
            <Link
              to="/login"
              className="text-role-primary hover:underline font-semibold"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
