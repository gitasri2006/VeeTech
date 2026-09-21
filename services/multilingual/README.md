# Discovery Multilingual Processing Service

Part of **Discovery** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.3, 8.4** and **TRD Section 5.3**.

## Capabilities

- **Broad Language Detection**: Identifies 12 Indian regional languages (Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu, Odia, Assamese) and 10 foreign languages (Spanish, French, German, Arabic, Mandarin Chinese, Japanese, Korean, Russian, Portuguese, Indonesian).
- **Pivot Language Translation**: Translates source content to English for cross-lingual semantic embedding matching.
- **Linguistic & Regional Tagging**: Attaches regional metadata (e.g. `ta` -> `Tamil Nadu, India`) to support geography and regional language filtering rules.
- **Preserved Original Representations**: Stores original source text alongside the translated pivot representation in `LanguageTag`.

## API Endpoints

- `POST /detect`: Detect language code, script, and region.
- `POST /translate`: Translate text into pivot English.
- `POST /process`: Detect, translate, and persist `LanguageTag` for an Article.
- `GET /languages`: Query supported language registry.
- `GET /health`: Health probe.
