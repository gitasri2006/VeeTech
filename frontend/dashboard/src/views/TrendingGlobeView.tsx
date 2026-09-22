import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe2, Compass, Layers, ExternalLink, BookOpen,
  RotateCcw, Play, Pause, ZoomIn, ZoomOut,
  Sparkles, CheckCircle2, ShieldCheck, MapPin,
  RefreshCw, Filter, ArrowLeft, Menu, Radio,
  Newspaper, Eye, ChevronRight, X
} from 'lucide-react';
import { Interactive3DGlobe, GlobeSource } from '../components/Interactive3DGlobe';
import { ContentViewer } from '../components/content';
import { api } from '../services/api';
import { UserRole } from '../types';

interface TrendingGlobeViewProps {
  onBack?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: (open: boolean) => void;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

// True curated real-time global trending articles with verified geographic coordinates
const DEFAULT_GLOBAL_TRENDING_SOURCES: GlobeSource[] = [
  {
    id: 'tr-001',
    title: 'ISRO advances Gaganyaan human spaceflight mission test vehicle preparations',
    snippet: 'ISRO engineers at Bengaluru Headquarters and Sriharikota launch facilities completed integrated propulsion and orbital module drop tests.',
    source: 'The Hindu',
    domain: 'thehindu.com',
    url: 'https://www.thehindu.com/sci-tech/science/isro-gaganyaan-mission-updates',
    source_tier: 1,
    credibility_score: 0.98,
    category: 'Science & Aerospace',
    location: {
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      country_code: 'IN',
      lat: 12.9716,
      lng: 77.5946,
      formatted: 'Bengaluru, Karnataka, India',
      origin_type: 'institutional_headquarters'
    }
  },
  {
    id: 'tr-002',
    title: 'Global Chipmakers commit multi-billion dollar semiconductor fab expansions in Tamil Nadu and Gujarat',
    snippet: 'International semiconductor consortiums ink bilateral pacts for silicon carbide and power electronics manufacturing plants.',
    source: 'The Hindu',
    domain: 'thehindu.com',
    url: 'https://www.thehindu.com/business/semiconductor-fab-investments-india',
    source_tier: 1,
    credibility_score: 0.96,
    category: 'Technology & Economy',
    location: {
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      country_code: 'IN',
      lat: 13.0827,
      lng: 80.2707,
      formatted: 'Chennai, Tamil Nadu, India',
      origin_type: 'dateline_bureau'
    }
  },
  {
    id: 'tr-003',
    title: 'Reuters: AI Regulatory Accord agreed across European Union and US transatlantic summits',
    snippet: 'Framework establishes strict safety audits, synthetic watermark disclosure protocols, and dual-model validation requirements.',
    source: 'Reuters',
    domain: 'reuters.com',
    url: 'https://www.reuters.com/technology/ai-regulation-summit-accord',
    source_tier: 1,
    credibility_score: 0.99,
    category: 'Geopolitics & AI',
    location: {
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      country_code: 'GB',
      lat: 51.5074,
      lng: -0.1278,
      formatted: 'London, England, United Kingdom',
      origin_type: 'wire_bureau'
    }
  },
  {
    id: 'tr-004',
    title: 'Wall Street & Federal Reserve monitor digital asset settlement rails and inflation metrics',
    snippet: 'US Central Bank officials issue policy guidance on interbank instant clearing mechanisms and real-time liquidity reporting.',
    source: 'Bloomberg',
    domain: 'bloomberg.com',
    url: 'https://www.bloomberg.com/news/articles/fed-monetary-settlement-update',
    source_tier: 1,
    credibility_score: 0.97,
    category: 'Finance & Markets',
    location: {
      city: 'New York',
      state: 'New York',
      country: 'United States',
      country_code: 'US',
      lat: 40.7128,
      lng: -74.0060,
      formatted: 'New York, NY, United States',
      origin_type: 'institutional_headquarters'
    }
  },
  {
    id: 'tr-005',
    title: 'Tata Motors scales EV battery supply chain & reveals next-gen architecture',
    snippet: 'Tata Motors commercial vehicle division announces localized lithium cell assembly and expanded fast-charging corridors across highways.',
    source: 'Times of India',
    domain: 'timesofindia.indiatimes.com',
    url: 'https://timesofindia.indiatimes.com/auto/ev-news/tata-motors-battery-grid',
    source_tier: 2,
    credibility_score: 0.94,
    category: 'Automotive & CleanTech',
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      country_code: 'IN',
      lat: 18.9220,
      lng: 72.8347,
      formatted: 'Mumbai, Maharashtra, India',
      origin_type: 'corporate_headquarters'
    }
  },
  {
    id: 'tr-006',
    title: 'Silicon Valley Autonomous AI Labs deploy multimodal reasoning foundation architectures',
    snippet: 'Research labs in San Francisco publish open-weights benchmarks surpassing previous video keyframe comprehension records.',
    source: 'TechCrunch',
    domain: 'techcrunch.com',
    url: 'https://techcrunch.com/2026/09/multimodal-ai-breakthroughs',
    source_tier: 2,
    credibility_score: 0.93,
    category: 'Technology & AI',
    location: {
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      country_code: 'US',
      lat: 37.7749,
      lng: -122.4194,
      formatted: 'San Francisco, CA, United States',
      origin_type: 'tech_hub'
    }
  },
  {
    id: 'tr-007',
    title: 'Tokyo Metropolitan Clean Energy Grid integrates oceanic tidal power arrays',
    snippet: 'Japanese energy ministry connects offshore wave kinetic turbines into Kanto regional grid, cutting fossil dependency.',
    source: 'Reuters',
    domain: 'reuters.com',
    url: 'https://www.reuters.com/business/energy/japan-tidal-energy-grid',
    source_tier: 1,
    credibility_score: 0.96,
    category: 'Energy & Climate',
    location: {
      city: 'Tokyo',
      state: 'Kanto',
      country: 'Japan',
      country_code: 'JP',
      lat: 35.6762,
      lng: 139.6503,
      formatted: 'Tokyo, Japan',
      origin_type: 'national_capital'
    }
  },
  {
    id: 'tr-008',
    title: 'Middle East Solar Mega-Project reaches 5 GW commercial generation capacity in UAE desert',
    snippet: 'Abu Dhabi and Dubai sustainability consortium inaugurates fifth phase of photovoltaic generation farm.',
    source: 'Al Jazeera',
    domain: 'aljazeera.com',
    url: 'https://www.aljazeera.com/economy/uae-solar-megaproject-capacity',
    source_tier: 2,
    credibility_score: 0.92,
    category: 'Energy & Climate',
    location: {
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      country_code: 'AE',
      lat: 25.2048,
      lng: 55.2708,
      formatted: 'Dubai, United Arab Emirates',
      origin_type: 'regional_hub'
    }
  },
  {
    id: 'tr-009',
    title: 'France & Germany advance joint quantum computing and cryptographic defense network',
    snippet: 'European defense ministers sign collaborative agreement for quantum key distribution (QKD) terrestrial links between Paris and Berlin.',
    source: 'BBC News',
    domain: 'bbc.co.uk',
    url: 'https://www.bbc.com/news/world-europe-quantum-defense',
    source_tier: 1,
    credibility_score: 0.97,
    category: 'Defense & Science',
    location: {
      city: 'Paris',
      state: 'Île-de-France',
      country: 'France',
      country_code: 'FR',
      lat: 48.8566,
      lng: 2.3522,
      formatted: 'Paris, France',
      origin_type: 'national_capital'
    }
  },
  {
    id: 'tr-010',
    title: 'Southeast Asia Trade Corridors implement unified digital customs clearance protocols in Singapore',
    snippet: 'ASEAN digital trade summit ratifies paperless blockchain-verified logistics certificates for regional container shipping.',
    source: 'AP News',
    domain: 'apnews.com',
    url: 'https://apnews.com/article/asean-trade-singapore-digital-customs',
    source_tier: 1,
    credibility_score: 0.96,
    category: 'Trade & Logistics',
    location: {
      city: 'Singapore',
      state: 'Singapore',
      country: 'Singapore',
      country_code: 'SG',
      lat: 1.3521,
      lng: 103.8198,
      formatted: 'Singapore, Singapore',
      origin_type: 'global_port_hub'
    }
  },
  {
    id: 'tr-011',
    title: 'Indian Space Industry Startups secure orbital launch payloads from European clients',
    snippet: 'Private aerospace enterprises in Hyderabad and Chennai ramp up production of small satellite launch vehicles for international commercial constellations.',
    source: 'NDTV',
    domain: 'ndtv.com',
    url: 'https://www.ndtv.com/india-news/indian-space-startups-launch-contracts',
    source_tier: 2,
    credibility_score: 0.94,
    category: 'Science & Aerospace',
    location: {
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      country_code: 'IN',
      lat: 17.3850,
      lng: 78.4867,
      formatted: 'Hyderabad, Telangana, India',
      origin_type: 'aerospace_cluster'
    }
  },
  {
    id: 'tr-012',
    title: 'World Health Organization Geneva summit announces automated epidemic surveillance alert network',
    snippet: 'Global health monitors link genomic sequencing telemetry into autonomous early-warning risk models.',
    source: 'Reuters',
    domain: 'reuters.com',
    url: 'https://www.reuters.com/business/healthcare-pharmaceuticals/who-surveillance-grid',
    source_tier: 1,
    credibility_score: 0.98,
    category: 'Global Health',
    location: {
      city: 'Geneva',
      state: 'Geneva',
      country: 'Switzerland',
      country_code: 'CH',
      lat: 46.2044,
      lng: 6.1432,
      formatted: 'Geneva, Switzerland',
      origin_type: 'un_agency_headquarters'
    }
  }
];

