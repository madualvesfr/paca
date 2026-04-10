import { Navigate } from "react-router-dom";
import {
  useAuth,
  useProfile,
  useCouple,
  useSyncLocaleFromProfile,
  useSyncCurrencyFromCouple,
} from "@paca/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCouple?: boolean;
}

export function ProtectedRoute({
  children,
  requireCouple = false,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: couple } = useCouple();
  useSyncLocaleFromProfile(profile?.language);
  useSyncCurrencyFromCouple(couple?.primary_currency);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-pink-primary/30 border-t-pink-primary animate-spin" />
          <p className="text-gray-400 text-sm" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireCouple && profile && !profile.couple_id) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
