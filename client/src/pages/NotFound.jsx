import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative">
      <AuroraBackdrop />

      <div className="relative animate-scale-in">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        <p className="aurora-text font-display font-extrabold text-7xl sm:text-8xl mb-3">404</p>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white mb-2">
          This page doesn't exist
        </h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8">
          The link might be broken, or the page may have moved. Head back to
          your dashboard to start or join a meeting.
        </p>

        <Link to="/dashboard" className="btn-primary inline-flex px-6 py-3 rounded-xl text-sm">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
