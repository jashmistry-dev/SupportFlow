import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionNode?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionNode,
}) => {
  return (
    <div className="py-14 px-4 text-center animate-fade-in">
      <div className="w-11 h-11 rounded-lg bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153] flex items-center justify-center mx-auto text-[#8B95A5] dark:text-[#6B7B92] mb-3 shadow-xs">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
        {title}
      </h3>
      <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1.5 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>

      {actionNode ? (
        <div className="mt-4">{actionNode}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-colors shadow-xs"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
};
