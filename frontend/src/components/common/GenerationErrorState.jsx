import React, { useEffect, useState, useContext, useRef } from "react";
import { 
  AlertCircle, 
  LayoutTemplate, 
  ArrowRight, 
  RefreshCw,
  Search,
  Sparkles,
  Plus
} from "lucide-react";
import { getTemplates } from "../../services/templateService";
import { useNavigate } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import TemplateCard from "../../components/Admin/TemplateCard";
import MorphingCard from "../../components/common/MorphingCard";

export default function GenerationErrorState({ onRetry, formData }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [animatingCard, setAnimatingCard] = useState(null);
  const { user } = useContext(JDContext);
  const navigate = useNavigate();
  const cardRefs = useRef({});

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getTemplates({ page: 1, limit: 6 });
        setTemplates((data.templates || []).slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch templates for error state:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handlePreview = (template, cardElement) => {
    const rect = cardElement.getBoundingClientRect();
    setAnimatingCard({
      template,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    });
    
    setTimeout(() => {
      setPreviewTemplate(template);
    }, 50);
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
    setTimeout(() => {
      setAnimatingCard(null);
    }, 300);
  };

  const handleUseTemplate = (template) => {
    const normalizedJD = {
      title: template.title,
      industry: template.industry,
      region: template.region,
      ...template.content,
      id: template.id
    };
    
    const role = user?.role?.toLowerCase() || "";
    const path = role.includes("hr") ? `/hr/generate/${template.id}` : `/admin/generate/${template.id}`;
    
    navigate(path, { state: { jd: normalizedJD } });

  };

  const handleGoToTemplates = () => {
    const role = user?.role?.toLowerCase() || "";
    const path = role.includes("hr") ? "/hr/templates" : "/admin/templates";
    navigate(path);
  };

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      {/* Error Message Section */}
      <div className="max-w-3xl mx-auto w-full mb-12 text-center">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-100 dark:border-rose-500/20">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-tight">
          AI Generation is taking a breather...
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-xl mx-auto">
          We're currently experiencing high demand or technical hiccups with our AI engine. 
          Don't let it slow you down—you can try again or jump-start your JD with one of our high-quality templates below.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onRetry(formData)}
            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-[0.20em] flex items-center gap-3 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            Retry AI Generation
          </button>
          <button
            onClick={handleGoToTemplates}
            className="px-8 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[11px] uppercase tracking-[0.20em] flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            <LayoutTemplate size={16} />
            Explore Template Library
          </button>
        </div>
      </div>

      {/* Templates Section */}
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Popular Starting Points
            </h3>
          </div>
          <button 
            onClick={handleGoToTemplates}
            className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
          >
            See All Templates <ArrowRight size={14} />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 dark:bg-white/5 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                ref={el => cardRefs.current[template.id] = el}
                template={template}
                onPreview={(tpl, el) => handlePreview(tpl, el)}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {previewTemplate && animatingCard && (
        <MorphingCard 
          cardData={animatingCard}
          onClose={handleClosePreview}
          onUse={handleUseTemplate}
        />
      )}
    </div>
  );
}
