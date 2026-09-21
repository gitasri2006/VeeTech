import {
  Entity, Rule, Article, Match, Validation, FactCheckResult,
  SourceTier, WhatsAppQuery, Alert, User, AuditLogEntry, Brief
} from '../types';

const API_BASE = {
  extraction: '/api/extraction',
  filtering: '/api/filtering',
  entityProfile: '/api/entity-profile',
  contextualValidation: '/api/contextual-validation',
  discovery: '/api/discovery',
  multilingual: '/api/multilingual',
  factcheck: '/api/factcheck',
  sources: '/api/sources',
  whatsapp: '/api/whatsapp',
  briefs: '/api/briefs',
};

export interface UnifiedSearchOptions {
  query?: string;
  keywords?: string[];
  entityId?: string;
  inputModality?: 'text' | 'image' | 'audio' | 'video';
  targetLanguage?: string;
  timeRange?: string;
  strictRelevance?: boolean;
  mediaFileName?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  mockOcrText?: string;
  mockTranscript?: string;
  mockCaption?: string;
  mockKeyframes?: string[];
  scope?: any;
  conversationHistory?: Array<{ role: string; content: string; timestamp?: string }>;
  previousSources?: Array<any>;
}

// Seed / Live State Storage for full client-side responsiveness
export class DiscoveryApiClient {
  private static instance: DiscoveryApiClient;

  public static getInstance(): DiscoveryApiClient {
    if (!DiscoveryApiClient.instance) {
      DiscoveryApiClient.instance = new DiscoveryApiClient();
    }
    return DiscoveryApiClient.instance;
  }

  // Master Unified Discovery & Intelligence Search
  async searchUnifiedDiscovery(options: UnifiedSearchOptions) {
    const targetLang = options.targetLanguage || 'en';
    try {
      const res = await fetch(`${API_BASE.discovery}/api/v1/discovery/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: options.query,
          keywords: options.keywords || (options.query ? [options.query] : []),
          entity_id: options.entityId,
          input_modality: options.inputModality || 'text',
          target_language: targetLang,
          time_range: options.timeRange || 'all',
          strict_relevance: options.strictRelevance !== false,
          media_file_name: options.mediaFileName,
          media_base64: options.mediaBase64,
          media_mime_type: options.mediaMimeType,
          mock_ocr_text: options.mockOcrText,
          mock_transcript: options.mockTranscript,
          mock_caption: options.mockCaption,
          mock_keyframes: options.mockKeyframes,
          scope: options.scope || {},
          max_candidates_per_source: 15,
          auto_ingest: true,
          conversation_history: options.conversationHistory,
          previous_sources: options.previousSources,
        }),
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errText = await res.text();
        throw new Error(`Live discovery service returned HTTP ${res.status}: ${errText}`);
      }
    } catch (e: any) {
      console.error('Unified discovery live service failure:', e);
      throw new Error(e.message || 'Live discovery service failed to respond. Please ensure discovery backend is running on port 8004.');
    }
  }

  // 1. Discovery (Legacy adapter for candidate list)
  async searchGlobalDiscovery(keywords: string[], entityId?: string, scope?: any) {
    const res = await this.searchUnifiedDiscovery({
      keywords,
      entityId,
      scope,
    });
    return {
      query: keywords.join(' '),
      total_candidates: res.candidates_count || 0,
      new_articles_ingested: res.candidates_count || 0,
      duplicates_skipped: 0,
      articles: (res.sources || []).map((c: any, idx: number) => ({
        id: `art-live-${idx + 1}`,
        title: c.title,
        source: c.source,
        source_tier: c.source_tier || 2,
        language: res.target_language || 'en',
        canonical_url: c.url,
        published_at: c.discovered_at || new Date().toISOString(),
      }))
    };
  }


  // 2. Entities
  async listEntities(): Promise<Entity[]> {
    try {
      const res = await fetch(`${API_BASE.entityProfile}/entities`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [
      {
        id: 'ent-001',
        name: 'Tata Motors EV',
        type: 'Company',
        aliases: ['Tata Electric', 'Tata Passenger Electric Mobility', 'TPEM'],
        seed_terms: ['Tata Motors', 'Nexon EV', 'Punch EV', 'Curvv EV', 'Harrier EV'],
        exclusion_terms: ['Tata Salt', 'Tata Steel', 'Tata Chemicals', 'Tata Coffee'],
        disambiguation_context: 'Automotive manufacturer producing passenger and commercial electric vehicles.',
        status: 'active',
        edit_precedence_locked: true,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'ent-002',
        name: 'ISRO Gaganyaan',
        type: 'Organization / Project',
        aliases: ['Indian Space Research Organisation', 'Gaganyaan Mission'],
        seed_terms: ['ISRO', 'Gaganyaan', 'Human Spaceflight', 'Vyommitra', 'LVM3'],
        exclusion_terms: ['ISRO Housing Society', 'ESA Gaganyaan'],
        disambiguation_context: 'Indian national human spaceflight exploration program conducted by ISRO.',
        status: 'active',
        edit_precedence_locked: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      }
    ];
  }

  async createEntity(payload: Partial<Entity>): Promise<Entity> {
    const res = await fetch(`${API_BASE.entityProfile}/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }

  // 3. Rules
  async listRules(entityId?: string): Promise<Rule[]> {
    try {
      const url = entityId ? `${API_BASE.filtering}/rules?entity_id=${entityId}` : `${API_BASE.filtering}/rules`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  }

  async createRule(payload: Partial<Rule>): Promise<Rule> {
    const res = await fetch(`${API_BASE.filtering}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE.filtering}/rules/${ruleId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async compileRule(entityId: string, naturalLanguage: string): Promise<Rule> {
    const res = await fetch(`${API_BASE.filtering}/rules/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, natural_language: naturalLanguage }),
    });
    return await res.json();
  }

