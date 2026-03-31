# Suspicious Activity Detection

This document describes how Browser History Analyzer detects and highlights suspicious browsing activity, and outlines planned improvements.

## Current Approach

Detection runs as a background analysis step after history and search data is loaded. It flags both URL/history records and search terms, highlighting them in red in the results table. A "Suspicious only" filter toggle lets the analyst isolate flagged records.

### Layer 1: Keyword Matching

A single compiled regex is built from two sources:

1. **Profanity filter** — the `bad-words` npm package provides a baseline list of offensive/explicit terms.
2. **Custom forensic word list** (`CUSTOM_SUSPICIOUS_WORDS`) — ~250 terms organized into categories:
   - Data exfiltration and anonymous file sharing (pastebin, file.io, mega.nz, etc.)
   - Anonymity and privacy evasion tools (Tor, VPNs, disposable email services)
   - Hacking tools and exploit resources (Metasploit, SQLMap, Cobalt Strike, etc.)
   - Credential theft and data breach lookups (dehashed, combolist, etc.)
   - Piracy and warez sites
   - Social engineering resources
   - Insider threat indicators (job sites, evidence destruction, exfiltration)
   - Anti-forensics and evasion (log cleaners, AV bypass, timestomping)
   - Malware analysis and distribution platforms
   - Remote access and C2 infrastructure (ngrok, AnyDesk, webhook services)
   - Fraud and financial crime terminology
   - Surveillance and stalkerware tools

The regex uses word-boundary and URL-delimiter anchors (`\b`, `/`, `_`, `.`, `?`, `=`, `&`) to reduce false positives from substring matches. Matching is case-insensitive.

For **history records**, the regex is tested against the URL and page title.
For **search records**, it is tested against the URL and the search term itself.

### Layer 2: Intent Pattern Matching

A separate set of hand-crafted regular expressions (`INTENT_PATTERNS`) targets phrases that express suspicious intent rather than just containing a keyword. These cover:

- Criminal intent phrases ("get away with", "without getting caught", "cover up evidence")
- How-to queries for illegal activities ("how to hack", "how to steal", "how to forge")
- Acquisition of illegal items ("buy drugs", "dark web market")
- Bomb/weapon/drug manufacturing queries
- Hiring for illegal services ("hire a hitman")
- Shoplifting and theft guides
- Academic dishonesty
- Forgery and document falsification

Intent patterns are tested against the same fields as keyword matching (URL + title for history, URL + search term for searches).

### How Flagging Works

A record is flagged if **either** layer produces a match. Flagged records receive a `flagged: true` property which the renderer uses to apply the red highlight CSS class and to power the suspicious-only filter.

## Limitations

- **False positives**: Keyword matching is inherently noisy. A security researcher visiting exploit-db or a user checking haveibeenpwned for legitimate reasons will trigger flags. The tool is designed to surface records for human review, not to make guilt determinations.
- **False negatives**: Obfuscated URLs, URL shorteners, and novel terminology will evade detection. The static word list requires manual updates to stay current.
- **No contextual awareness**: Each record is evaluated in isolation. Patterns across multiple records (e.g., visiting a VPN site, then a paste site, then a file shredder) are not correlated.
- **English-only**: Both keyword and intent detection only cover English terms and phrases.

## Future Improvements

### Lightweight NLP-Based Classification

The current regex approach could be augmented with lightweight natural language processing to improve both precision and recall:

1. **TF-IDF + classifier**: Train a small classifier (logistic regression or naive Bayes) on labeled browser history data. Extract TF-IDF features from URLs, page titles, and search terms. This would catch suspicious pages that don't contain exact keyword matches but share vocabulary patterns with known-suspicious content. The model would be small enough to ship with the app and run entirely offline.

2. **N-gram analysis**: Instead of matching exact phrases, extract character and word n-grams from URLs and titles. This helps catch obfuscated or misspelled variants of suspicious terms (e.g., "h4ck", "cr3dentials") that the current regex misses.

3. **Tokenized search term analysis**: Apply basic NLP tokenization and part-of-speech tagging to search terms to better detect intent. For example, identifying verb-object patterns like "[how to] [verb:illegal-action] [noun:target]" would be more robust than the current fixed regex patterns and would generalize to phrasings not explicitly enumerated.

4. **Semantic similarity with word embeddings**: Use a lightweight pre-trained word embedding model (e.g., a compact Word2Vec or GloVe model) to compute similarity between page titles/search terms and a set of suspicious seed phrases. This would catch semantically related content even when exact keywords differ. A 50MB embedding file would be feasible for a desktop app.

5. **Behavioral sequence scoring**: Rather than flagging individual records, analyze sequences of visits within a time window. A session that progresses from anonymization tools to data exfiltration sites to evidence destruction tools is far more suspicious than any single visit. A simple Markov chain or sliding-window scorer over category labels could surface these patterns.

6. **Confidence scoring**: Replace the binary flagged/not-flagged output with a numeric suspicion score (0-100). This would allow analysts to set their own threshold and sort by severity rather than treating all flags equally. The score could combine signals from keyword matches, intent patterns, NLP classification confidence, and behavioral sequence analysis.

### Other Planned Improvements

- **Configurable word lists**: Allow analysts to add/remove keywords and adjust categories to fit their investigation scope.
- **Multi-language support**: Extend detection to cover common non-English terms for the same categories.
- **URL shortener resolution**: Resolve shortened URLs before analysis to catch hidden destinations.
- **Domain reputation lookups**: Cross-reference visited domains against threat intelligence feeds for known-malicious infrastructure.
