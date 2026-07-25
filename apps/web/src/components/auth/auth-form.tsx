"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Mail,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  adminSignIn,
  customerSignIn,
  customerSignUp
} from "@/app/auth-actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { customerAuthHref } from "@/lib/auth-redirect";

type AuthMode = "sign-in" | "sign-up";
type AuthAudience = "customer" | "admin";

const errorMessages: Record<string, string> = {
  "account-exists":
    "An account already exists for that email address. Sign in instead.",
  "check-details": "Please review the highlighted details and try again.",
  "invalid-credentials":
    "The email address or password is incorrect. Check both and try again.",
  "password-requirements":
    "Use at least eight characters with at least one letter and one number.",
  "passwords-differ": "The two passwords do not match.",
  "phone-invalid": "Enter a valid phone number, such as +254 712 345 678.",
  "terms-required":
    "You must agree to the Terms of Use and Privacy Policy to create an account.",
  "staff-account":
    "This is a staff account. Use the separate Talomart admin sign-in portal.",
  "staff-only":
    "That account is a customer account. Use a staff or administrator account for this portal."
};

function destinationMessage(destination: string) {
  if (destination.startsWith("/checkout")) return "You will return to checkout.";
  if (destination.startsWith("/cart")) return "You will return to your cart.";
  if (destination.startsWith("/products/")) return "You will return to this product.";
  if (destination.startsWith("/wishlist")) return "You will return to your wishlist.";
  return "Your Talomart account will be ready when you continue.";
}

function PasswordField({
  name,
  label,
  autoComplete,
  visible,
  onToggle,
  onChange
}: {
  name: "password" | "confirmPassword";
  label: string;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
  onToggle: () => void;
  onChange?: ((value: string) => void) | undefined;
}) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <span className="auth-input-shell">
        <LockKeyhole aria-hidden="true" />
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={onToggle}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </span>
    </label>
  );
}

function AdminAuthForm({ error }: { error?: string | undefined }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      action={adminSignIn}
      className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8"
    >
      <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
        STAFF ACCESS
      </span>
      <h1 className="font-brand mt-3 text-3xl font-extrabold">Admin sign in</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        This secure portal is only for approved Talomart staff and administrators.
      </p>

      <div className="mt-5 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-green)]" />
        <p>Staff accounts are issued internally and remain separate from customer accounts.</p>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="auth-field">
          <span>Email address</span>
          <span className="auth-input-shell">
            <Mail aria-hidden="true" />
            <input name="email" type="email" autoComplete="email" required />
          </span>
        </label>
        <PasswordField
          name="password"
          label="Password"
          autoComplete="current-password"
          visible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
        />
      </div>

      {error && <AuthError error={error} />}

      <AuthSubmitButton label="Sign in to admin" pendingLabel="Opening admin…" />

      <p className="mt-5 text-center text-sm text-slate-500">
        Customer account?{" "}
        <Link href="/sign-in" className="font-extrabold text-[var(--color-green)]">
          Go to customer sign in
        </Link>
      </p>
    </form>
  );
}

function AuthError({ error }: { error: string }) {
  return (
    <div
      className="mt-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700"
      role="alert"
      aria-live="polite"
    >
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
      <p>{errorMessages[error] ?? "Authentication failed. Please try again."}</p>
    </div>
  );
}