  async runRuleSandbox(rule: Partial<Rule>, sampleLimit: number = 20) {
    try {
      const res = await fetch(`${API_BASE.filtering}/rules/sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule, sample_limit: sampleLimit }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      total_evaluated: 25,
      passed_count: 19,
      failed_count: 6,
      pass_rate_pct: 76.0,
      breakdown_by_failure_reason: { recency: 2, domain_tier: 3, excluded_terms: 1 },
      sample_passed_articles: [
        { id: 'a1', title: 'Tata Motors launches high-capacity electric bus for state transit', source: 'thehindu.com', tier: 1 },
        { id: 'a2', title: 'Electric vehicle charging grid expands in Bengaluru and Mumbai', source: 'ndtv.com', tier: 2 },
      ],
      sample_failed_articles: [
        { id: 'f1', title: 'Tata Steel reports quarterly earnings surge', source: 'moneycontrol.com', tier: 2, failed_checks: ['excluded_terms'] }
      ]
    };
  }

  // 4. Fact Check & Human Review Queue
  async getFactCheckQueue(): Promise<FactCheckResult[]> {
    try {
      const res = await fetch(`${API_BASE.factcheck}/factcheck/queue`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [
      {
        id: 'fc-rev-01',
        article_id: 'art-hoax-01',
        authenticity_score: 0.12,
        verdict: 'Likely False',
        evidence_sources: [
          { source: 'Alt News', status: 'debunked', url: 'https://altnews.in/viral-anthem-hoax', summary: 'UNESCO has confirmed no such recognition or competition exists.' }
        ],
        manipulated_media_flag: false,
        stale_context_flag: false,
        needs_human_review: true,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'fc-rev-02',
        article_id: 'art-deepfake-02',
        authenticity_score: 0.18,
        verdict: 'Likely False',
        evidence_sources: [
          { source: 'BOOM Live', status: 'debunked', url: 'https://boomlive.in/fact-check/deepfake-speech', summary: 'Audio forensics reveals AI voice clone artifacts.' }
        ],
        manipulated_media_flag: true,
        stale_context_flag: false,
        needs_human_review: true,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      }
    ];
  }

  async submitFactCheckReview(articleId: string, verdict: string, reviewedBy: string, reason: string) {
    const res = await fetch(`${API_BASE.factcheck}/factcheck/${articleId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_verdict: verdict, reviewed_by: reviewedBy, override_reason: reason }),
    });
    return await res.json();
  }

  // 5. WhatsApp Bot Moderation & Analytics
  async getWhatsAppQueue(): Promise<WhatsAppQuery[]> {
    try {
      const res = await fetch(`${API_BASE.whatsapp}/whatsapp/queue`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [
      {
        id: 'wa-q-001',
        phone_number_hash: '9a8f4c2b1e7d8c3a5e1f0b9d8a7c6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d',
        submitted_content_ref: 'art-hoax-01',
        content_type: 'text',
        raw_payload: 'UNESCO has officially declared Jana Gana Mana as the best national anthem in the world for 2026. Forward to all groups!',
        language: 'en',
        verdict: 'Likely False',
        needs_human_review: true,
        status: 'queued_review',
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'wa-q-002',
        phone_number_hash: '3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a',
        submitted_content_ref: 'art-img-02',
        content_type: 'image',
        raw_payload: 'NASA satellite night view of India during festival showing entire map illuminated in tricolor lights',
        language: 'hi',
        verdict: 'Likely False',
        needs_human_review: true,
        status: 'queued_review',
        created_at: new Date(Date.now() - 900000).toISOString(),
      }
    ];
  }

  async approveWhatsAppQuery(queryId: string, verdict: string, reviewedBy: string, notes?: string) {
    const res = await fetch(`${API_BASE.whatsapp}/whatsapp/moderation/${queryId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_verdict: verdict, reviewed_by: reviewedBy, analyst_notes: notes }),
    });
    return await res.json();
  }

  async getWhatsAppAnalytics() {
    try {
      const res = await fetch(`${API_BASE.whatsapp}/whatsapp/analytics`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      total_queries: 1482,
      verdict_breakdown: { Verified: 820, Unverified: 340, Disputed: 92, 'Likely False': 230 },
      language_breakdown: { en: 610, hi: 420, ta: 180, te: 140, es: 70, fr: 62 },
      media_type_breakdown: { text: 890, image: 390, video: 130, audio: 72 },
      pending_human_review_count: 2,
      sla_target_response_seconds: 60,
    };
  }

  // 6. Executive Briefs
  async getBriefs(): Promise<Brief[]> {
    try {
      const res = await fetch(`${API_BASE.briefs}/briefs`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [
      {
        id: 'brief-001',
        title: 'Executive Digest: Global Semiconductor Manufacturing & EV Infrastructure',
        entity_id: 'ent-001',
        cluster_ids: ['art-live-01', 'art-live-02'],
        summary_sentences: [
          { text: 'Applied Materials confirmed a multi-billion dollar expansion initiative supporting regional chip fabrication hubs.', article_id: 'art-live-01' },
          { text: 'Advanced automotive grade telemetry and next generation power units are entering mass deployment across public transit networks.', article_id: 'art-live-02' },
        ],
        unattributable_count: 0,
        authenticity_summary: { Verified: 2, Unverified: 0 },
        created_at: new Date(Date.now() - 7200000).toISOString(),
      }
    ];
  }

  // 7. Audit Log
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return [
      {
        id: 'audit-001',
        actor_id: 'analyst-pankaj',
        action_type: 'whatsapp_analyst_approval',
        target_id: 'wa-q-001',
        before: { verdict: 'Likely False', needs_human_review: true, status: 'queued_review' },
        after: { verdict: 'Likely False', needs_human_review: false, status: 'replied' },
        timestamp: new Date(Date.now() - 1200000).toISOString(),
      },
      {
        id: 'audit-002',
        actor_id: 'admin-sarah',
        action_type: 'entity_precedence_lock',
        target_id: 'ent-001',
        before: { edit_precedence_locked: false },
        after: { edit_precedence_locked: true },
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      }
    ];
  }
}

export const api = DiscoveryApiClient.getInstance();
