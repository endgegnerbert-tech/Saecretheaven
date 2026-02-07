"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, Key, MailCheck, X, AlertCircle } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import { signIn, signUp } from "@/lib/auth-client";
// import { claimAccessCode, releaseAccessCode } from "@/app/actions/access-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthScreenProps {
  onSuccess: (user: {
    id: string;
    email: string;
    vaultKeyHash: string | null;
  }) => void;
  initialMode?: AuthMode;
  userEmail?: string;
}

type AuthMode = "welcome" | "login" | "register" | "verification-sent";

// Email verification popup modal
function EmailCheckModal({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Check your email!
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
          We sent a verification link to:
        </p>
        <p className="text-center text-blue-600 dark:text-blue-400 font-semibold mb-4">
          {email}
        </p>
        <p className="text-center text-gray-500 dark:text-gray-500 text-sm mb-6">
          Click the link in your email to verify your account, then come back to log in.
        </p>

        {/* Support info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Having problems? Contact us at:<br />
            <a href="mailto:einar@black-knight.dev" className="text-blue-600 dark:text-blue-400 font-medium">
              einar@black-knight.dev
            </a>
          </p>
        </div>

        {/* Confirm button */}
        <Button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 font-semibold"
        >
          I understand
        </Button>
      </div>
    </div>
  );
}

