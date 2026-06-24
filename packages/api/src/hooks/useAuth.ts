import { useEffect, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { useAppStore } from "../store";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const queryClient = useQueryClient();
  const reset = useAppStore((s) => s.reset);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) throw error;
      return data;
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  // Web OAuth: Supabase redirects the page to the provider and back to
  // redirectTo, where the client auto-detects the session. window is guarded so
  // this stays import-safe on native (mobile uses a browser-session flow).
  const signInWithProvider = useCallback(
    async (provider: "google" | "apple") => {
      const redirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
      return data;
    },
    []
  );
  const signInWithGoogle = useCallback(
    () => signInWithProvider("google"),
    [signInWithProvider]
  );
  const signInWithApple = useCallback(
    () => signInWithProvider("apple"),
    [signInWithProvider]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    reset();
    queryClient.clear();
  }, [reset, queryClient]);

  return {
    ...authState,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const reset = useAppStore((s) => s.reset);
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      // Sign out locally; the auth user is already gone server-side.
      await supabase.auth.signOut();
      reset();
      queryClient.clear();
    },
  });
}
