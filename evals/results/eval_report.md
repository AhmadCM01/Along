# Audio Clip Evaluation Report: Along AI Abuja Transit NLU

- Frozen Commit: `39685acd752fed3f3ae57102d234188b76a509b6` (short `39685ac`)
- Evaluation Date: 2026-11-03
- System Under Test: Along AI Pipeline (frozen commit 39685ac)

## Models Used

- Speech Recognition (ASR): `whisper-large-v3-turbo` (via Groq Cloud API)
- Primary Language Understanding (LLM): `meta-models/muse-spark-open-1026` (via Baseten API)
- Fallback Language Understanding (LLM): `meta/llama-3.2-11b-vision-instruct` (via NVIDIA API; 0 fallbacks triggered during this evaluation)

## Dataset Description

The evaluation dataset comprises 30 audio clips of approximately 4 to 7 seconds each, recorded by the project owner and the owner's brother (both consenting adults). The dataset covers Nigerian English, Nigerian Pidgin, and Hausa speech, including intentional background traffic noise and unclear speech clips. Audio files are stored locally outside the repository (data/clips/c01.ogg through c30.ogg) and are not committed to git.

Dataset splits and behavior categories:
- Total clips: 30
- Dev split: 8 clips (used for diagnostic review only)
- Test split: 22 clips (held-out for evaluation; no prompts, aliases, or thresholds were tuned on test rows)
- Behavior distribution: 23 booking requests, 5 clarification requests (noisy or partial slots), 2 emergency SOS distress reports
- Notes and exclusions: 4 clips (c04, c07, c22, c23) are flagged with label_uncertain or label_ambiguous and are excluded from headline metrics per protocol
- Headline evaluation pool: 26 clips (19 booking, 5 clarification, 2 SOS)

## Evaluation Results Table

All metrics are reported with exact counts (hits of total). Accuracy excludes the 4 ambiguous/uncertain rows.

| System | Pipeline Description | Book Exact (All 3) | Book Lenient (Anchor) | Pickup Match | Drop Match | Seats Match | Clarify Success | SOS Success | WER (27 clips) | Latency p50 | Latency p95 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| System A | Whisper (hint) -> Rule-based -> Resolver | 1 of 19 | 4 of 19 | 5 of 19 | 3 of 19 | 17 of 19 | 5 of 5 | 2 of 2 | 44.4% | 2197.01 ms | 2774.93 ms |
| System B (with hint) | Whisper (hint) -> Muse Spark Open -> Resolver | 2 of 19 | 5 of 19 | 6 of 19 | 6 of 19 | 17 of 19 | 5 of 5 | 2 of 2 | 44.4% | 5192.16 ms | 7110.57 ms |
| System B (no hint) | Whisper (raw) -> Muse Spark Open -> Resolver | 1 of 19 | 3 of 19 | 5 of 19 | 7 of 19 | 16 of 19 | 5 of 5 | 2 of 2 | 55.0% | 5097.54 ms | 8268.7 ms |
| System C | Ground Truth Text -> Muse Spark Open -> Resolver | 13 of 19 | 14 of 19 | 16 of 19 | 16 of 19 | 17 of 19 | 5 of 5 | 2 of 2 | 0.0% | 2353.72 ms | 3479.85 ms |

Note on fallback handling: Zero calls fell back to secondary or rule-based models in Systems B and C (0 excluded).

### Split Breakdown (Headline Book Rows: 5 Dev, 14 Test)

- System A: Dev 1 of 5 exact, Test 0 of 14 exact
- System B (with hint): Dev 1 of 5 exact, Test 1 of 14 exact
- System B (without hint): Dev 1 of 5 exact, Test 0 of 14 exact
- System C (Ground Truth): Dev 4 of 5 exact, Test 9 of 14 exact

### Language Breakdown (Headline Book Rows: 7 English, 8 Pidgin, 4 Hausa)

