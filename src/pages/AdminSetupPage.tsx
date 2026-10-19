import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { ShieldAlert, KeyRound, ArrowRight, AlertCircle, CheckCircle2, LifeBuoy } from 'lucide-react';

export const AdminSetupPage: React.FC = () => {
  const { user, promoteToAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email || '');
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await promoteToAdmin(email.trim().toLowerCase(), setupKey.trim());
      setSuccess('Account successfully promoted to Administrator!');
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Failed to promote account. Please verify your email and setup key.'
      );
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
          Administrator Setup
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
          Promote an existing account to Administrator role using the server setup key
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

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-[#132E27] border border-emerald-200 dark:border-[#1F4D41] text-emerald-800 dark:text-[#4ADE80] text-xs rounded-md flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-[#4ADE80]" />
              <span>{success} Redirecting to Workspace...</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Registered Account Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring"
              />
              <p className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-1">
                The account must already be registered in SupportFlow.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Admin Setup Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-[#8B95A5] absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  required
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  placeholder="Enter the 32-character Admin Setup Key"
                  className="w-full pl-8 pr-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] font-mono focus-role-ring"
                />
              </div>
              <p className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-1">
                Stored in <code className="font-mono">.admin-setup-key</code> on the server or configured via ADMIN_SETUP_KEY.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !setupKey.trim()}
              className="w-full mt-2 py-2 px-3 text-xs font-semibold btn-role-primary rounded-md transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{isLoading ? 'Verifying & Promoting...' : 'Promote to Administrator'}</span>
              {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#E1E6EE] dark:border-[#344153] flex items-center justify-between text-xs text-[#667085] dark:text-[#A5B1C2]">
            <Link to="/register" className="text-role-primary hover:underline font-semibold">
              Register New Account
            </Link>
            <Link to="/login" className="text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