export function AuthForm({
  mode,
  audience = "customer",
  error,
  destination = "/account"
}: {
  mode: AuthMode;
  audience?: AuthAudience | undefined;
  error?: string | undefined;
  destination?: string | undefined;
}) {
  const isSignUp = mode === "sign-up";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [password, setPassword] = useState("");

  if (audience === "admin") return <AdminAuthForm error={error} />;

  const action = isSignUp ? customerSignUp : customerSignIn;
  const alternateHref = customerAuthHref(
    isSignUp ? "/sign-in" : "/sign-up",
    destination
  );
  const guestDestination = destination === "/account" ? "/products" : destination;
  const passwordChecks = [
    { label: "8+ characters", passed: password.length >= 8 },
    { label: "One letter", passed: /[A-Za-z]/.test(password) },
    { label: "One number", passed: /[0-9]/.test(password) }
  ];
  const benefits = isSignUp
    ? [
        { icon: ShoppingBag, title: "Faster checkout", body: "Reuse your account details on future orders." },
        { icon: Heart, title: "Keep every favourite", body: "Your guest wishlist merges into your new account." },
        { icon: PackageCheck, title: "Orders in one place", body: "Follow purchases and delivery progress easily." }
      ]
    : [
        { icon: ShoppingBag, title: "Resume shopping", body: "Your current cart remains exactly where you left it." },
        { icon: PackageCheck, title: "Track every order", body: "See payment and delivery progress from your account." },
        { icon: Heart, title: "Sync your wishlist", body: "Access saved products across your signed-in sessions." }
      ];

  return (
    <div className="auth-experience">
      <aside className="auth-story-panel">
        <div>
          <span className="auth-story-kicker">
            <Sparkles /> TALOMART CUSTOMER
          </span>
          <h2>{isSignUp ? "One account. A smoother way to shop." : "Welcome back to smarter shopping."}</h2>
          <p>
            {isSignUp
              ? "Create your account without interrupting what you came to buy."
              : "Continue your Talomart journey with your cart, wishlist and orders connected."}
          </p>
        </div>

        <div className="auth-benefit-list">
          {benefits.map((benefit) => (
            <div key={benefit.title}>
              <span><benefit.icon /></span>
              <p><strong>{benefit.title}</strong><small>{benefit.body}</small></p>
            </div>
          ))}
        </div>

        <div className="auth-trust-note">
          <ShieldCheck />
          <span><strong>Private by design</strong><small>Secure sessions and protected customer details.</small></span>
        </div>
      </aside>

      <form action={action} className="auth-customer-form">
        <input type="hidden" name="next" value={destination} />

        <div className="auth-form-heading">
          <span>{isSignUp ? "CREATE ACCOUNT" : "WELCOME BACK"}</span>
          <h1>{isSignUp ? "Create your Talomart account" : "Sign in to Talomart"}</h1>
          <p>
            {isSignUp
              ? "A few essentials now, then you can continue shopping."
              : "Use your customer email and password to continue."}
          </p>
        </div>

        {destination !== "/account" && (
          <div className="auth-return-notice">
            <CheckCircle2 />
            <span>{destinationMessage(destination)}</span>
          </div>
        )}

        <div className={`auth-fields ${isSignUp ? "auth-fields-signup" : ""}`}>
          {isSignUp && (
            <>
              <label className="auth-field">
                <span>Full name</span>
                <span className="auth-input-shell">
                  <UserRound aria-hidden="true" />
                  <input name="name" autoComplete="name" required minLength={2} />
                </span>
              </label>
              <label className="auth-field">
                <span>Phone number</span>
                <span className="auth-input-shell">
                  <Phone aria-hidden="true" />
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+254 712 345 678"
                    required
                  />
                </span>
              </label>
            </>
          )}

          <label className={`auth-field ${isSignUp ? "auth-field-wide" : ""}`}>
            <span>Email address</span>
            <span className="auth-input-shell">
              <Mail aria-hidden="true" />
              <input name="email" type="email" autoComplete="email" required />
            </span>
          </label>

          <PasswordField
            name="password"
            label="Password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            visible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            onChange={isSignUp ? setPassword : undefined}
          />

          {isSignUp && (
            <PasswordField
              name="confirmPassword"
              label="Confirm password"
              autoComplete="new-password"
              visible={showConfirmation}
              onToggle={() => setShowConfirmation((current) => !current)}
            />
          )}
        </div>

        {isSignUp ? (
          <>
            <div className="auth-password-rules" aria-label="Password requirements">
              {passwordChecks.map((check) => (
                <span className={check.passed ? "passed" : ""} key={check.label}>
                  <Check /> {check.label}
                </span>
              ))}
            </div>

            <div className="auth-consents">
              <label>
                <input type="checkbox" name="acceptedTerms" required />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noreferrer">Terms of Use</Link>
                  {" "}and{" "}
                  <Link href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link>.
                  <strong> Required</strong>
                </span>
              </label>
              <label>
                <input type="checkbox" name="marketingConsent" />
                <span>
                  Send me occasional Talomart offers and product updates by email or SMS.
                  <small> Optional—you can change this preference later.</small>
                </span>
              </label>
            </div>
          </>
        ) : (
          <div className="auth-form-options">
            <label><input type="checkbox" name="rememberMe" defaultChecked /> Keep me signed in</label>
            <span>Secure customer access</span>
          </div>
        )}

        {error && <AuthError error={error} />}

        <AuthSubmitButton
          label={isSignUp ? "Create account" : "Sign in securely"}
          pendingLabel={isSignUp ? "Creating your account…" : "Signing you in…"}
        />

        <p className="auth-alternate">
          {isSignUp ? "Already have an account?" : "New to Talomart?"}{" "}
          <Link href={alternateHref}>{isSignUp ? "Sign in" : "Create account"}</Link>
        </p>

        <div className="auth-divider"><span>or</span></div>

        <Link href={guestDestination} className="auth-guest-button">
          Continue as guest <ArrowRight />
        </Link>
      </form>
    </div>
  );
}
