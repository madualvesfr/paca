import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  variant?: "default" | "search" | "money";
}

export function EmptyState({ title, description, action, variant = "default" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-3xl overflow-hidden opacity-80">
          <img
            src="/logo-icon-large.png"
            alt=""
            className="w-full h-full object-cover blend-multiply dark:opacity-70"
          />
        </div>
        {/* Overlay icon based on variant */}
        {variant === "search" && (
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-pink-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-pink-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
        {variant === "money" && (
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>
      <h3 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}
