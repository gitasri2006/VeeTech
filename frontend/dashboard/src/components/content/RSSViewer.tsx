import React from 'react';
import { ExternalLink, Rss, Calendar, User, BookOpen } from 'lucide-react';

interface RSSViewerProps {
  title: string;
  link: string;
  description?: string;
  publishedAt?: string;
  sourceName?: string;
  author?: string;
  imageUrl?: string;
  inline?: boolean;
}

export const RSSViewer: React.FC<RSSViewerProps> = ({
  title,
  link,
  description,
  publishedAt,
  sourceName,
  author,
  imageUrl,
  inline = false,
}) => {
  return (
    <div className={`w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col ${inline ? 'my-2' : ''}`}>
      {/* Header */}
      <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
            <Rss className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-800">{sourceName || 'RSS Feed'}</span>
        </div>
        {publishedAt && (
          <div className="flex items-center space-x-1 text-slate-500 font-medium">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{publishedAt}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-900 leading-snug">
          {title}
        </h3>

        {imageUrl && (
          <div className="w-full max-h-48 overflow-hidden rounded-xl bg-slate-100">
            <img src={imageUrl} alt={title} className="w-full h-full object-cover max-h-48" loading="lazy" />
          </div>
        )}

        {description && (
          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            {description}
          </p>
        )}

        {author && (
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium pt-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Feed Author: <strong className="text-slate-700">{author}</strong></span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-slate-500 truncate max-w-sm font-mono">{link}</span>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center space-x-1.5 transition shadow-sm"
        >
          <span>Open Feed Item</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default RSSViewer;