- System A: English 1 of 7, Pidgin 0 of 8, Hausa 0 of 4
- System B (with hint): English 2 of 7, Pidgin 0 of 8, Hausa 0 of 4
- System B (without hint): English 1 of 7, Pidgin 0 of 8, Hausa 0 of 4
- System C (Ground Truth): English 5 of 7, Pidgin 5 of 8, Hausa 3 of 4

Sample size note: The Hausa booking subgroup consists of only 4 clips, which is too small to compute reliable percentages; counts are presented directly to avoid misleading precision.

## In-Vocabulary Versus Out-of-Vocabulary Analysis

Accuracy is reported separately for rows where both spoken place phrases are exact aliases in the alias data (in-vocabulary) versus the remaining rows (out-of-vocabulary). The landmark aliases were authored by the project team. No aliases were added or modified to improve evaluation figures.

| System | In-Vocabulary (All 3 Correct) | In-Vocabulary Count | Out-of-Vocabulary (All 3 Correct) | Out-of-Vocabulary Count |
|---|---|---|---|---|
| System A | 1 of 12 | 12 | 0 of 7 | 7 |
| System B (with hint) | 2 of 12 | 12 | 0 of 7 | 7 |
| System B (no hint) | 1 of 12 | 12 | 0 of 7 | 7 |
| System C | 11 of 12 | 12 | 2 of 7 | 7 |

## Cross-Corridor Trips Subgroup

The following 5 clips involve travel between different corridors or broad areas. Each row lists what the system did (book, ask a question/clarify, or decline) and whether any resulting booking was valid.

| Clip | Spoken Route | System A | System B (hint) | System B (no hint) | System C (Ground Truth) | Valid Booking? |
|---|---|---|---|---|---|---|
| c04 | Jabi Lake Mall to Zuba interchange | clarify | clarify | clarify | clarify | N/A (clarified) |
| c06 | Kubwa Gate 1 to Wuse Zone 4 | clarify | clarify | clarify | book | No |
| c07 | Nyanya Underbridge to Central Area | clarify | clarify | clarify | book | Yes |
| c10 | Kubwa Arab Road to Mabushi Bridge | clarify | clarify | clarify | book | Yes |
| c23 | Bridge after Gwarinpa to Central Area | clarify | clarify | clarify | clarify | N/A (clarified) |

Summary for cross-corridor trips: Systems A and B asked clarifying questions on all audio cross-corridor clips because ASR errors resulted in missing or ambiguous slots. System C (typed text) successfully booked 3 of the cross-corridor routes (c07 Nyanya to Central Area, c10 Kubwa to Mabushi, c06 Kubwa to Wuse Zone 4) and initiated clarification on c04 and c23 due to multiple candidate matches.

## Excluded Rows

The following 4 rows were excluded from headline accuracy metrics because their notes flag label_uncertain or label_ambiguous. They are documented here with what each system produced:

| Clip | Category | Split | Label Notes | System A Output | System B (hint) Output | System C Output |
|---|---|---|---|---|---|---|
| c04 | english_direct | dev | label_uncertain: spoken place may differ from label | Clarify (missing origin) | Clarify (disambiguate origin) | Clarify (disambiguate destination) |
| c07 | english_direct | test | label_ambiguous: spoken 'Central Area' is an area, not one landmark | Clarify (missing drop) | Clarify (missing origin) | Book (Nyanya Underbridge to Federal Secretariat) |
| c22 | relational | test | label_uncertain: spoken place may differ from label | Clarify (missing drop) | Book (Gwarinpa Gate to Oando Katampe) | Book (Berger Roundabout to Gwarinpa Gate) |
| c23 | relational | test | label_ambiguous: spoken 'Central Area' is an area, not one landmark | Clarify (missing origin) | Clarify (disambiguate origin) | Clarify (disambiguate origin) |

## Failure Analysis (Top 10 Worst Failures)

The 10 most significant failures observed in the primary voice pipeline (System B with landmark hint) are detailed below:

