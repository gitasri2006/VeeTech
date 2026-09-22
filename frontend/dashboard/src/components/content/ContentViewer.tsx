import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle, X, ShieldAlert, BookOpen, Film } from 'lucide-react';
import { YouTubeViewer } from './YouTubeViewer';
import { ArticleViewer } from './ArticleViewer';
import { RSSViewer } from './RSSViewer';

export interface ContentViewerProps {
  url: string;
  title?: string;
  snippet?: string;
  source?: string;
  sourceTier?: number;
  credibilityScore?: number;
  inline?: boolean;
  onClose?: () => void;
}

interface PreviewState {
  loading: boolean;
  error: string | null;
  data: any | null;
}

// Client-side quick cache to prevent refetching during session
const previewClientCache = new Map<string, any>();

export const ContentViewer: React.FC<ContentViewerProps> = ({
  url,
  title,
  snippet,
  source,
  sourceTier = 2,
  credibilityScore,
  inline = false,
  onClose,
}) => {
  const [state, setState] = useState<PreviewState>(() => {
    if (previewClientCache.has(url)) {
      return { loading: false, error: null, data: previewClientCache.get(url) };
    }
    return { loading: true, error: null, data: null };
  });

  useEffect(() => {
    let isMounted = true;

    if (previewClientCache.has(url)) {
      setState({ loading: false, error: null, data: previewClientCache.get(url) });
      return;
    }

    setState({ loading: true, error: null, data: null });

    const params = new URLSearchParams({
      url,
      ...(title ? { title } : {}),
      ...(snippet ? { snippet } : {}),
      ...(source ? { source } : {}),
    });

    fetch(`/api/content/preview?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          previewClientCache.set(url, json);
          setState({ loading: false, error: null, data: json });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setState({
            loading: false,
            error: err.message || 'Failed to fetch content preview.',
            data: null,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url, title, snippet, source]);

  const renderContent = () => {
    // 1. Loading State
    if (state.loading) {
      const isYt = url.includes('youtube.com') || url.includes('youtu.be');
      return (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3 text-center my-2 shadow-sm">
          <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {isYt ? 'Initializing YouTube Player...' : 'Extracting Clean Article Content...'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Removing advertisements, tracking scripts, and normalizing layout
            </p>
          </div>
        </div>
      );
    }

    // 2. Success - YouTube
    if (state.data?.content_type === 'youtube' && state.data?.youtube) {
      const yt = state.data.youtube;
      return (
        <YouTubeViewer
          videoId={yt.video_id}
          embedUrl={yt.embed_url}
          title={yt.title || title}
          author={yt.author}
          publishedAt={yt.published_at}
          originalUrl={url}
          sourceName={state.data.source_name || source || 'YouTube'}
          inline={inline}
        />
      );
    }

    // 3. Success - News Article
    if (state.data?.content_type === 'article' && state.data?.article) {
      const art = state.data.article;
      return (
        <ArticleViewer
          title={art.title || title || 'News Article'}
          author={art.author}
          publishedAt={art.published_at}
          sourceName={state.data.source_name || art.source_name || source}
          canonicalUrl={art.canonical_url || url}
          heroImage={art.hero_image}
          text={art.text}
          excerpt={art.excerpt || snippet}
          wordCount={art.word_count}
          readingTimeMinutes={art.reading_time_minutes}
          sourceTier={sourceTier}
          credibilityScore={credibilityScore}
          inline={inline}
        />
      );
    }

    // 4. Success - RSS Feed
    if (state.data?.content_type === 'rss' && state.data?.rss) {
      const r = state.data.rss;
      return (
        <RSSViewer
          title={r.title || title || 'RSS Feed Item'}
          link={r.link || url}
          description={r.description || snippet}
          publishedAt={r.published_at}
          sourceName={state.data.source_name || r.source_name || source}
          author={r.author}
          imageUrl={r.image_url}
          inline={inline}
        />
      );
    }

    // 5. Fallback - Safe Source Card View
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm my-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {source || 'External Source'}
            </span>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {title || 'Discovered Source'}
            </h3>
          </div>
        </div>

        {snippet && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed font-medium">
            <p>{snippet}</p>
          </div>
        )}

        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>Direct in-app reader preview is unavailable for this publisher. You can view the original article directly:</span>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-500 truncate max-w-sm font-mono">{url}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <span>Open Original Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  };

  // If in modal mode with an onClose callback
  if (onClose && !inline) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
          {/* Modal Close Header */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold">
              <BookOpen className="w-4 h-4 text-orange-600" />
              <span>In-App Discovery Reader</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition cursor-pointer"
              title="Close reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-60px)] custom-scrollbar">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  return renderContent();
};

export default ContentViewer;
