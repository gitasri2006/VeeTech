export type ViewType =
  | 'discovery'
  | 'feed'
  | 'story-detail'
  | 'media-viewer'
  | 'entities'
  | 'rules'
  | 'settings'
  | 'factcheck-queue'
  | 'whatsapp-moderation'
  | 'reporting'
  | 'admin-users'
  | 'audit-log'
  | 'briefs';

export type FactCheckVerdict = 'Verified' | 'Unverified' | 'Disputed' | 'Likely False';
export type ValidationStatus = 'approved' | 'rejected' | 'needs_review';
export type MediaType = 'text' | 'image' | 'video' | 'audio';
export type UserRole = 'Admin' | 'Lead' | 'Analyst' | 'FactVerifier' | 'Client' | 'Executive';

export interface Entity {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  seed_terms: string[];
  exclusion_terms: string[];
  disambiguation_context: string;
  status: string;
  owner_team_id?: string;
  edit_precedence_locked: boolean;
  created_at: string;
}

export interface Rule {
  id: string;
  entity_id: string;
  geo_filter: {
    countries?: string[];
    regions?: string[];
  };
  domain_rules: {
    min_tier?: number;
    allowed_domains?: string[];
    blocked_domains?: string[];
  };
  recency_window: string;
  boolean_terms: {
    must_include?: string[];
    must_not_include?: string[];
  };
  language_filter: {
    allowed_languages?: string[];
  };
  min_source_tier: number;
  natural_language?: string;
  version: number;
  created_at: string;
}

export interface Article {
  id: string;
  canonical_url: string;
  source: string;
  source_tier: number;
  title: string;
  author?: string;
  published_at: string;
  language: string;
  media_type: MediaType;
  extracted_text: string;
  content_hash: string;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  article_id: string;
  type: MediaType;
  storage_ref?: string;
  ocr_text?: string;
  transcript?: string;
  caption?: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  article_id: string;
  platform: string;
  handle: string;
  follower_tier: number;
  engagement_metrics: Record<string, any>;
  post_url: string;
  created_at: string;
}

export interface LanguageTag {
  article_id: string;
  detected_language: string;
  region: string;
  translated_text: string;
  translation_confidence: number;
  created_at: string;
}

export interface Match {
  id: string;
  article_id: string;
  entity_id: string;
  match_type: 'semantic' | 'keyword';
  confidence_score: number;
  matched_seed_terms: string[];
  created_at: string;
}

export interface Validation {
  id: string;
  match_id: string;
  disambiguation_confidence: number;
  sentiment: string;
  validated_status: ValidationStatus;
  validated_by?: string;
  reason: string;
  created_at: string;
}

export interface FactCheckResult {
  id: string;
  article_id: string;
  authenticity_score: number;
  verdict: FactCheckVerdict;
  evidence_sources: Array<{
    source: string;
    status: string;
    url: string;
    summary: string;
  }>;
  manipulated_media_flag: boolean;
  stale_context_flag: boolean;
  needs_human_review: boolean;
  reviewed_by?: string;
  human_override_reason?: string;
  created_at: string;
}

export interface SourceTier {
  domain_or_handle: string;
  platform: string;
  tier: number;
  credibility_score: number;
  analyst_locked: boolean;
  reasoning?: string;
  updated_at: string;
}

export interface WhatsAppQuery {
  id: string;
  phone_number_hash: string;
  submitted_content_ref: string;
  content_type: MediaType;
  raw_payload?: string;
  language: string;
  article_id?: string;
  verdict?: FactCheckVerdict;
  replied_at?: string;
  needs_human_review: boolean;
  status: string;
  reply_text?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  entity_id: string;
  article_id_or_cluster_id: string;
  channel: string;
  cadence: string;
  delivered_at?: string;
  escalation_flag: boolean;
  message: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  account_ids: string[];
  notification_prefs: Record<string, any>;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action_type: string;
  target_id: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  timestamp: string;
}

export interface Brief {
  id: string;
  title: string;
  entity_id?: string;
  cluster_ids: string[];
  summary_sentences: Array<{
    text: string;
    article_id: string;
  }>;
  unattributable_count: number;
  authenticity_summary: Record<string, number>;
  created_at: string;
}
