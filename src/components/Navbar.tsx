import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { LifeBuoy, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isPathActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/my-work' && (location.pathname === '/my-work' || location.search.includes('assignee=me'))) return true;
    if (path === '/tickets' && location.pathname === '/tickets' && !location.search.includes('assignee=me')) return true;
    if (path !== '/' && path !== '/tickets' && path !== '/my-work' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand & Left Navigation */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <span className="font-semibold text-gray-900 text-sm tracking-tight">
                SupportFlow
              </span>
            </Link>

            {user && (
              <nav className="flex items-center gap-1 text-xs sm:text-sm">
                {/* Dashboard (All roles) */}
                <Link
                  to="/"
                  className={`px-3 py-1.5 rounded font-medium transition-colors ${
                    isPathActive('/')
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Dashboard
                </Link>

                {/* Requester navigation */}
                {user.role === 'REQUESTER' && (
                  <>
                    <Link
                      to="/tickets"
                      className={`px-3 py-1.5 rounded font-medium transition-colors ${
                        isPathActive('/tickets') && location.pathname !== '/tickets/new'
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      My Tickets
                    </Link>
                    <Link
                      to="/tickets/new"
                      className={`px-3 py-1.5 rounded font-medium transition-colors ${
                        isPathActive('/tickets/new')
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Raise Ticket
                    </Link>
                  </>
                )}

                {/* Support Agent navigation */}
                {user.role === 'SUPPORT_AGENT' && (
                  <>
                    <Link
                      to="/tickets"
                      className={`px-3 py-1.5 rounded font-medium transition-colors ${
                        isPathActive('/tickets')
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Support Queue
                    </Link>
                    <Link
                      to="/my-work"
                      className={`px-3 py-1.5 rounded font-medium transition-colors ${
                        isPathActive('/my-work')
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      My Work
                    </Link>
                  </>
                )}

                {/* Admin navigation */}
                {user.role === 'ADMIN' && (
                  <>
                    <Link
                      to="/tickets"
                      className={`px-3 py-1.5 rounded font-medium transition-colors ${
                        isPathActive('/tickets') && location.pathname !== '/tickets/new'
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      All Tickets
                    </Link>
                    <Link
                      to="/my-work"
                      className={`px-3 py-1.5 rounded font-medium transition-colors ${
                        isPathActive('/my-work')
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      My Work
                    </Link>
                    <Link
                      to="/admin/users"
                      className={`px-3 py-1.5 rounded font-medium transition-colors ${
                        isPathActive('/admin/users')
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Users
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                    isPathActive('/profile')
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                  <span className="font-medium hidden sm:inline">{user.name}</span>
                </Link>

                <button
                  onClick={logout}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <Link
                  to="/login"
                  className="px-3 py-1.5 font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
