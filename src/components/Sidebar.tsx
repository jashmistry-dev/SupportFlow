import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LifeBuoy,
  LayoutDashboard,
  Inbox,
  Briefcase,
  Ticket,
  PlusCircle,
  Users,
  User as UserIcon,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { RoleBadge } from './RoleBadge.tsx';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Internal collapse state if not controlled externally
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem('supportflow_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalCollapsed;
      setInternalCollapsed(next);
      try {
        localStorage.setItem('supportflow_sidebar_collapsed', String(next));
      } catch {}
    }
  };

  if (!user) return null;

  const isPathActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/my-work' && (location.pathname === '/my-work' || location.search.includes('assignee=me'))) {
      return true;
    }
    if (path === '/tickets' && location.pathname === '/tickets' && !location.search.includes('assignee=me')) {
      return true;
    }
    if (path !== '/' && path !== '/tickets' && path !== '/my-work' && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  const navClass = (path: string) => {
    const active = isPathActive(path);
    return `flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md transition-all whitespace-nowrap group ${
      active
        ? 'bg-role-subtle text-role-primary border-l-2 border-role-primary font-semibold'
        : 'text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] font-medium'
    }`;
  };

  const iconClass = (path: string) => {
    const active = isPathActive(path);
    return `w-4 h-4 shrink-0 transition-colors ${
      active ? 'text-role-primary' : 'text-[#8B95A5] dark:text-[#6B7B92] group-hover:text-[#202B3C] dark:group-hover:text-[#F1F5F9]'
    }`;
  };

  return (
    <>
      {/* Desktop Sidebar (Persistent, collapsible with smooth transition) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-20 bg-white dark:bg-[#192330] border-r border-[#E1E6EE] dark:border-[#344153] transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#E1E6EE] dark:border-[#344153]">
          <Link
            to="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-role-ring rounded-md overflow-hidden"
            title="SupportFlow Workspace"
          >
            <div className="w-7 h-7 rounded-lg bg-role-primary flex items-center justify-center text-role-contrast shadow-xs shrink-0">
              <LifeBuoy className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-sm tracking-tight text-[#202B3C] dark:text-[#F1F5F9] truncate">
                SupportFlow
              </span>
            )}
          </Link>

          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="p-1 rounded text-[#8B95A5] hover:text-[#202B3C] dark:text-[#6B7B92] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-role-ring"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {/* Workspace Group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8B95A5] dark:text-[#6B7B92]">
                Workspace
              </div>
            )}

            {/* Dashboard / Overview */}
            <Link
              to="/"
              className={navClass('/')}
              title={isCollapsed ? 'Overview' : undefined}
            >
              <LayoutDashboard className={iconClass('/')} />
              {!isCollapsed && <span className="truncate">Overview</span>}
            </Link>

            {/* Requester navigation */}
            {user.role === 'REQUESTER' && (
              <>
                <Link
                  to="/tickets"
                  className={navClass('/tickets')}
                  title={isCollapsed ? 'My Tickets' : undefined}
                >
                  <Ticket className={iconClass('/tickets')} />
                  {!isCollapsed && <span className="truncate">My Tickets</span>}
                </Link>
                <Link
                  to="/tickets/new"
                  className={navClass('/tickets/new')}
                  title={isCollapsed ? 'Raise Ticket' : undefined}
                >
                  <PlusCircle className={iconClass('/tickets/new')} />
                  {!isCollapsed && <span className="truncate">Raise Ticket</span>}
                </Link>
              </>
            )}

            {/* Agent / Admin navigation */}
            {(user.role === 'SUPPORT_AGENT' || user.role === 'ADMIN') && (
              <>
                <Link
                  to="/tickets"
                  className={navClass('/tickets')}
                  title={isCollapsed ? (user.role === 'ADMIN' ? 'All Tickets' : 'Ticket Queue') : undefined}
                >
                  <Inbox className={iconClass('/tickets')} />
                  {!isCollapsed && (
                    <span className="truncate">{user.role === 'ADMIN' ? 'All Tickets' : 'Ticket Queue'}</span>
                  )}
                </Link>

                <Link
                  to="/my-work"
                  className={navClass('/my-work')}
                  title={isCollapsed ? 'My Work' : undefined}
                >
                  <Briefcase className={iconClass('/my-work')} />
                  {!isCollapsed && <span className="truncate">My Work</span>}
                </Link>
              </>
            )}
          </div>

          {/* Management Group (Admin only) */}
          {user.role === 'ADMIN' && (
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8B95A5] dark:text-[#6B7B92]">
                  Management
                </div>
              )}
              <Link
                to="/admin/users"
                className={navClass('/admin/users')}
                title={isCollapsed ? 'User Management' : undefined}
              >
                <Users className={iconClass('/admin/users')} />
                {!isCollapsed && <span className="truncate">User Management</span>}
              </Link>
            </div>
          )}
        </div>

        {/* User profile card & Logout */}
        <div className="p-2.5 border-t border-[#E1E6EE] dark:border-[#344153] space-y-1.5">
          <Link
            to="/profile"
            className={`flex items-center gap-2.5 p-1.5 rounded-md transition-colors ${
              isPathActive('/profile')
                ? 'bg-[#F0F3F7] dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9]'
                : 'hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9]'
            }`}
            title={isCollapsed ? `${user.name} (${user.role})` : undefined}
          >
            <div className="w-7 h-7 rounded-full bg-role-subtle text-role-primary border border-role-subtle flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user.name.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] truncate mb-0.5">
                  {user.name}
                </div>
                <div>
                  <RoleBadge role={user.role} size="sm" />
                </div>
              </div>
            )}
            {!isCollapsed && <UserIcon className="w-3.5 h-3.5 text-[#8B95A5] dark:text-[#6B7B92] shrink-0" />}
          </Link>

          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors font-medium ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Off-canvas) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#111821]/70 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex flex-col w-64 max-w-[80vw] h-full bg-white dark:bg-[#192330] border-r border-[#E1E6EE] dark:border-[#344153] shadow-xl z-50 animate-fade-in">
            {/* Brand Header with Close */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-[#E1E6EE] dark:border-[#344153]">
              <Link
                to="/"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-role-ring rounded-md"
              >
                <div className="w-7 h-7 rounded-lg bg-role-primary flex items-center justify-center text-role-contrast shadow-xs">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
                  SupportFlow
                </span>
              </Link>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-md text-[#8B95A5] hover:text-[#202B3C] dark:text-[#6B7B92] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8B95A5] dark:text-[#6B7B92]">
                  Workspace
                </div>

                <Link
                  to="/"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-colors ${
                    isPathActive('/')
                      ? 'bg-role-subtle text-role-primary border-l-2 border-role-primary font-semibold'
                      : 'text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] font-medium'
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${isPathActive('/') ? 'text-role-primary' : 'text-[#8B95A5] dark:text-[#6B7B92]'}`} />
                  <span>Overview</span>
                </Link>

                {user.role === 'REQUESTER' && (
                  <>
                    <Link
                      to="/tickets"
                      onClick={onCloseMobile}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-colors ${
                        isPathActive('/tickets') && location.pathname !== '/tickets/new'
                          ? 'bg-role-subtle text-role-primary border-l-2 border-role-primary font-semibold'
                          : 'text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] font-medium'
                      }`}
                    >
                      <Ticket className={`w-4 h-4 shrink-0 ${isPathActive('/tickets') && location.pathname !== '/tickets/new' ? 'text-role-primary' : 'text-[#8B95A5] dark:text-[#6B7B92]'}`} />
                      <span>My Tickets</span>
                    </Link>

                    <Link
                      to="/tickets/new"
                      onClick={onCloseMobile}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-colors ${
                        isPathActive('/tickets/new')
                          ? 'bg-role-subtle text-role-primary border-l-2 border-role-primary font-semibold'
                          : 'text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] font-medium'
                      }`}
                    >
                      <PlusCircle className={`w-4 h-4 shrink-0 ${isPathActive('/tickets/new') ? 'text-role-primary' : 'text-[#8B95A5] dark:text-[#6B7B92]'}`} />
                      <span>Raise Ticket</span>
                    </Link>
                  </>
                )}

                {(user.role === 'SUPPORT_AGENT' || user.role === 'ADMIN') && (
                  <>
                    <Link
                      to="/tickets"
                      onClick={onCloseMobile}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-colors ${
                        isPathActive('/tickets') && location.pathname !== '/tickets/new'
                          ? 'bg-role-subtle text-role-primary border-l-2 border-role-primary font-semibold'
                          : 'text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] font-medium'
                      }`}
                    >
                      <Inbox className={`w-4 h-4 shrink-0 ${isPathActive('/tickets') && location.pathname !== '/tickets/new' ? 'text-role-primary' : 'text-[#8B95A5] dark:text-[#6B7B92]'}`} />
                      <span>{user.role === 'ADMIN' ? 'All Tickets' : 'Ticket Queue'}</span>
                    </Link>

                    <Link
                      to="/my-work"
                      onClick={onCloseMobile}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-colors ${
                        isPathActive('/my-work')
                          ? 'bg-role-subtle text-role-primary border-l-2 border-role-primary font-semibold'
                          : 'text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] font-medium'
                      }`}
                    >
                      <Briefcase className={`w-4 h-4 shrink-0 ${isPathActive('/my-work') ? 'text-role-primary' : 'text-[#8B95A5] dark:text-[#6B7B92]'}`} />
                      <span>My Work</span>
                    </Link>
                  </>
                )}
              </div>

              {user.role === 'ADMIN' && (
                <div className="space-y-1">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8B95A5] dark:text-[#6B7B92]">
                    Management
                  </div>
                  <Link
                    to="/admin/users"
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-colors ${
                      isPathActive('/admin/users')
                        ? 'bg-role-subtle text-role-primary border-l-2 border-role-primary font-semibold'
                        : 'text-[#667085] dark:text-[#A5B1C2] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] font-medium'
                    }`}
                  >
                    <Users className={`w-4 h-4 shrink-0 ${isPathActive('/admin/users') ? 'text-role-primary' : 'text-[#8B95A5] dark:text-[#6B7B92]'}`} />
                    <span>User Management</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile User Card & Logout */}
            <div className="p-3 border-t border-[#E1E6EE] dark:border-[#344153] space-y-2">
              <Link
                to="/profile"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-role-subtle text-role-primary border border-role-subtle flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {user.name.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] truncate">
                    {user.name}
                  </div>
                  <div className="mt-0.5">
                    <RoleBadge role={user.role} size="sm" />
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-md transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
