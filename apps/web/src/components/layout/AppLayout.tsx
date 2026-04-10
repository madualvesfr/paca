import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useProfile, useUpdateProfile } from "@paca/api";
import { Sidebar } from "./Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TutorialModal } from "@/components/TutorialModal";

export function AppLayout() {
  const location = useLocation();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Auto-open the tutorial once per user as soon as their profile loads
  // and tutorial_completed is still false. The flag is only flipped on
  // close so reopening the app mid-tour keeps the tour available.
  useEffect(() => {
    if (profile && profile.tutorial_completed === false) {
      setTutorialOpen(true);
    }
  }, [profile?.id, profile?.tutorial_completed]);

  const handleTutorialClose = () => {
    setTutorialOpen(false);
    if (profile && !profile.tutorial_completed) {
      updateProfile.mutate({ tutorial_completed: true });
    }
  };

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
      <TutorialModal open={tutorialOpen} onClose={handleTutorialClose} />
    </div>
  );
}
