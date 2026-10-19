import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { RoleBadge } from './RoleBadge.tsx';
import { Menu, PlusCircle, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();

  const getBreadcrumb = () => {
    const p = location.pathname;
    if (p === '/') return { section: 'Workspace', page: 'Overview' };
    if (p === '/my-work') return { section: 'Workspace', page: 'My Work' };
    if (p === '/tickets/new') return { section: 'Tickets', page: 'New Ticket' };
    if (p.startsWith('/tickets/')) return { section: 'Tickets', page: 'Investigation' };
    if (p === '/tickets') {
      if (user?.role === 'REQUESTER') return { section: 'Workspace', page: 'My Tickets' };
      if (user?.role === 'SUPPORT_AGENT') return { section: 'Workspace', page: 'Ticket Queue' };
      return { section: 'Workspace', page: 'All Tickets' };
    }
    if (p === '/admin/users') return { section: 'Management', page: 'User Directory' };
    if (p === '/profile') return { section: 'Account', page: 'Profile' };
    if (p === '/admin-setup') return { section: 'System', page: 'Admin Setup' };
    return { section: 'SupportFlow', page: 'Desk' };
  };

  const breadcrumb = getBreadcrumb();
  const isTicketDetail = location.pathname.startsWith('/tickets/') && location.pathname !== '/tickets/new';

  return (
    <header className="h-14 bg-white dark:bg-[#192330] border-b border-[#E1E6EE] dark:border-[#344153] sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors">
      {/* Left: Mobile Toggle & Contextual Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar"
          className="md:hidden p-1.5 text-[#667085] hover:text-[#202B3C] dark:text-[#A5B1C2] dark:hover:text-[#F1F5F9] rounded-md hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B]"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isTicketDetail && (
          <Link
            to="/tickets"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-[#667085] hover:text-[#202B3C] dark:text-[#A5B1C2] dark:hover:text-[#F1F5F9] font-medium mr-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <span className="text-[#8B95A5] dark:text-[#6B7B92] font-medium hidden sm:inline">
            {breadcrumb.section}
          </span>
          <span className="text-[#8B95A5] dark:text-[#6B7B92] hidden sm:inline">/</span>
          <span className="font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
            {breadcrumb.page}
          </span>
        </nav>
      </div>

      {/* Right: Role indicator, Quick Actions & Light/Dark Theme Switch */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {user && (
          <div className="hidden sm:flex items-center">
            <RoleBadge role={user.role} size="sm" showIcon />
          </div>
        )}

        {user?.role === 'REQUESTER' && location.pathname !== '/tickets/new' && (
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Raise Ticket</span>
            <span className="xs:hidden sm:hidden">New</span>
          </Link>
        )}

        <div className="h-4 w-px bg-[#E1E6EE] dark:bg-[#344153] mx-0.5 sm:mx-1 hidden sm:block" />

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
};
