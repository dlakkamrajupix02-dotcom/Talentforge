import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageCircleHeart, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import { dismissFeedbackPrompt, submitPlatformFeedback } from '../../services/feedbackService';

const STAR_LABELS = ['Needs work', 'Could be better', 'Good', 'Great', 'Love it'];

export default function FeedbackPulseModal({ open, prompt, trigger, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tip, setTip] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open || !prompt) return null;

  const displayRating = hoverRating || rating;

  const handleDismiss = async () => {
    try {
      await dismissFeedbackPrompt();
    } catch {
      /* snooze best-effort */
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (!rating && !tip.trim() && !comment.trim()) {
      toast.error('Pick a rating or share a quick tip');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await submitPlatformFeedback({
        rating: rating || null,
        tip: tip.trim() || null,
        comment: comment.trim() || null,
        trigger_context: { trigger, headline: prompt.headline },
      });
      toast.success(res?.message || 'Thanks for helping us improve!');
      onClose(true);
    } catch (error) {
      toast.error(error?.message || 'Could not send feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden"
            role="dialog"
            aria-labelledby="feedback-pulse-title"
          >
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="px-6 pt-6 pb-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold mb-3">
                <Sparkles size={12} /> 10-second pulse
              </div>
              <h2 id="feedback-pulse-title" className="text-lg font-bold text-slate-900 pr-8">
                {prompt.headline}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{prompt.subcopy}</p>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">How&apos;s TalentForge feeling?</p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= displayRating ? 'text-amber-400' : 'text-slate-200'
                    }`}
                    aria-label={`${star} star`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {displayRating > 0 && (
                <p className="text-xs text-indigo-600 font-medium mt-2">{STAR_LABELS[displayRating - 1]}</p>
              )}
            </div>

            <div className="px-6 pb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                <Lightbulb size={13} className="text-amber-500" /> One tip for us
              </label>
              <input
                type="text"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                placeholder="e.g. Faster template picker would save me time"
                maxLength={200}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
              />
            </div>

            <div className="px-6 pb-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                <MessageCircleHeart size={13} className="text-rose-400" /> Anything else? (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="What would make your next session smoother?"
                maxLength={500}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
              />
            </div>

            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition-colors"
              >
                {isSubmitting ? 'Sending…' : 'Send feedback'}
              </button>
            </div>

            <p className="px-6 pb-4 text-[10px] text-center text-slate-400">
              We won&apos;t ask again for a while · Your team won&apos;t see this
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
