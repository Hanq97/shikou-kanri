# Voice Specialists INDEX

**Category**: Voice (Speech-to-Text + Text-to-Speech)
**Total Files**: 2
**Total Lines**: ~1,416 (777 + 639)
**Compliance**: 100% (all ≤800 lines)
**Last Updated**: 2026-01-02

---

## File Structure

### 1. voice-stt-specialist.md (777 lines)
**Purpose**: Speech-to-Text provider interface and implementations

**Patterns**:
- Pattern 6.1: Base STT Provider Interface
- Pattern 6.2: Whisper STT Provider
- Pattern 6.3: Streaming STT Handler
- Pattern 6.4: Audio Preprocessing
- Pattern 6.5: Voice Activity Detection (VAD)

**Key Features**:
- Abstract base STT interface (BaseSTTProvider)
- Whisper implementation for Vietnamese legal audio
- Real-time streaming transcription
- Audio preprocessing (ffmpeg-based resampling)
- VAD using Silero VAD model
- Language detection (Vietnamese, English, Japanese)

**Domain**:
- Legal hearing transcription
- Audio evidence analysis
- Vietnamese speech recognition

---

### 2. voice-tts-specialist.md (639 lines)
**Purpose**: Text-to-Speech provider interface and implementations

**Patterns**:
- Pattern 6.6: Base TTS Provider Interface
- Pattern 6.7: Piper TTS Provider
- Pattern 6.8: Streaming TTS Handler
- Pattern 6.9: Audio Buffer Management
- Pattern 6.10: Voice Health Check

**Key Features**:
- Abstract base TTS interface (BaseTTSProvider)
- Piper TTS implementation for Vietnamese
- Streaming audio synthesis
- Audio buffer management (ring buffer)
- Voice selection and SSML support
- Health monitoring with retry logic

**Domain**:
- Legal verdict reading
- Vietnamese legal announcement synthesis
- Audio notification generation

---

## Usage Patterns

### Legal Hearing Transcription (STT)
```python
from voice_stt_specialist import WhisperSTTProvider, VADEngine, AudioPreprocessor

# Initialize provider
config = STTConfig(model="base", language="vi", task="transcribe")
provider = WhisperSTTProvider(config)

# Preprocess audio
preprocessor = AudioPreprocessor()
result = await preprocessor.preprocess(audio_bytes, AudioFormat.MP3)

# Detect speech segments
vad = VADEngine()
await vad.initialize()
segments = await vad.detect_segments(result.processed_audio)

# Transcribe segments
for seg in segments:
    segment_audio = result.processed_audio[start_byte:end_byte]
    stt_result = await provider.transcribe(segment_audio, AudioFormat.WAV)
```

### Legal Verdict Reading (TTS)
```python
from voice_tts_specialist import PiperTTSProvider, StreamingTTSHandler

# Initialize provider
config = TTSConfig(model="vi_VN", voice=TTSVoice.MALE_VI, language="vi", speed=0.9)
provider = PiperTTSProvider(config)

# Check health
if not await provider.health_check():
    raise RuntimeError("TTS provider unavailable")

# Synthesize with streaming
handler = StreamingTTSHandler(chunk_size=8192)
audio_bytes = await handler.stream_with_timeout(provider, text, timeout=60.0)
```

---

## Technology Stack

**Common Dependencies**:
- httpx (async HTTP client)
- asyncio (async/await patterns)
- dataclasses (data models)

**STT-Specific**:
- ffmpeg (audio preprocessing)
- Silero VAD (voice activity detection)

**TTS-Specific**:
- Piper TTS (local Vietnamese TTS)
- Audio buffer management

---

## Domain Context

**Industry**: Vietnamese Legal P2P Insurance & Lending
**Key Entities**: LegalHearing, CourtProceeding, AudioEvidence, LegalVerdict
**Use Cases**:
1. Legal hearing transcription (STT)
2. Audio evidence analysis (STT)
3. Legal verdict reading (TTS)
4. Announcement synthesis (TTS)

---

## Workflow Format

All specialists use pseudo-code WORKFLOW format:
- Specialist Identity (Role, Responsibilities, Tech Stack, Domain Context)
- Pattern Overview (Purpose, Problem, Solution, Use Cases, Complexity)
- Workflow (Input, Preconditions, Steps, Output, Postconditions)
- Vietnamese Legal Domain Examples

---

**INDEX Version**: 1.0.0
**Last Updated**: 2026-01-02
**Status**: Production-ready, 100% compliant
