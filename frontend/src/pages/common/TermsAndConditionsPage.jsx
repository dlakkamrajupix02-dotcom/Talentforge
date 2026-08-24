import { useEffect, useState } from "react";
import { getActiveTerms } from "../../services/termsService";
import { ShieldCheck, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TermsMarkdown from "../../components/common/TermsMarkdown";

export default function TermsAndConditionsPage() {
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const data = await getActiveTerms();
        setTerms(data);
      } catch (err) {
        setError("Could not load the Terms and Conditions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-300">
      <div className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-white/10 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Terms & Conditions</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Platform usage agreement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading terms...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-semibold">{error}</p>
          </div>
        )}

        {terms && !loading && (
          <TermsMarkdown content={terms.content} />
        )}
      </div>
    </div>
  );
}
