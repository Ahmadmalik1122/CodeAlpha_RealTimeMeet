import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import API from "../services/api";
import BrandMark from "../components/ui/BrandMark";
import AuroraBackdrop from "../components/ui/AuroraBackdrop";
import StatisticsCard from "../components/settings/StatisticsCard";

/**
 * Activity
 * Dedicated home for the "Your Activity" statistics that used to live
 * embedded inside Settings. Fetches the same /users/statistics endpoint
 * Settings.jsx used to call (server/controllers/preferencesController.js's
 * getStatistics — untouched) and renders the same StatisticsCard component,
 * so the numbers, the aggregation logic, and the four "not tracked yet"
 * tiles are all exactly what they were before, just on their own route.
 *
 * Feedback used to be rendered here too; it now lives on its own /feedback
 * route (see pages/Feedback.jsx) so this page is statistics-only.
 */
function Activity() {
  const navigate = useNavigate();

  const [statistics, setStatistics] = useState(null);
  const [unavailableStats, setUnavailableStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  // Fetches fresh statistics every time this page is opened (per-mount,
  // like every other data-loading effect in this app — Settings.jsx did
  // the same for this exact request).
  useEffect(() => {
    let cancelled = false;

    const loadStatistics = async () => {
      try {
        setStatsLoading(true);
        setStatsError("");
        const { data } = await API.get("/users/statistics");
        if (cancelled) return;
        setStatistics(data.statistics);
        setUnavailableStats(data.unavailable);
      } catch {
        if (!cancelled) setStatsError("Couldn't load your activity statistics.");
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    loadStatistics();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AuroraBackdrop />

      <div className="relative w-full max-w-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <BrandMark size="sm" />
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors focus-ring"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
        </div>

        <div className="mb-1 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Your Activity
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Track your RealTimeMeet activity and meeting usage.
          </p>
        </div>

        <StatisticsCard
          loading={statsLoading}
          error={statsError}
          statistics={statistics}
          unavailable={unavailableStats}
        />
      </div>
    </div>
  );
}

export default Activity;