export function AuthScreen({ onSuccess, initialMode = "welcome", userEmail }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(userEmail || "");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Login failed");
        return;
      }

      if (result.data?.user) {
        // Clear pending verification on successful login
        localStorage.removeItem("saecretheaven_pending_verification");
        onSuccess({
          id: result.data.user.id,
          email: result.data.user.email,
          vaultKeyHash:
            (result.data.user as { vault_key_hash?: string }).vault_key_hash ||
            null,
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !accessCode) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Register the user - access code validation is enforced server-side in auth.ts
      const result = await signUp.email({
        email,
        password,
        name: email.split("@")[0], // Default name
        accessCode: accessCode, // Pass to server for validation
      } as any);

      if (result.error) {
        setError(result.error.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      // 3. Success! Store pending verification in localStorage and show modal
      localStorage.setItem("saecretheaven_pending_verification", email);
      setShowEmailModal(true);
    } catch (err) {
      console.error("Registration error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailModalClose = () => {
    setShowEmailModal(false);
    setMode("verification-sent");
  };

  const handleBackToWelcome = () => {
    // Clear pending verification when user explicitly goes back
    localStorage.removeItem("saecretheaven_pending_verification");
    setMode("welcome");
  };

  // Email check modal (shown immediately after registration)
  if (showEmailModal) {
    return (
      <div className="min-h-screen bg-[#FAFBFC]">
        <EmailCheckModal email={email} onClose={handleEmailModalClose} />
      </div>
    );
  }

  // Verification Sent Screen
  if (mode === "verification-sent") {
    return (
      <div className="min-h-screen flex flex-col px-6 pt-16 pb-8 safe-area-inset bg-[#FAFBFC]">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Success Icon */}
          <div className="relative w-24 h-24 mb-8 flex items-center justify-center bg-green-50 dark:bg-green-900/10 rounded-full shadow-lg shadow-green-500/10">
            <MailCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-3xl font-bold mb-3 tracking-tight text-gray-900 dark:text-white">
            Check your email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-[300px] mb-4 text-base">
            We sent a verification link to:
          </p>
          <p className="text-blue-600 dark:text-blue-400 font-semibold mb-8 text-lg">
            {email}
          </p>
          <p className="text-gray-500 dark:text-gray-500 max-w-[300px] mb-6 text-sm">
            Click the link in your email to verify your account. Then come back here to log in.
          </p>

          {/* Support info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-8 max-w-[300px] shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Having problems? Contact us at:<br />
              <a href="mailto:einar@black-knight.dev" className="text-blue-600 dark:text-blue-400 font-medium">
                einar@black-knight.dev
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => {
              localStorage.removeItem("saecretheaven_pending_verification");
              setMode("login");
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 text-lg font-semibold shadow-lg shadow-blue-500/20"
            size="lg"
          >
            Go to Login
          </Button>
          <Button
            onClick={handleBackToWelcome}
            variant="outline"
            className="w-full border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl h-14 text-lg font-semibold"
            size="lg"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (mode === "welcome") {
    return (
      <div className="min-h-screen flex flex-col px-6 pt-16 pb-8 safe-area-inset bg-[#FAFBFC]">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Logo */}
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/10 rounded-3xl shadow-lg shadow-blue-500/10 p-6">
            <img src="/logo.svg" alt="SaecretHeaven Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-4xl font-bold mb-3 tracking-tight text-gray-900 dark:text-white">SaecretHeaven</h1>
          <p className="text-blue-600 dark:text-blue-400 max-w-[280px] mb-12 text-lg">
            Secure your photos with Zero-Knowledge Encryption
          </p>

          {/* Features */}
          <div className="w-full max-w-[320px] space-y-4 mb-12">
            <FeatureItem icon="lock" text="End-to-End Encrypted" />
            <FeatureItem icon="smartphone" text="Multi-Device Sync" />
            <FeatureItem icon="cloud" text="Decentralized IPFS Backup" />
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => setMode("login")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 text-lg font-semibold shadow-lg shadow-blue-500/20"
            size="lg"
          >
            Log in
          </Button>
          
          <Button
             onClick={() => setMode("register")}
             variant="outline"
             className="w-full border-2 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl h-14 text-lg font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/10"
             size="lg"
          >
            Create Account
          </Button>
        </div>
      </div>
    );
  }

  // Login/Register Form
  const isRegister = mode === "register";

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 safe-area-inset bg-[#FAFBFC]">
      {/* Header */}
      <button
        onClick={() => setMode("welcome")}
        className="self-start text-blue-600 mb-8 ios-tap-target flex items-center gap-2 font-medium hover:underline"
      >
        ← Back
      </button>

      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-2 tracking-tight text-gray-900 dark:text-white">
          {isRegister ? "Create Account" : "Welcome back"}
        </h1>
        <p className="text-blue-600 dark:text-blue-400 mb-8 font-medium">
          {isRegister ? "Access invite-only" : "Log in to access your vault"}
        </p>

        {/* Form */}
        <div className="space-y-6">
          
          {isRegister && (
             <div className="space-y-2">
               <Label htmlFor="code" className="sr-only">Access Code</Label>
               <div className="relative">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                    <Key className="w-5 h-5 text-gray-400" />
                 </div>
                 <Input
                   id="code"
                   type="text"
                   autoCapitalize="characters"
                   value={accessCode}
                   onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                   placeholder="Access Code"
                   className="pl-12 h-14 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-lg shadow-sm font-mono tracking-wider"
                 />
               </div>
             </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="sr-only">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="pl-12 h-14 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-lg shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="sr-only">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="pl-12 pr-12 h-14 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-lg shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="relative py-4 px-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-center text-sm font-medium">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="space-y-4">
        <Button
          onClick={isRegister ? handleRegister : handleLogin}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 text-lg font-semibold shadow-lg shadow-blue-500/20"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            isRegister ? "Sign up for free" : "Log in"
          )}
        </Button>
      </div>

    </div>
  );
}


function FeatureItem({
  icon,
  text,
}: {
  icon: "lock" | "smartphone" | "cloud";
  text: string;
}) {
  return (
    <div className="relative group bg-white dark:bg-white/5 rounded-2xl p-1 shadow-sm border border-blue-100 dark:border-white/10">
      <div className="relative z-10 flex items-center gap-4 p-3">
        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
          <CustomIcon name={icon} size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <span className="text-base font-medium text-blue-900 dark:text-blue-100">{text}</span>
      </div>
    </div>
  );
}
