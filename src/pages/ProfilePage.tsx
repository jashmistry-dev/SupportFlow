import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="pb-3 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">User Profile</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Corporate account details and activity summary
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 bg-white border border-gray-200 rounded text-center text-xs text-gray-500">
          Loading profile...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <div className="font-semibold">Unable to load profile</div>
          <div className="mt-1">{error}</div>
        </div>
      ) : profile ? (
        <div className="bg-white p-5 rounded border border-gray-200 space-y-4 text-xs">
          <div>
            <div className="text-[11px] font-medium text-gray-500">Full Name</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">
              {profile.user.name}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-gray-500">Corporate Email</div>
            <div className="font-mono text-gray-800 mt-0.5">
              {profile.user.email}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-gray-500">Role</div>
            <div className="mt-0.5">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                {profile.user.role}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-gray-500">Member Since</div>
            <div className="text-gray-700 mt-0.5">
              {formatDate(profile.user.createdAt)}
            </div>
          </div>

          {/* Real Work & Activity Stats */}
          <div className="pt-3 border-t border-gray-100">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">Activity Summary</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
                <div className="text-[10px] text-gray-500 font-medium">Tickets Created</div>
                <div className="text-base font-bold text-gray-900 mt-0.5">
                  {profile.stats.createdCount}
                </div>
              </div>

              {(profile.user.role === 'SUPPORT_AGENT' || profile.user.role === 'ADMIN') && (
                <>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
                    <div className="text-[10px] text-gray-500 font-medium">Assigned Work</div>
                    <div className="text-base font-bold text-gray-900 mt-0.5">
                      {profile.stats.assignedCount}
                    </div>
                  </div>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded">
                    <div className="text-[10px] text-gray-500 font-medium">Resolved</div>
                    <div className="text-base font-bold text-gray-900 mt-0.5">
                      {profile.stats.resolvedCount}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={logout}
              className="px-3.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