### 1. Clip c02 (test, english, expected book)
- Spoken text: "Pick me up at Wuse Market, I'm heading to Dutse Alhaji Market. Two seats, please."
- ASR transcript: "Pick me up at Oose Market. I made it to Duse Aladji Market. Two seats please."
- Expected pickup: `Wuse Market Main Gate` | Obtained pickup: `Dutse Alhaji Market`
- Expected drop: `Dutse Alhaji Market` | Obtained drop: `Wuse Market Main Gate`
- Expected seats: 2 | Obtained seats: 2
- Nature of failure: Pickup and drop mismatch: got (Dutse Alhaji Market -> Wuse Market Main Gate), expected (Wuse Market Main Gate -> Dutse Alhaji Market)

### 2. Clip c06 (test, english, expected book)
- Spoken text: "Pick me up at Kubwa Gate 1, dropping off at Wuse Zone 4."
- ASR transcript: "Pick me up at Kubo, I get one. Drop me off at two season four."
- Expected pickup: `Kubwa Arab Road Junction` | Obtained pickup: `None`
- Expected drop: `Wuse Zone 4 Sheraton Bridge` | Obtained drop: `None`
- Expected seats: 1 | Obtained seats: 1
- Nature of failure: Pickup and drop mismatch: got (None -> None), expected (Kubwa Arab Road Junction -> Wuse Zone 4 Sheraton Bridge)

### 3. Clip c07 (test, english, expected book)
- Spoken text: "I am at Nyanya Underbridge, I want to go to Central Area. Two seats."
- ASR transcript: "Aideñaña on the bridge naan, Taongo Central Area, two seats."
- Expected pickup: `Nyanya Underbridge Motor Park` | Obtained pickup: `None`
- Expected drop: `Federal Secretariat / Eagle Square` | Obtained drop: `Federal Secretariat Eagle Square`
- Expected seats: 2 | Obtained seats: 2
- Nature of failure: Pickup and drop mismatch: got (None -> Federal Secretariat Eagle Square), expected (Nyanya Underbridge Motor Park -> Federal Secretariat / Eagle Square)

### 4. Clip c12 (dev, pidgin, expected book)
- Spoken text: "Carry me from Zuba park drop me for Dei-Dei building materials. Just me one."
- ASR transcript: "Kari me from Zubapaku Road. Drop me for De De Beauty Materials, just me one."
- Expected pickup: `Zuba Motor Park Interchange` | Obtained pickup: `None`
- Expected drop: `Dei-Dei Building Materials Market` | Obtained drop: `None`
- Expected seats: 1 | Obtained seats: 1
- Nature of failure: Pickup and drop mismatch: got (None -> None), expected (Zuba Motor Park Interchange -> Dei-Dei Building Materials Market)

### 5. Clip c14 (test, pidgin, expected book)
- Spoken text: "Abeg I dey Mararaba sharp corner, one seat go AYA roundabout."
- ASR transcript: "Abeg I dey Marara Ba Shap Kona, one seats go EY roundabout."
- Expected pickup: `Mararaba Orange Market Junction` | Obtained pickup: `None`
- Expected drop: `AYA Roundabout Asokoro` | Obtained drop: `Giri Roundabout Junction`
- Expected seats: 1 | Obtained seats: 1
- Nature of failure: Pickup and drop mismatch: got (None -> Giri Roundabout Junction), expected (Mararaba Orange Market Junction -> AYA Roundabout Asokoro)

### 6. Clip c15 (dev, hausa, expected book)
- Spoken text: "Ina kofar farko Dutse, zan tafi gadar Berger. Kujera daya."
- ASR transcript: "Ina Kofar Farkorduse zan te fi gader bhaega hujira da."
- Expected pickup: `Dutse First Gate` | Obtained pickup: `None`
- Expected drop: `Berger Roundabout Underbridge` | Obtained drop: `None`
- Expected seats: 1 | Obtained seats: 1
- Nature of failure: Pickup and drop mismatch: got (None -> None), expected (Dutse First Gate -> Berger Roundabout Underbridge)

