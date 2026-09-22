import React from 'react';
import { ExternalLink, Play, Tv, User, Calendar } from 'lucide-react';

interface YouTubeViewerProps {
  videoId: string;
  embedUrl: string;
  title?: string;
  author?: string;
  publishedAt?: string;
  originalUrl: string;
  sourceName?: string;
  inline?: boolean;
}

export const YouTubeViewer: React.FC<YouTubeViewerProps> = ({
  videoId,
  embedUrl,
  title,
  author,
  publishedAt,
  originalUrl,
  sourceName = 'YouTube',
  inline = false,
}) => {
  return (
    <div className={`w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col ${inline ? 'my-2' : ''}`}>
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
            <Tv className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-800">{sourceName}</span>
          <span className="text-[11px] text-slate-500 font-mono">ID: {videoId}</span>
        </div>
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 hover:text-orange-700 font-semibold flex items-center space-x-1 transition"
        >
          <span>Open on YouTube</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Embedded 16:9 Player */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        <iframe
          src={embedUrl}
          title={title || 'YouTube video player'}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* Video Details & Attribution */}
      <div className="p-4 space-y-2">
        {title && (
          <h4 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
            {title}
          </h4>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium pt-1">
          {author && (
            <div className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Channel: <strong className="text-slate-800">{author}</strong></span>
            </div>
          )}
          {publishedAt && (
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{publishedAt}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTubeViewer;
