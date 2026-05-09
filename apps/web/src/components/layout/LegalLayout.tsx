import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface LegalLayoutProps {
  title: string;
  updated: string;
  children: ReactNode;
}

export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img
              src="/logo-icon-large.png"
              alt=""
              className="w-8 h-8 rounded-lg blend-multiply"
            />
            <span className="text-base font-display font-bold text-pink-primary truncate">
              Paca Finance
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm shrink-0">
            <Link
              to="/privacy"
              className="text-gray-500 hover:text-pink-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-gray-500 hover:text-pink-primary transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/support"
              className="text-gray-500 hover:text-pink-primary transition-colors"
            >
              Support
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-800 dark:text-gray-100 mb-2">
          {title}
        </h1>
        <p className="text-sm text-gray-400 mb-10">Updated {updated}</p>

        <article className="prose-paca space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          {children}
        </article>

        <footer className="mt-16 pt-6 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-400">
          © {new Date().getFullYear()} Paca Finance ·{" "}
          <a href="mailto:madualvesfr@gmail.com" className="hover:text-pink-primary">
            madualvesfr@gmail.com
          </a>
        </footer>
      </main>
    </div>
  );
}
