import React, { useState } from 'react';
import { ExternalLink, User, Calendar, Clock, BookOpen, ShieldCheck, Newspaper } from 'lucide-react';

interface ArticleViewerProps {
  title: string;
  author?: string;
  publishedAt?: string;
  sourceName?: string;
  canonicalUrl: string;
  heroImage?: string;
  text: string;
  excerpt?: string;
  wordCount?: number;
  readingTimeMinutes?: number;
  sourceTier?: number;
  credibilityScore?: number;
  inline?: boolean;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({
  title,
  author,
  publishedAt,
  sourceName,
  canonicalUrl,
  heroImage,
  text,
  excerpt,
  wordCount,
  readingTimeMinutes = 2,
  sourceTier = 2,
  credibilityScore,
  inline = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // Format paragraphs from plain text
  const paragraphs = text
    ? text.split('\n\n').map((p) => p.trim()).filter((p) => p.length > 0)
    : excerpt ? [excerpt] : [];

  const getTierBadge = (tier: number = 2) => {
    switch (tier) {
      case 1:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Tier 1 Institutional</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Tier 2 Mainstream</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Tier 3 Regional</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Tier 4 Unverified</span>;
    }
  };

  return (
    <article className={`w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col ${inline ? 'my-2' : ''}`}>
      {/* Article Header & Metadata */}
      <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Newspaper className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-900 text-xs">{sourceName || 'News Article'}</span>
            {getTierBadge(sourceTier)}
          </div>
          {credibilityScore !== undefined && (
            <div className="flex items-center space-x-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Trust: {Math.round(credibilityScore * 100)}%</span>
            </div>
          )}
        </div>

        <h2 className="text-base md:text-xl font-extrabold text-slate-900 leading-snug">
          {title}
        </h2>

        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
          {author && (
            <div className="flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>By <strong className="text-slate-700">{author}</strong></span>
            </div>
          )}
          {publishedAt && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{publishedAt}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{readingTimeMinutes} min read {wordCount ? `(${wordCount} words)` : ''}</span>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      {heroImage && !imageError && (
        <div className="w-full max-h-72 overflow-hidden bg-slate-100 border-b border-slate-100 flex items-center justify-center">
          <img
            src={heroImage}
            alt={title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover max-h-72"
            loading="lazy"
          />
        </div>
      )}

      {/* Article Body Content */}
      <div className="p-5 md:p-6 space-y-4 text-slate-800 text-sm md:text-base leading-relaxed font-normal">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <p key={idx} className="text-justify md:text-left">
              {para}
            </p>
          ))
        ) : (
          <p className="text-slate-500 italic">Full article text is unavailable for direct preview.</p>
        )}
      </div>

      {/* Footer & Provenance Link */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-500 truncate max-w-sm">
          <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate font-mono">{canonicalUrl}</span>
        </div>
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1.5 transition shadow-sm flex-shrink-0"
        >
          <span>Open Original Article</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
};

export default ArticleViewer;
