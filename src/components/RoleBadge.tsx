import React from 'react';
import { ShieldAlert, ShieldCheck, User } from 'lucide-react';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm', showIcon = false }) => {
  const normRole = (role || '').toUpperCase();

  let label = 'Requester';
  let styles =
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
  let Icon = User;

  if (normRole === 'ADMIN') {
    label = 'Administrator';
    styles =
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60';
    Icon = ShieldAlert;
  } else if (normRole === 'SUPPORT_AGENT') {
    label = 'Support Engineer';
    styles =
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60';
    Icon = ShieldCheck;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md border tracking-tight ${sizeClasses} ${styles}`}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