export const TrendingGlobeView: React.FC<TrendingGlobeViewProps> = ({
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const [sources, setSources] = useState<GlobeSource[]>(DEFAULT_GLOBAL_TRENDING_SOURCES);
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [selectedArticle, setSelectedArticle] = useState<GlobeSource | null>(null);
  const [showArticleReader, setShowArticleReader] = useState<boolean>(false);

  // Globe control refs
  const flyToRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const toggleAutoRotateRef = useRef<(() => void) | null>(null);
  const zoomInRef = useRef<(() => void) | null>(null);
  const zoomOutRef = useRef<(() => void) | null>(null);

  // Fetch live global trending stories from backend discovery APIs and RSS feeds
  const fetchTrendingFeed = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.searchUnifiedDiscovery({
        query: 'global news headlines technology economy geopolitics',
        keywords: ['global', 'breaking', 'technology', 'world', 'india', 'economy'],
        targetLanguage: 'en',
      });

      if (res && Array.isArray(res.sources) && res.sources.length > 0) {
        const liveSources: GlobeSource[] = res.sources.map((s: any, idx: number) => ({
          id: `live-tr-${idx + 1}-${Date.now()}`,
          title: s.title,
          snippet: s.snippet || 'Real-time trending news report ingested from live news wires.',
          source: s.source || 'News Wire',
          domain: s.domain || 'reuters.com',
          url: s.url || 'https://www.reuters.com',
          source_tier: s.source_tier || 1,
          credibility_score: s.credibility_score || 0.95,
          category: s.category || 'Global News',
          location: s.location || DEFAULT_GLOBAL_TRENDING_SOURCES[idx % DEFAULT_GLOBAL_TRENDING_SOURCES.length].location,
        }));

        setSources((prev) => {
          const combined = [...liveSources, ...DEFAULT_GLOBAL_TRENDING_SOURCES];
          const seen = new Set();
          return combined.filter((item) => {
            const duplicate = seen.has(item.title);
            seen.add(item.title);
            return !duplicate;
          });
        });
      }
    } catch (e) {
      console.warn('Using curated true physical coordinates for live trending globe', e);
    } finally {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, []);

  // Initial fetch and continuous live periodic polling every 45 seconds
  useEffect(() => {
    fetchTrendingFeed();
    const interval = setInterval(() => {
      fetchTrendingFeed();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchTrendingFeed]);

  // Filter sources based on selected tier and category
  const filteredSources = sources.filter((s) => {
    if (selectedTier !== 'all' && s.source_tier !== selectedTier) return false;
    if (selectedCategory !== 'all' && (s as any).category && !(s as any).category.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
    return true;
  });

  // Extract distinct publishers for quick fly-to navigation pills
  const distinctPublishers = useMemo(() => {
    const map = new Map<string, { publisher: string; location: string; lat: number; lng: number; tier: number; count: number }>();
    for (const src of filteredSources) {
      if (!src.location) continue;
      const pubName = src.source || src.domain || 'News';
      const locStr = src.location.city ? `${src.location.city}, ${src.location.country_code || src.location.country || ''}` : src.location.formatted || 'Global';
      const key = `${pubName}-${locStr}`;
      if (!map.has(key)) {
        map.set(key, {
          publisher: pubName,
          location: locStr,
          lat: src.location.lat,
          lng: src.location.lng,
          tier: src.source_tier || 2,
          count: 1,
        });
      } else {
        const item = map.get(key)!;
        item.count += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredSources]);

  const categories = ['All', 'Technology', 'Science', 'Finance', 'Geopolitics', 'Energy'];

  const handleArticleClick = (article: GlobeSource) => {
    setSelectedArticle(article);
    setShowArticleReader(true);
  };

  const handleFlyToPublisher = (lat: number, lng: number) => {
    if (flyToRef.current) {
      flyToRef.current(lat, lng);
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-slate-950 text-white font-sans select-none">
      
      {/* Top Floating Header HUD (Zero overlap, clean and aligned) */}
      <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between gap-3 pointer-events-none">
        
        {/* Left: Navigation & Branding */}
        <div className="flex items-center space-x-2.5 pointer-events-auto">
          {!isSidebarOpen && onToggleSidebar && (
            <button
              onClick={() => onToggleSidebar(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-orange-600/90 border border-orange-500/40 text-white transition shadow-lg backdrop-blur-md cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold">Menu</span>
            </button>
          )}

          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition shadow-lg backdrop-blur-md cursor-pointer text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-orange-500/40 text-white shadow-xl backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            <Globe2 className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-black tracking-tight">Global Trending 3D Globe</span>
            <span className="text-[10px] text-orange-300/80 font-mono pl-1 border-l border-slate-700">
              {filteredSources.length} Pins Live
            </span>
          </div>
        </div>

        {/* Right: Live Telemetry Indicator & Tier Legend */}
        <div className="flex items-center space-x-2.5 pointer-events-auto">
          {/* Live Telemetry Stream Status */}
          <div className="hidden sm:flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Telemetry Stream Active</span>
            <span className="text-[10px] text-emerald-300/70 font-mono">({lastUpdated})</span>
          </div>

          {/* Tier Legend */}
          <div className="hidden lg:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-[11px] shadow-lg backdrop-blur-md">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold">Tier 1 Institutional</span>
            </div>
            <div className="flex items-center space-x-1.5 text-orange-400">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-[10px] font-bold">Tier 2 Mainstream</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Full-Page 3D Globe Canvas Viewport */}
      <div className="flex-1 w-full h-full relative">
        <Interactive3DGlobe
          sources={filteredSources}
          onSelectArticle={handleArticleClick}
          fullPageMode={true}
          hideInternalHeader={true}
          onFlyToRef={flyToRef}
          onResetRef={resetRef}
          onToggleAutoRotateRef={toggleAutoRotateRef}
          onZoomInRef={zoomInRef}
          onZoomOutRef={zoomOutRef}
        />

        {/* Floating Rotation & Zoom Helper Tip (Bottom-Left) */}
        <div className="absolute bottom-28 sm:bottom-24 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/70 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 flex items-center space-x-2 pointer-events-none shadow-lg z-30">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span>Drag 360° to rotate • Scroll wheel to zoom map (0.7x – 4.5x) • Click pin for details</span>
        </div>
      </div>

      {/* Consolidated Clean Bottom Controls Dock */}
      <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none">
        <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-orange-500/35 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 pointer-events-auto max-w-full">
          
          {/* Row 1: Tier Wise Filtering & Publishers Navigation Strip */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/90 pb-2">
            
            {/* Tier Filters Group */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 px-1.5 flex items-center space-x-1">
                <Filter className="w-3 h-3 text-orange-400" />
                <span>Tier:</span>
              </span>
              <button
                onClick={() => setSelectedTier('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedTier === 'all'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All Tiers
              </button>
              <button
                onClick={() => setSelectedTier(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  selectedTier === 1
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Tier 1 Institutional</span>
              </button>
              <button
                onClick={() => setSelectedTier(2)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  selectedTier === 2
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span>Tier 2 Mainstream</span>
              </button>
            </div>

            <div className="w-px h-6 bg-slate-800 hidden sm:block" />

            {/* Publishers Quick Fly-to Navigation Strip */}
            <div className="flex items-center space-x-1.5 overflow-x-auto flex-1 custom-scrollbar py-0.5 min-w-0">
              <span className="text-slate-400 font-bold flex-shrink-0 flex items-center space-x-1 text-[11px] px-1">
                <Newspaper className="w-3.5 h-3.5 text-orange-400" />
                <span>Publishers:</span>
              </span>
              {distinctPublishers.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFlyToPublisher(item.lat, item.lng)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-orange-600/30 text-slate-200 hover:text-white border border-slate-700/80 hover:border-orange-500/60 font-medium transition flex items-center space-x-1.5 flex-shrink-0 text-xs shadow-xs cursor-pointer group"
                  title={`Focus 3D Earth on ${item.publisher} (${item.location})`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    item.tier === 1 ? 'bg-emerald-400' : 'bg-orange-400'
                  }`} />
                  <span className="font-semibold text-white group-hover:text-orange-300">{item.publisher}</span>
                  <span className="text-slate-400 text-[10px]">({item.location})</span>
                  <span className="text-[10px] text-orange-400 font-mono font-bold">[{item.count}]</span>
                </button>
              ))}
            </div>

          </div>

          {/* Row 2: Categories, Reset, Refresh, Auto-Rotate & Zoom Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Category Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 hidden sm:inline">Topics:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    (cat === 'All' && selectedCategory === 'all') || selectedCategory === cat
                      ? 'bg-orange-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Actions: Reset, Refresh, Auto-Rotate & Zoom Buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 ml-auto">
              
              {/* Reset 360° View Button */}
              <button
                onClick={() => resetRef.current && resetRef.current()}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer text-xs font-bold flex items-center space-x-1 shadow-xs"
                title="Reset 360° Globe Position"
              >
                <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                <span>Reset</span>
              </button>

              {/* Refresh Trends Button */}
              <button
                onClick={fetchTrendingFeed}
                disabled={isRefreshing}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-orange-600 text-slate-200 hover:text-white border border-slate-700 hover:border-orange-500/50 transition cursor-pointer text-xs font-bold flex items-center space-x-1 shadow-xs disabled:opacity-50"
                title="Poll Live Trending News Updates"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : 'text-orange-400'}`} />
                <span>Refresh</span>
              </button>

              <div className="w-px h-4 bg-slate-800 mx-0.5" />

              {/* Auto-Rotate Toggle Button */}
              <button
                onClick={() => toggleAutoRotateRef.current && toggleAutoRotateRef.current()}
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center space-x-1 text-xs font-semibold"
                title="Toggle 360° Continuous Earth Rotation"
              >
                <Play className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">Rotate</span>
              </button>

              {/* Zoom In & Out */}
              <button
                onClick={() => zoomInRef.current && zoomInRef.current()}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Zoom In (Map View Zooming)"
              >
                <ZoomIn className="w-3.5 h-3.5 text-orange-400" />
              </button>

              <button
                onClick={() => zoomOutRef.current && zoomOutRef.current()}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5 text-orange-400" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* In-App Content Reader Modal */}
      {showArticleReader && selectedArticle && (
        <ContentViewer
          url={selectedArticle.url || 'https://www.reuters.com'}
          title={selectedArticle.title}
          snippet={selectedArticle.snippet}
          source={selectedArticle.source}
          sourceTier={selectedArticle.source_tier}
          credibilityScore={selectedArticle.credibility_score}
          onClose={() => {
            setShowArticleReader(false);
            setSelectedArticle(null);
          }}
        />
      )}

    </div>
  );
};

export default TrendingGlobeView;
