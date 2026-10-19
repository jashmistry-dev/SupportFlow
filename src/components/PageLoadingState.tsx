import React from 'react';
import { LifeBuoy } from 'lucide-react';

interface PageLoadingStateProps {
  message?: string;
  submessage?: string;
}

export const PageLoadingState: React.FC<PageLoadingStateProps> = ({
  message = 'Loading SupportFlow...',
  submessage = 'Connecting to workspace and preparing interface...',
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] dark:bg-[#111821] p-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-role-primary flex items-center justify-center text-role-contrast shadow-md mb-4 animate-pulse-subtle">
        <LifeBuoy className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <h2 className="text-sm font-semibold text-[#202B3C] dark:text-[#F1F5F9] tracking-tight">
        {message}
      </h2>
      {submessage && (
        <p className="text-xs text-[#8B95A5] dark:text-[#6B7B92] mt-1 max-w-xs leading-relaxed">
          {submessage}
        </p>
      )}
    </div>
  );
};
