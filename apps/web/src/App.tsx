import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthPage } from "@/pages/AuthPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { NewTransactionPage } from "@/pages/NewTransactionPage";
import { BudgetPage } from "@/pages/BudgetPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ScanReceiptPage } from "@/pages/ScanReceiptPage";
import { EditTransactionPage } from "@/pages/EditTransactionPage";
import { BillsPage } from "@/pages/BillsPage";

export function App() {
  return (
    <Routes>
      {/* Guest routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <AuthPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <AuthPage />
          </GuestRoute>
        }
      />

      {/* Protected - no couple required */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Protected - couple required - with sidebar */}
      <Route
        element={
          <ProtectedRoute requireCouple>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/new" element={<NewTransactionPage />} />
        <Route path="transactions/:id/edit" element={<EditTransactionPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="scan" element={<ScanReceiptPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
