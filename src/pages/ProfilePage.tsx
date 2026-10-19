import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { User, Mail, Shield, Calendar, LogOut, CheckCircle2, Ticket, Briefcase } from 'lucide-react';
import { RoleBadge } from '../components/RoleBadge.tsx';
import { ProfileSkeleton } from '../components/Skeleton.tsx';
import { ErrorState } from '../components/ErrorState.tsx';

interface ProfileData {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    createdCount: number;
    assignedCount: number;
    resolvedCount: number;
  };
}

export const ProfilePage: React.FC = () => {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get('/users/profile');
        if (isMounted) {
          setProfile(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load profile:', err);
          setError(
            err.response?.data?.error ||
              (err.response?.status === 404
                ? 'Profile not found (404).'
                : 'Failed to load user profile.')
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const roleLabel =
    profile?.user.role === 'ADMIN'
      ? 'Administrator'
      : profile?.user.role === 'SUPPORT_AGENT'
      ? 'Support Engineer'
      : 'Requester';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#E1E6EE] dark:border-[#344153]">
        <h1 className="text-xl font-bold tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
          Account Profile
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
          Corporate credentials, role authorization, and support workload overview.
        </p>
      </div>

      {isLoading ? (
        <ProfileSkeleton />
      ) : error ? (
        <ErrorState
          title="Unable to load profile"
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : profile ? (
        <div className="bg-white dark:bg-[#192330] p-6 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-5 text-xs">
          {/* User Header Block */}
          <div className="flex items-center gap-4 pb-4 border-b border-[#E1E6EE] dark:border-[#344153]">
            <div className="w-12 h-12 rounded-full bg-role-subtle text-role-primary border border-role-subtle flex items-center justify-center font-bold text-base uppercase shrink-0 shadow-xs">
              {profile.user.name.charAt(0) || 'U'}
            </div>
            <div>
              <div className="text-base font-bold text-[#202B3C] dark:text-[#F1F5F9]">
                {profile.user.name}
              </div>
              <div className="text-xs text-[#667085] dark:text-[#A5B1C2] font-mono mt-0.5">
                {profile.user.email}
              </div>
            </div>
            <div className="ml-auto">
              <RoleBadge role={profile.user.role} size="md" showIcon />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2]">
                Account Role
              </div>
              <div className="text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] mt-0.5">
                {profile.user.role}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2]">
                Member Since
              </div>
              <div className="text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] mt-0.5 font-mono tabular-nums">
                {formatDate(profile.user.createdAt)}
              </div>
            </div>
          </div>

          {/* Real Work & Activity Stats */}
          <div className="pt-4 border-t border-[#E1E6EE] dark:border-[#344153]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2] mb-3">
              Support Activity
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153] rounded-md">
                <div className="text-[11px] text-[#667085] dark:text-[#A5B1C2] font-medium">
                  Tickets Created
                </div>
                <div className="text-xl font-bold text-[#202B3C] dark:text-[#F1F5F9] mt-1 font-mono tabular-nums">
                  {profile.stats.createdCount}
                </div>
              </div>

              {(profile.user.role === 'SUPPORT_AGENT' || profile.user.role === 'ADMIN') && (
                <>
                  <div className="p-3 bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153] rounded-md">
                    <div className="text-[11px] text-[#667085] dark:text-[#A5B1C2] font-medium">
                      Assigned Work
                    </div>
                    <div className="text-xl font-bold text-[#202B3C] dark:text-[#F1F5F9] mt-1 font-mono tabular-nums">
                      {profile.stats.assignedCount}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153] rounded-md">
                    <div className="text-[11px] text-[#667085] dark:text-[#A5B1C2] font-medium">
                      Resolved
                    </div>
                    <div className="text-xl font-bold text-[#202B3C] dark:text-[#F1F5F9] mt-1 font-mono tabular-nums">
                      {profile.stats.resolvedCount}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="pt-4 border-t border-[#E1E6EE] dark:border-[#344153] flex justify-end">
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
