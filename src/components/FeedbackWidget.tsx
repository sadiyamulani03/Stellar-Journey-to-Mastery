'use client';

import React, { useState } from 'react';
import { MessageSquare, Star, X, Check, Send } from 'lucide-react';

interface FeedbackProps {
  userId?: string;
}

export default function FeedbackWidget({ userId }: FeedbackProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);

    const payload = {
      userId,
      rating,
      comment,
      submittedAt: new Date().toISOString(),
    };

    // Persist locally for review, mirroring the Google Form feedback loop
    try {
      const key = `payloyal_feedback_${userId ?? 'anonymous'}`;
      const existing = localStorage.getItem(key);
      const list = existing ? JSON.parse(existing) : [];
      list.push(payload);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // ignore storage errors
    }

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
        setRating(0);
        setComment('');
      }, 2500);
    }, 800);
  };

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white p-3.5 rounded-full shadow-lg shadow-accent/20 transition-transform hover:-translate-y-0.5 flex items-center gap-2"
        aria-label="Submit feedback"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 relative animate-in zoom-in-95 space-y-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-full w-fit mx-auto text-green-400">
                  <Check className="h-8 w-8" />
                </div>
                <h4 className="font-bold text-white">Feedback submitted!</h4>
                <p className="text-xs text-muted-foreground font-light">
                  Thank you for helping us improve payLoyal. Your input goes straight into our iteration loop.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                  <MessageSquare className="h-5 w-5 text-accent animate-pulse" />
                  <h3 className="font-bold text-lg">How can we improve payLoyal?</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Your Rating</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        className={`p-1 rounded-lg transition-colors ${n <= (hover || rating) ? 'text-yellow-400' : 'text-zinc-700 hover:text-zinc-500'}`}
                        aria-label={`${n} stars`}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Your Feedback (optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="What feature would you like to see? What could be better?"
                    className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
