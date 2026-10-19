import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Users, Search, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { RoleBadge } from '../components/RoleBadge.tsx';
import { TableSkeleton } from '../components/Skeleton.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorState } from '../components/ErrorState.tsx';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.error || 'Failed to retrieve user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (targetUserId: number, newRole: string) => {
    try {
      setUpdatingId(targetUserId);
      setMessage(null);
      setError(null);

      await api.patch(`/users/${targetUserId}/role`, { role: newRole });

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
      showToast('User role successfully updated.', 'success');
      setMessage('User role successfully updated.');
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to update user role:', err);
      const errMsg = err.response?.data?.error || 'Failed to update user role';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] p-12 text-center max-w-md mx-auto animate-fade-in shadow-xs">
        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
          Restricted Area
        </h2>
        <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
          Access restricted to administrators.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E1E6EE] dark:border-[#344153]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
              User Directory & Roles
            </h1>
            {!isLoading && (
              <span className="text-xs text-[#667085] dark:text-[#A5B1C2] font-mono tabular-nums px-2 py-0.5 rounded bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153]">
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
            Manage account access, assign support engineers, and configure administrator permissions.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <ErrorState
          title="User management error"
          message={error}
          onRetry={fetchUsers}
        />
      )}

      {message && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-md text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#192330] p-3 rounded-lg border border-[#E1E6EE] dark:border-[#344153] flex items-center justify-between shadow-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8B95A5] dark:text-[#6B7B92]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-8 pr-8 py-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-[#8B95A5] hover:text-[#202B3C] dark:text-[#6B7B92] dark:hover:text-[#F1F5F9]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Users Table or Skeleton */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={4} showMobileCards={true} />
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153]">
          <EmptyState
            icon={Users}
            title={searchTerm ? 'No users match your search' : 'No users registered'}
            description={
              searchTerm
                ? 'Try searching with a different name or email address.'
                : 'No users have joined the support workspace yet.'
            }
            actionLabel={searchTerm ? 'Clear Search' : undefined}
            onAction={searchTerm ? () => setSearchTerm('') : undefined}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] overflow-hidden shadow-xs">
          {/* Mobile Card List (< 640px) */}
          <div className="divide-y divide-[#E1E6EE] dark:divide-[#344153] sm:hidden">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-xs text-[#202B3C] dark:text-[#F1F5F9] truncate">
                    {u.name}
                    {u.id === user.id && (
                      <span className="ml-1 text-[10px] text-role-primary font-semibold">(You)</span>
                    )}
                  </div>
                  <RoleBadge role={u.role} size="sm" />
                </div>

                <div className="text-xs text-[#667085] dark:text-[#A5B1C2] font-mono truncate">
                  {u.email}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E1E6EE]/60 dark:border-[#344153]/60">
                  <label className="text-[11px] text-[#667085] dark:text-[#A5B1C2]">Change Role:</label>
                  <select
                    value={u.role}
                    disabled={updatingId === u.id || u.id === user.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="px-2 py-1 border border-[#E1E6EE] dark:border-[#344153] rounded text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring disabled:opacity-50"
                  >
                    <option value="REQUESTER">Requester</option>
                    <option value="SUPPORT_AGENT">Support Engineer</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E1E6EE] dark:divide-[#344153] text-left text-xs">
              <thead className="bg-[#F0F3F7] dark:bg-[#202C3B] text-[#667085] dark:text-[#A5B1C2] font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-2.5">User</th>
                  <th scope="col" className="px-4 py-2.5">Email</th>
                  <th scope="col" className="px-4 py-2.5">Role</th>
                  <th scope="col" className="px-4 py-2.5">Joined</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6EE] dark:divide-[#344153] bg-white dark:bg-[#192330]">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-[#F5F7FA] dark:hover:bg-[#202C3B]/60 transition-colors"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-[#202B3C] dark:text-[#F1F5F9]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-role-subtle text-role-primary border border-role-subtle flex items-center justify-center font-bold text-[10px] uppercase">
                          {u.name.charAt(0) || 'U'}
                        </div>
                        <span>{u.name}</span>
                        {u.id === user.id && (
                          <span className="text-[10px] text-role-primary font-semibold">(You)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#667085] dark:text-[#A5B1C2] font-mono">
                      {u.email}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <RoleBadge role={u.role} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#8B95A5] dark:text-[#6B7B92] font-mono tabular-nums">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id || u.id === user.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1 border border-[#E1E6EE] dark:border-[#344153] rounded text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring disabled:opacity-50"
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="SUPPORT_AGENT">Support Engineer</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
