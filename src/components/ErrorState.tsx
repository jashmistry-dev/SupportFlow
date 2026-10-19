import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-4 bg-red-50 dark:bg-[#381E24] border border-red-200 dark:border-[#5C2A34] rounded-lg text-xs text-red-700 dark:text-[#F87171] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
        <div>
          <div className="font-semibold text-red-800 dark:text-red-300">{title}</div>
          <div className="mt-0.5 leading-relaxed">{message}</div>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#202C3B] border border-red-200 dark:border-[#5C2A34] hover:bg-red-50 dark:hover:bg-[#2A181D] text-red-700 dark:text-[#F87171] rounded-md text-xs font-medium self-start sm:self-auto transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