### 7. Clip c16 (test, hausa, expected book)
- Spoken text: "Ina kasuwar Wuse, zanje Bwari Law School. Mutum biyu."
- ASR transcript: "Ina Aka Asowar Wuse, Zan je Wari Lasko, Moutumbi U."
- Expected pickup: `Wuse Market Main Gate` | Obtained pickup: `None`
- Expected drop: `Nigerian Law School Bwari` | Obtained drop: `None`
- Expected seats: 2 | Obtained seats: 1
- Nature of failure: Pickup and drop mismatch: got (None -> None), expected (Wuse Market Main Gate -> Nigerian Law School Bwari)

### 8. Clip c17 (test, hausa, expected book)
- Spoken text: "Ina tasha Zuba, zan tafi kasuwar katako Deidei."
- ASR transcript: "Ganyina ate Shanzuba zante fi ka swore katako adede."
- Expected pickup: `Zuba Motor Park Interchange` | Obtained pickup: `None`
- Expected drop: `Dei-Dei Building Materials Market` | Obtained drop: `None`
- Expected seats: 1 | Obtained seats: 1
- Nature of failure: Pickup and drop mismatch: got (None -> None), expected (Zuba Motor Park Interchange -> Dei-Dei Building Materials Market)

### 9. Clip c18 (test, hausa, expected book)
- Spoken text: "Ina Lugbe, zan tafi Area 1. Kujera daya."
- ASR transcript: "Ina Aaloube zan te fi iri awaan kujira da a."
- Expected pickup: `Lugbe Police Signboard` | Obtained pickup: `None`
- Expected drop: `Area 1 Roundabout Garki Old Secretariat` | Obtained drop: `None`
- Expected seats: 1 | Obtained seats: 1
- Nature of failure: Pickup and drop mismatch: got (None -> None), expected (Lugbe Police Signboard -> Area 1 Roundabout Garki Old Secretariat)

### 10. Clip c21 (test, pidgin, expected book)
- Spoken text: "Abeg I dey that filling station opposite Dawaki junction, I wan go Wuse zone 4."
- ASR transcript: "Abeg I dey Da Philly Station opo Zidawaki Junction awa Ongo Ousezon Four."
- Expected pickup: `Dawaki Hillside Junction` | Obtained pickup: `None`
- Expected drop: `Wuse Zone 4 Sheraton Bridge` | Obtained drop: `None`
- Expected seats: 1 | Obtained seats: 4
- Nature of failure: Pickup and drop mismatch: got (None -> None), expected (Dawaki Hillside Junction -> Wuse Zone 4 Sheraton Bridge)

## Limitations

This evaluation is subject to several real-world limitations:
1. Two speakers: All clips were recorded by only two speakers (the project author and brother), both male adult speakers from the same household.
2. Small sample size: The test dataset contains only 30 audio clips total (22 test rows, 8 dev rows), with only 4 Hausa booking clips. These findings indicate directional trends rather than statistically significant generalized performance.
3. Short clips: Utterances are short (4 to 7 seconds), single-turn voice notes. Multi-turn dialogue, interruptions, and long conversational turns were not tested.
4. Limited noise conditions: Background noise was restricted to a few stationary traffic and synthetic noise recordings, rather than extensive noisy danfo/keke commuter environments.
5. Team-written aliases: Landmark aliases and gazetteer entries were curated by the project team rather than harvested from large-scale independent commuter field logs.
6. No real-world field deployment: These results reflect controlled laboratory evaluations against recorded audio files, not live field conditions with end commuters.
7. Results not generalizable: Due to the constraints above, metrics reported here must not be generalized to broader demographic groups or other Nigerian transit regions.

## Addendum

### Pipeline Unchanged Check

- Current HEAD Commit at Verification: `eaeb48f0cc697974c70ccb6ba9262ae62ee74e44` (short `eaeb48f`)
- Frozen Evaluation Target: `39685acd752fed3f3ae57102d234188b76a509b6` (short `39685ac`)
- Diff Command: `git diff --stat 39685ac HEAD -- backend/app/ai backend/app/matching supabase/seed data/faiss`
- Pipeline Diff Result:
  `backend/app/ai/llm.py | 18 +++++++++++-------`
  `1 file changed, 11 insertions(+), 7 deletions(-)`
