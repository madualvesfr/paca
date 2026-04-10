import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, useI18n } from "@paca/api";
import { loginSchema, signupSchema } from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Mode = "login" | "signup";

// Floating decorative shapes for the left panel
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large circle */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 animate-float-slow" />
      {/* Medium circle */}
      <div className="absolute bottom-32 -left-16 w-48 h-48 rounded-full bg-white/[0.07] animate-float" style={{ animationDelay: "2s" }} />
      {/* Small circle */}
      <div className="absolute top-1/3 right-12 w-24 h-24 rounded-full bg-white/[0.08] animate-float" style={{ animationDelay: "4s" }} />
      {/* Tiny dots */}
      <div className="absolute top-20 left-1/4 w-3 h-3 rounded-full bg-white/20 animate-float-slow" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-20 right-1/3 w-4 h-4 rounded-full bg-white/15 animate-float" style={{ animationDelay: "3s" }} />
      {/* Glow behind logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse-glow" />
    </div>
  );
}

// Left branding panel
function BrandingPanel({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  return (
    <div className="hidden lg:flex lg:w-[42%] relative bg-gradient-to-br from-pink-dark via-pink-primary to-pink-light animate-gradient items-center justify-center p-12">
      <FloatingShapes />
      <div className="relative z-10 text-center flex flex-col items-center">
        {/* Logo icon */}
        <div className="mb-8 animate-float-slow">
          <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.2)] border-2 border-white/20">
            <img
              src="/logo-icon-large.png"
              alt="Paca Finance"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <h1 className="text-4xl xl:text-5xl font-display font-bold text-white mb-4 drop-shadow-lg">
          Paca Finance
        </h1>
        <p className="text-lg text-white/80 max-w-sm leading-relaxed">
          {mode === "login"
            ? t.auth.brandDescription
            : t.auth.brandSignupDescription}
        </p>
      </div>
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();

  const initialMode: Mode = location.pathname === "/signup" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState(0);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validation state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // Real-time validation
  const emailError = useMemo(() => {
    if (!emailTouched || !email) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : t.auth.invalidCredentials;
  }, [email, emailTouched]);

  const emailValid = useMemo(() => {
    if (!emailTouched || !email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email, emailTouched]);

  const passwordError = useMemo(() => {
    if (!passwordTouched || !password) return "";
    return password.length < 6 ? t.auth.minPassword : "";
  }, [password, passwordTouched]);

  const passwordValid = useMemo(() => {
    if (!passwordTouched || !password) return false;
    return password.length >= 6;
  }, [password, passwordTouched]);

  const nameError = useMemo(() => {
    if (!nameTouched || !displayName) return "";
    return displayName.length < 1 ? t.auth.yourName : "";
  }, [displayName, nameTouched]);

  // Sync URL with mode
  useEffect(() => {
    const newPath = mode === "login" ? "/login" : "/signup";
    if (location.pathname !== newPath) {
      window.history.replaceState(null, "", newPath);
    }
  }, [mode, location.pathname]);

  const switchMode = useCallback((newMode: Mode) => {
    setError("");
    setSlideDirection(newMode === "signup" ? "right" : "left");
    setAnimKey((k) => k + 1);
    setMode(newMode);
    // Reset touched states
    setEmailTouched(false);
    setPasswordTouched(false);
    setNameTouched(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      setLoading(true);
      try {
        await signIn(email, password);
        navigate("/");
      } catch (err: any) {
        setError(
          err.message === "Invalid login credentials"
            ? t.auth.invalidCredentials
            : t.auth.loginError
        );
      } finally {
        setLoading(false);
      }
    } else {
      const result = signupSchema.safeParse({ email, password, display_name: displayName });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      setLoading(true);
      try {
        await signUp(email, password, displayName);
        navigate("/onboarding");
      } catch (err: any) {
        if (err.message?.includes("already registered")) {
          setError(t.auth.emailAlreadyRegistered);
        } else {
          setError(t.auth.signupError);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const animClass = slideDirection === "right" ? "animate-slideInRight" : "animate-slideInLeft";

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      {/* Left side - branding */}
      <BrandingPanel mode={mode} />

      {/* Right side - form */}
      <div className="w-full lg:w-[58%] flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
        {/* Mini paca decorativa */}
        <img
          src="/logo-icon-large.png"
          alt=""
          aria-hidden
          className="hidden lg:block absolute top-8 right-8 w-16 h-16 rotate-[10deg] pointer-events-none select-none animate-float-slow blend-multiply"
        />
        <div className="w-full max-w-md" key={animKey}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block w-20 h-20 rounded-2xl overflow-hidden shadow-lg mb-3">
              <img src="/logo-icon-large.png" alt="Paca Finance" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-display font-bold text-pink-primary">
              Paca Finance
            </h1>
          </div>

          <div className={`animate-stagger ${animClass}`}>
            {/* Header */}
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100 mb-1">
                {mode === "login" ? t.auth.login : t.auth.createAccount}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                {mode === "login"
                  ? t.auth.welcomeBack
                  : t.auth.startJourney}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-primary/10 border border-red-200 dark:border-red-primary/20 text-red-primary text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Input
                    label={t.auth.yourName}
                    type="text"
                    placeholder={t.auth.namePlaceholder}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                    error={nameError}
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <Input
                  label={t.auth.email}
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  error={emailError}
                  success={emailValid}
                  autoComplete="email"
                />
              </div>

              <div>
                <Input
                  label={t.auth.password}
                  type="password"
                  placeholder={mode === "signup" ? t.auth.minPassword : t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  error={passwordError}
                  success={passwordValid}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {/* Remember me (login only) */}
              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 peer-checked:border-pink-primary peer-checked:bg-pink-primary transition-all duration-200 flex items-center justify-center">
                        {rememberMe && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      {t.auth.rememberMe}
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-1">
                <Button type="submit" fullWidth loading={loading} className="btn-3d">
                  {mode === "login" ? t.auth.signIn : t.auth.createAccount}
                </Button>
              </div>
            </form>

            {/* Switch mode */}
            <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                className="text-pink-primary font-semibold hover:underline transition-colors"
              >
                {mode === "login" ? t.auth.createAccount : t.auth.signIn}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
