"""
Unit Tests for Discovery Phase 4 Multilingual Processing Service
Compliant with PRD Section 7.3, 8.4 & TRD Section 5.3
"""

import pytest
from services.registry import get_multilingual_service

multi_mod = get_multilingual_service()


def test_indian_language_detection():
    # Hindi
    hi_text = "टाटा मोटर्स ने इलेक्ट्रिक वाहनों के लिए नया प्लांट शुरू किया।"
    lang_hi, conf_hi = multi_mod.detect_language(hi_text)
    assert lang_hi == "hi"
    assert conf_hi >= 0.90

    # Tamil
    ta_text = "டாடா மோட்டார்ஸ் புதிய மின்சார பேருந்துகளை அறிமுகப்படுத்தியது."
    lang_ta, conf_ta = multi_mod.detect_language(ta_text)
    assert lang_ta == "ta"
    assert conf_ta >= 0.90

    # Telugu
    te_text = "టాటా మోటార్స్ ఎలక్ట్రిక్ బస్సులను ప్రారంభించింది."
    lang_te, _ = multi_mod.detect_language(te_text)
    assert lang_te == "te"

    # Bengali
    bn_text = "টাটা মোটরস নতুন বৈদ্যুতিক বাস উন্মোচন করেছে।"
    lang_bn, _ = multi_mod.detect_language(bn_text)
    assert lang_bn == "bn"

    # Gujarati
    gu_text = "ટાટા મોટર્સે નવી ઇલેક્ટ્રિક બસો શરૂ કરી."
    lang_gu, _ = multi_mod.detect_language(gu_text)
    assert lang_gu == "gu"


def test_foreign_language_detection():
    # French
    fr_text = "Le nouveau système d'intelligence artificielle est très rapide et efficace."
    lang_fr, _ = multi_mod.detect_language(fr_text)
    assert lang_fr == "fr"

    # Spanish
    es_text = "La empresa ha anunciado una nueva plataforma de pagos digitales en América Latina."
    lang_es, _ = multi_mod.detect_language(es_text)
    assert lang_es == "es"

    # German
    de_text = "Das Unternehmen hat angekündigt, eine neue Fabrik in Deutschland zu bauen."
    lang_de, _ = multi_mod.detect_language(de_text)
    assert lang_de == "de"

    # Russian
    ru_text = "Новая технологическая компания представила передовые решения."
    lang_ru, _ = multi_mod.detect_language(ru_text)
    assert lang_ru == "ru"

    # Chinese
    zh_text = "该公司宣布推出面向企业用户的人工智能计算平台。"
    lang_zh, _ = multi_mod.detect_language(zh_text)
    assert lang_zh == "zh"


def test_translation_to_pivot_english():
    # Hindi translation
    hi_text = "टाटा मोटर्स ने इलेक्ट्रिक वाहनों की घोषणा की।"
    translated_hi, _ = multi_mod.translate_to_pivot(hi_text, source_lang="hi", target_lang="en")
    assert "Tata Motors" in translated_hi
    assert "electric" in translated_hi

    # Tamil translation
    ta_text = "டாடா மோட்டார்ஸ் புதிய செயற்கை நுண்ணறிவு தொழில்நுட்பம் அறிவிப்பு."
    translated_ta, _ = multi_mod.translate_to_pivot(ta_text, source_lang="ta", target_lang="en")
    assert "Tata Motors" in translated_ta
    assert "artificial intelligence" in translated_ta


def test_supported_languages_metadata():
    langs = multi_mod.SUPPORTED_LANGUAGES
    assert len(langs) >= 23
    assert "hi" in langs
    assert "ta" in langs
    assert "es" in langs
    assert "fr" in langs
    assert langs["ta"]["region"] == "Tamil Nadu, India"
    assert langs["ta"]["is_indian"] is True
    assert langs["fr"]["is_indian"] is False