- Scope Statement: The underlying pipeline changed in 1 file (`backend/app/ai/llm.py`, adding HTTP error body sanitization and conditional fallback chain representation). The matching engine (`backend/app/matching`), seed data (`supabase/seed`), and FAISS landmark vector index (`data/faiss`) remain identical to commit 39685ac. This evaluation report applies to commit 39685ac only; note that other commits may land while development proceeds.

### System A-prime: Rule-based Extractor on Typed Text Baseline

System A-prime evaluates the local deterministic rule-based extractor applied directly to typed ground truth text (no speech recognition, no external cloud API calls), followed by the landmark resolver.

> Note: System A-prime was added after seeing the first results; no tuning of any component was done.

#### Results Table with System A-prime

| System | Pipeline Description | Book Exact (All 3) | Book Lenient (Anchor) | Pickup Match | Drop Match | Seats Match | Clarify Success | SOS Success | WER (27 clips) | Latency p50 | Latency p95 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| System A | Whisper (hint) -> Rule-based -> Resolver | 1 of 19 | 4 of 19 | 5 of 19 | 3 of 19 | 17 of 19 | 5 of 5 | 2 of 2 | 44.4% | 2197.01 ms | 2774.93 ms |
| System A-prime | Ground Truth Text -> Rule-based -> Resolver | 10 of 19 | 11 of 19 | 15 of 19 | 14 of 19 | 16 of 19 | 5 of 5 | 1 of 2 | 0.0% | 8.98 ms | 212.98 ms |
| System B (with hint) | Whisper (hint) -> Muse Spark Open -> Resolver | 2 of 19 | 5 of 19 | 6 of 19 | 6 of 19 | 17 of 19 | 5 of 5 | 2 of 2 | 44.4% | 5192.16 ms | 7110.57 ms |
| System B (no hint) | Whisper (raw) -> Muse Spark Open -> Resolver | 1 of 19 | 3 of 19 | 5 of 19 | 7 of 19 | 16 of 19 | 5 of 5 | 2 of 2 | 55.0% | 5097.54 ms | 8268.70 ms |
| System C | Ground Truth Text -> Muse Spark Open -> Resolver | 13 of 19 | 14 of 19 | 16 of 19 | 16 of 19 | 17 of 19 | 5 of 5 | 2 of 2 | 0.0% | 2353.72 ms | 3479.85 ms |

#### System A-prime Split and Language Breakdown

- Split breakdown (Headline Book Rows: 5 Dev, 14 Test):
  - Dev: 3 of 5 exact
  - Test: 7 of 14 exact
- Language breakdown (Headline Book Rows: 7 English, 8 Pidgin, 4 Hausa):
  - English: 4 of 7 exact
  - Pidgin: 4 of 8 exact
  - Hausa: 2 of 4 exact

#### System A-prime In-Vocabulary versus Out-of-Vocabulary

| System | In-Vocabulary (All 3 Correct) | In-Vocabulary Count | Out-of-Vocabulary (All 3 Correct) | Out-of-Vocabulary Count |
|---|---|---|---|---|
| System A-prime | 8 of 12 | 12 | 2 of 7 | 7 |

#### Cross-Corridor Subgroup Comparison

| Clip | Spoken Route | System A | System A-prime | System B (hint) | System B (no hint) | System C | Valid Booking? (A-prime) |
|---|---|---|---|---|---|---|---|
| c04 | Jabi Lake Mall to Zuba interchange | clarify | clarify | clarify | clarify | clarify | N/A (clarified) |
| c06 | Kubwa Gate 1 to Wuse Zone 4 | clarify | book | clarify | clarify | book | No (wrong pickup and seats) |
| c07 | Nyanya Underbridge to Central Area | clarify | clarify | clarify | clarify | book | N/A (clarified) |
| c10 | Kubwa Arab Road to Mabushi Bridge | clarify | book | clarify | clarify | book | Yes (exact match) |
| c23 | Bridge after Gwarinpa to Central Area | clarify | clarify | clarify | clarify | clarify | N/A (clarified) |

