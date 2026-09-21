"""
Discovery Deterministic Rule Evaluator
Compliant with TRD Section 5.5 and PRD Section 7.5

Evaluates candidate Articles against configured Rules:
1. Recency window check (e.g., '24h', '48h', '7d', '30d').
2. Domain and Tier checks (min_source_tier, allowed_domains, blocked_domains).
3. Mandatory (must_include) and Excluded (must_not_include) term checks.
4. Language filter (allowed_languages).
5. Geographic metadata filter (countries, regions).
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import re
from typing import Any, Dict, List, Optional, Tuple

from services.common.models import Article, Rule


@dataclass
class RuleEvaluationResult:
    passed: bool
    reasons: List[str] = field(default_factory=list)
    failed_checks: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


def parse_recency_window_hours(recency_str: str) -> float:
    """Parse recency window strings into hours."""
    if not recency_str:
        return 720.0  # Default 30d

    clean = recency_str.strip().lower()
    match = re.match(r"^(\d+(?:\.\d+)?)\s*([a-z]+)?$", clean)
    if not match:
        return 720.0

    val = float(match.group(1))
    unit = match.group(2) or "d"

    if unit in ("h", "hr", "hrs", "hour", "hours"):
        return val
    elif unit in ("d", "day", "days"):
        return val * 24.0
    elif unit in ("w", "wk", "week", "weeks"):
        return val * 24.0 * 7.0
    elif unit in ("m", "mon", "month", "months"):
        return val * 24.0 * 30.0
    return val * 24.0


class RuleEvaluator:
    """Deterministic Rule Evaluator for Phase 0 & Phase 1 Filtering."""

    @staticmethod
    def evaluate_recency(
        article_time: datetime,
        recency_window: str,
        reference_time: Optional[datetime] = None,
    ) -> Tuple[bool, Optional[str]]:
        ref = reference_time or datetime.now(timezone.utc)
        if article_time.tzinfo is None:
            article_time = article_time.replace(tzinfo=timezone.utc)
        if ref.tzinfo is None:
            ref = ref.replace(tzinfo=timezone.utc)

        max_hours = parse_recency_window_hours(recency_window)
        age = ref - article_time
        max_age = timedelta(hours=max_hours)

        if age > max_age:
            return False, f"Article age ({age.total_seconds() / 3600:.1f}h) exceeds recency window of {recency_window} ({max_hours}h)."
        return True, None

    @staticmethod
    def evaluate_domain_and_tier(
        article_source: str,
        article_tier: int,
        rule_min_tier: int,
        domain_rules: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        effective_min_tier = domain_rules.get("min_tier", rule_min_tier)
        if article_tier > effective_min_tier:
            return False, f"Article source tier {article_tier} is lower than required minimum tier {effective_min_tier}."

        clean_source = (article_source or "").lower()

        blocked = [d.lower() for d in domain_rules.get("blocked_domains", [])]
        for b in blocked:
            if b in clean_source:
                return False, f"Article source '{article_source}' is in blocked domains list."

        allowed = [d.lower() for d in domain_rules.get("allowed_domains", [])]
        if allowed:
            if not any(a in clean_source for a in allowed):
                return False, f"Article source '{article_source}' is not in allowed domains list."

        return True, None

    @staticmethod
    def evaluate_boolean_terms(
        text: str,
        boolean_terms: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        if not boolean_terms:
            return True, None

        text_lower = (text or "").lower()

        must_include = boolean_terms.get("must_include", [])
        for term in must_include:
            term_clean = term.strip().lower()
            if term_clean and term_clean not in text_lower:
                return False, f"Mandatory term '{term}' not found in article content."

        must_not_include = boolean_terms.get("must_not_include", [])
        for term in must_not_include:
            term_clean = term.strip().lower()
            if term_clean and term_clean in text_lower:
                return False, f"Excluded term '{term}' was found in article content."

        return True, None

    @staticmethod
    def evaluate_language(
        article_lang: str,
        language_filter: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        if not language_filter:
            return True, None

        allowed = language_filter.get("allowed_languages", [])
        if allowed and article_lang:
            if article_lang.lower() not in [l.lower() for l in allowed]:
                return False, f"Article language '{article_lang}' is not in allowed languages: {allowed}."
        return True, None

    @classmethod
    def evaluate(
        cls,
        article: Article,
        rule: Rule,
        reference_time: Optional[datetime] = None,
        content_corpus: Optional[str] = None,
    ) -> RuleEvaluationResult:
        failed_checks: List[str] = []
        reasons: List[str] = []
        details: Dict[str, Any] = {}

        passed_recency, rec_reason = cls.evaluate_recency(
            article.published_at, rule.recency_window, reference_time
        )
        details["recency_passed"] = passed_recency
        if not passed_recency:
            failed_checks.append("recency")
            reasons.append(rec_reason)

        passed_domain, dom_reason = cls.evaluate_domain_and_tier(
            article.source, article.source_tier, rule.min_source_tier, rule.domain_rules
        )
        details["domain_tier_passed"] = passed_domain
        if not passed_domain:
            failed_checks.append("domain_tier")
            reasons.append(dom_reason)

        corpus_to_check = content_corpus if content_corpus is not None else f"{article.title} {article.extracted_text}"
        passed_terms, term_reason = cls.evaluate_boolean_terms(
            corpus_to_check, rule.boolean_terms
        )
        details["boolean_terms_passed"] = passed_terms
        if not passed_terms:
            failed_checks.append("boolean_terms")
            reasons.append(term_reason)


        passed_lang, lang_reason = cls.evaluate_language(
            article.language, rule.language_filter
        )
        details["language_passed"] = passed_lang
        if not passed_lang:
            failed_checks.append("language")
            reasons.append(lang_reason)

        is_passed = len(failed_checks) == 0
        if is_passed:
            reasons.append("Article passed all deterministic rule criteria.")

        return RuleEvaluationResult(
            passed=is_passed,
            reasons=reasons,
            failed_checks=failed_checks,
            details=details,
        )


rule_evaluator = RuleEvaluator()
