import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <Sidebar />
      {/* pt-16 on mobile for the fixed mobile header, lg:pt-0 on desktop */}
      <main className="pt-16 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
        <ErrorBoundary>
          <div key={location.pathname} className="page-enter min-w-0">
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