### Clarify Rate on Headline Booking Rows

On the 19 headline booking requests, system behavior was classified into: (1) booked correctly with all 3 slots exact; (2) booked with a wrong pickup, drop, or seat count; (3) asked a clarifying question instead of booking; and (4) other terminal action (e.g. short trip decline).

| System | Booked Correctly (Exact) | Booked with Wrong Slots | Asked Clarifying Question | Other Action (Decline) | Total Headline Book Rows |
|---|---|---|---|---|---|
| System A | 0 of 19 | 1 of 19 | 18 of 19 | 0 of 19 | 19 |
| System A-prime | 9 of 19 | 2 of 19 | 7 of 19 | 1 of 19 | 19 |
| System B (with hint) | 1 of 19 | 1 of 19 | 17 of 19 | 0 of 19 | 19 |
| System B (without hint) | 0 of 19 | 1 of 19 | 18 of 19 | 0 of 19 | 19 |
| System C | 12 of 19 | 2 of 19 | 4 of 19 | 1 of 19 | 19 |

Perfect clarify and sos scores are easy for a system that asks a question whenever it is unsure.

### Word Error Rate (WER) Normalization Analysis

In the codebase evaluation harness, word error rate is calculated using character-level normalization before Levenshtein alignment:
1. Case folding to lowercase.
2. Token extraction with regular expression `[a-zA-Z0-9']+`, which keeps alphanumeric characters, numbers as digits, and internal apostrophes in contractions (such as "i'm" or "don't") while stripping external punctuation.
3. Macro-averaged word edit distance divided by reference token length across the 27 evaluation clips (excluding the 3 artificial noise-masked clips c24, c25, c26).

To evaluate sensitivity to normalization conventions, WER was also recomputed using simple normalization (convert to lowercase, strip all punctuation including apostrophes with `[^\w\s]`, collapse whitespace, and split by spaces).

| System | Code Regex WER (Apostrophes Kept) | Simple Normalization Macro WER | Simple Normalization Micro WER |
|---|---|---|---|
| System A (with hint) | 44.4% | 44.5% | 42.8% |
| System B (with hint) | 44.4% | 44.5% | 42.8% |
| System B (no hint) | 55.4% (55.0% reported) | 54.8% | 52.2% |
| System C (Ground Truth) | 0.0% | 0.0% | 0.0% |
| System A-prime (Ground Truth) | 0.0% | 0.0% | 0.0% |

Under simple normalization, apostrophes are deleted so contractions like "i'm" become single unpunctuated tokens ("im"). Both methods confirm that ASR errors affect approximately 43% to 55% of spoken tokens.

### What the Results Mean

Language understanding on typed text works reasonably well across both methods, correctly booking 13 of 19 requests with the language model and 10 of 19 with deterministic rules. Speech recognition on recorded audio is the primary bottleneck in the pipeline, dropping exact booking accuracy to 2 of 19 with prompt hints and 1 of 19 without hints while exhibiting word error rates of 44.4% to 55.0%. Performance is heavily dependent on gazetteer coverage, succeeding on 11 of 12 in-vocabulary requests for the model but only 2 of 7 out-of-vocabulary requests where spoken place names lacked exact aliases. Comparing the two text-based extractors directly on typed text, the language model (13 of 19 exact matches) outperforms the deterministic rule-based path (10 of 19 exact matches). The rule-based path frequently asks clarifying questions when colloquial phrasing deviates from scripted regular expressions, leading to 7 clarification turns on booking requests compared to 4 for the model. All evaluation audio clips were collected from a small sample of 30 recordings provided by only two male speakers from the same household. Because of the small sample size and narrow acoustic distribution, these results do not claim generalization to broader commuter demographics or transit settings across Nigeria.
