import { Link, useLocation } from "react-router-dom";
import { MailQuestion } from "lucide-react";

import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";
import ResendVerificationForm from "../components/auth/ResendVerificationForm";

/**
 * ResendVerification — /resend-verification
 *
 * Standalone page for the user who closed the "check your inbox" screen, or
 * whose link expired days ago and no longer has it to click. Accepts an
 * optional `email` in router state so the Register and Login pages can hand
 * the address over without the user retyping it.
 */
function ResendVerification() {
  const location = useLocation();
  const prefilledEmail = location.state?.email || "";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-md glass-panel-strong rounded-3xl p-8 sm:p-10 shadow-2xl animate-scale-in">
        <div className="mb-8">
          <BrandMark />
        </div>

        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25 flex items-center justify-center mx-auto mb-5">
            <MailQuestion size={26} className="text-indigo-300" />
          </div>
          <h1 className="text-xl font-display font-bold text-white mb-1.5">
            Resend verification email
          </h1>
          <p className="text-slate-400 text-sm">
            Enter the email you signed up with and we'll send a fresh
            verification link. Any earlier link will stop working.
          </p>
        </div>

        <ResendVerificationForm initialEmail={prefilledEmail} />

        <p className="text-center text-slate-400 text-sm mt-6">
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResendVerification;
