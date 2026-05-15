# Voice Services Specialist
# 音声サービス スペシャリスト
# Chuyên Gia Dịch Vụ Voice

**Role**: Voice Services Pattern Expert
**Focus**: STT, TTS, audio processing, voice streaming
**Patterns**: 2.11-2.15 (5 patterns)
**Technology**: Whisper, VietTTS, pydub, httpx
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST VoiceServices {
  ROLE: "Speech-to-Text and Text-to-Speech Expert"

  RESPONSIBILITIES: [
    "Transcribe citizen voice reports (Vietnamese)",
    "Generate voice notifications (TTS)",
    "Handle audio format conversion",
    "Implement voice streaming",
    "Manage voice provider factory"
  ]

  TECH_STACK: {
    primary: "FastAPI + Python 3.11",
    stt_provider: "Whisper (large-v3)",
    tts_provider: "VietTTS",
    libraries: ["httpx", "pydub", "asyncio"],
    patterns: ["Provider factory", "Async streaming", "Audio processing"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_use_cases: ["Voice reports", "Accessibility notifications", "Real-time transcription"]
  }
}
```

---

## Pattern 2.11: Speech-to-Text Service

### Overview

```pseudo
PATTERN SpeechToText {
  PURPOSE: "Transcribe audio to text with Vietnamese support"
  PROBLEM: "Need accurate Vietnamese transcription for citizen reports"
  SOLUTION: "Whisper STT provider with language detection"
  USE_CASES: ["Transcribe voice reports", "Convert audio evidence to text", "Real-time call transcription"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW WhisperSTT_Transcribe {
  INPUT: { audio_bytes: bytes, language: string = "vi", format: string = "wav" }

  STEPS: {
    STEP_1_VALIDATE_AND_REQUEST: {
      description: "Validate audio format and send transcription request"
      logic: |
        SUPPORTED_FORMATS = ["wav", "mp3", "ogg", "flac"]
        IF format NOT IN SUPPORTED_FORMATS THEN THROW ERROR "Unsupported audio format: " + format

        files = { "file": ("audio." + format, audio_bytes, "audio/" + format) }
        data = { "language": language, "model": "large-v3" }

        response = AWAIT httpx_client.post(
          url=whisper_base_url + "/v1/audio/transcriptions",
          files=files, data=data, timeout=300.0
        )
    }

    STEP_2_PARSE: {
      description: "Parse transcription result"
      logic: |
        result = response.json()
        transcription = TranscriptionResult(
          text=result.text,
          language=result.get("language", language),
          confidence=result.get("confidence", 0.9),
          duration=result.get("duration", 0.0)
        )
        RETURN transcription
    }
  }

  ERROR_HANDLING: "TimeoutError: Return error, audio too long | HTTPError: Retry with exponential backoff (max 3 attempts) | ValidationError: Return error with details"
  OUTPUT: { text: string, language: string, confidence: float, duration: float }
}
```

### Key Interfaces

```typescript
interface TranscriptionRequest {
  audio_bytes: Uint8Array;
  language?: string;
  format?: 'wav' | 'mp3' | 'ogg' | 'flac';
}

interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  duration: number;
}

class WhisperSTTProvider {
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
  async health_check(): Promise<boolean>;
}
```

---

## Pattern 2.12: Text-to-Speech Service

### Overview

```pseudo
PATTERN TextToSpeech {
  PURPOSE: "Convert text notifications to Vietnamese speech"
  PROBLEM: "Provide accessible voice notifications"
  SOLUTION: "VietTTS provider with voice customization"
  USE_CASES: ["Voice notifications for case updates", "Accessibility features", "IVR system responses"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VietTTS_Synthesize {
  INPUT: { text: string, voice: string = "female", speed: float = 1.0, format: string = "mp3" }

  STEPS: {
    STEP_1_VALIDATE: {
      description: "Validate input parameters"
      logic: |
        IF text.length == 0 THEN THROW ERROR "Text cannot be empty"
        IF text.length > 5000 THEN THROW ERROR "Text too long (max 5000 characters)"

        VALID_VOICES = ["male", "female"]
        IF voice NOT IN VALID_VOICES THEN THROW ERROR "Invalid voice: " + voice

        IF speed < 0.5 OR speed > 2.0 THEN THROW ERROR "Speed must be between 0.5 and 2.0"
    }

    STEP_2_SYNTHESIZE: {
      description: "Send synthesis request and extract audio"
      logic: |
        response = AWAIT httpx_client.post(
          url=viettts_base_url + "/v1/audio/speech",
          json={ text: text, voice: voice, speed: speed, format: format },
          timeout=60.0
        )

        audio_bytes = response.content
        duration = FLOAT(response.headers.get("X-Audio-Duration", 0.0))
        synthesis_result = SynthesisResult(audio_bytes=audio_bytes, format=format, duration=duration)
        RETURN synthesis_result
    }
  }

  ERROR_HANDLING: "TimeoutError: Return error, synthesis timeout | HTTPError: Retry once, then return error | ValidationError: Return error with details"
  OUTPUT: { audio_bytes: bytes, format: string, duration: float }
}
```

### Key Interfaces

```typescript
interface SynthesisRequest {
  text: string;
  voice?: 'male' | 'female';
  speed?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

interface SynthesisResult {
  audio_bytes: Uint8Array;
  format: string;
  duration: number;
}

class VietTTSProvider {
  async synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
  async health_check(): Promise<boolean>;
}
```

---

## Pattern 2.13: Audio Format Handling

### Overview

```pseudo
PATTERN AudioFormatHandling {
  PURPOSE: "Convert and validate audio formats"
  PROBLEM: "Multiple audio formats need standardization"
  SOLUTION: "Use pydub for format conversion and validation"
  USE_CASES: ["Convert to WAV for STT", "Validate uploaded audio", "Get audio duration"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW AudioProcessor_ConvertToWAV {
  INPUT: { audio_bytes: bytes, source_format: string }

  STEPS: {
    STEP_1_VALIDATE_AND_CONVERT: {
      description: "Validate format, load audio, and convert to WAV"
      logic: |
        SUPPORTED_FORMATS = ["wav", "mp3", "ogg", "flac"]
        IF source_format NOT IN SUPPORTED_FORMATS THEN THROW ERROR "Unsupported format: " + source_format

        audio = AudioSegment.from_file(BytesIO(audio_bytes), format=source_format)
        audio = audio.set_frame_rate(16000).set_channels(1)  // Standard format for STT

        output = BytesIO()
        audio.export(output, format="wav")
        wav_bytes = output.getvalue()
        RETURN wav_bytes
    }
  }

  ERROR_HANDLING: "AudioFormatError: Return error, invalid audio data | ConversionError: Return error with details"
  OUTPUT: bytes
}

WORKFLOW AudioProcessor_GetDuration {
  INPUT: { audio_bytes: bytes, format: string }

  STEPS: {
    STEP_1_CALCULATE: {
      description: "Load audio and calculate duration"
      logic: |
        audio = AudioSegment.from_file(BytesIO(audio_bytes), format=format)
        duration_ms = LEN(audio)
        duration_sec = duration_ms / 1000.0
        RETURN duration_sec
    }
  }

  OUTPUT: float
}
```

### Key Interfaces

```typescript
class AudioProcessor {
  convertToWAV(audio_bytes: Uint8Array, source_format: string): Uint8Array;
  getDuration(audio_bytes: Uint8Array, format: string): number;
  validateFormat(audio_bytes: Uint8Array, expected_format: string): boolean;
}
```

---

## Pattern 2.14: Voice Provider Factory

### Overview

```pseudo
PATTERN VoiceProviderFactory {
  PURPOSE: "Manage STT and TTS providers with health checks"
  PROBLEM: "Need centralized provider management"
  SOLUTION: "Factory pattern with language-based selection"
  USE_CASES: ["Get STT provider for Vietnamese", "Get TTS provider with health check", "Manage provider lifecycle"]
  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW VoiceProviderFactory_GetSTT {
  CLASS_STATE: { _stt_providers: dict = {}, _tts_providers: dict = {} }
  INPUT: { language: string = "vi" }

  STEPS: {
    STEP_1_CHECK_OR_CREATE: {
      description: "Check cache, create provider, health check, and cache"
      logic: |
        IF language IN _stt_providers THEN RETURN _stt_providers[language]

        provider = WhisperSTTProvider()
        is_healthy = AWAIT provider.health_check()

        IF NOT is_healthy THEN THROW ERROR "STT provider not available for: " + language

        _stt_providers[language] = provider
        RETURN provider
    }
  }

  OUTPUT: WhisperSTTProvider
}

WORKFLOW VoiceProviderFactory_GetTTS {
  INPUT: { language: string = "vi" }

  STEPS: {
    STEP_1_CHECK_OR_CREATE: {
      description: "Check cache or create TTS provider"
      logic: |
        IF language IN _tts_providers THEN RETURN _tts_providers[language]

        provider = VietTTSProvider()
        is_healthy = AWAIT provider.health_check()

        IF NOT is_healthy THEN THROW ERROR "TTS provider not available for: " + language

        _tts_providers[language] = provider
        RETURN provider
    }
  }

  OUTPUT: VietTTSProvider
}
```

---

## Pattern 2.15: Voice Streaming

### Overview

```pseudo
PATTERN VoiceStreaming {
  PURPOSE: "Real-time voice streaming for live transcription"
  PROBLEM: "Long audio recordings need chunk-based processing"
  SOLUTION: "Buffer audio chunks and stream transcription results"
  USE_CASES: ["Live call transcription", "Real-time voice reports", "Long audio file processing"]
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VoiceStream_TranscribeStream {
  INPUT: { audio_stream: AsyncGenerator<bytes>, language: string = "vi" }
  CONFIG: { chunk_duration: float = 5.0, sample_rate: integer = 16000, sample_width: integer = 2 }

  STEPS: {
    STEP_1_INITIALIZE_AND_STREAM: {
      description: "Initialize buffer and process audio stream"
      logic: |
        buffer = BytesArray()
        chunk_size = INT(sample_rate * sample_width * chunk_duration)
        stt_provider = AWAIT VoiceProviderFactory.get_stt_provider(language)

        ASYNC FOR chunk IN audio_stream:
          buffer.EXTEND(chunk)

          WHILE buffer.length >= chunk_size:
            audio_chunk = bytes(buffer[:chunk_size])
            buffer = buffer[chunk_size:]

            result = AWAIT stt_provider.transcribe(
              audio_bytes=audio_chunk, language=language, format="wav"
            )

            IF result.text.STRIP().length > 0 THEN YIELD result.text
          END WHILE
        END FOR

        // Process remaining buffer
        IF buffer.length > 0 THEN
          result = AWAIT stt_provider.transcribe(audio_bytes=bytes(buffer), language=language, format="wav")
          IF result.text.STRIP().length > 0 THEN YIELD result.text
        END IF
    }
  }

  ERROR_HANDLING: "TranscriptionError: Log error, skip chunk, continue streaming | BufferOverflow: Process buffer immediately, prevent memory issues | ConnectionError: Close stream, return partial results"
  OUTPUT: AsyncGenerator<string>
}
```

### Key Interfaces

```typescript
class VoiceStreamService {
  async transcribeStream(
    audio_stream: AsyncIterable<Uint8Array>,
    language?: string
  ): AsyncGenerator<string, void, unknown>;
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    VoiceReport: { max_duration: 300, language: "Vietnamese", vietnamese_term: "Báo Cáo Bằng Giọng Nói" },
    Notification: { types: ["case_update", "payment_reminder", "document_ready"], vietnamese_term: "Thông Báo" }
  }
  BUSINESS_RULES: {
    transcription: "All voice reports must be transcribed within 60 seconds",
    tts_notifications: "Voice notifications for accessibility compliance",
    language_support: "Primary language is Vietnamese, fallback to English"
  }
}
```

---

## Pattern Summary

```pseudo
PATTERN_SUMMARY = {
  total_patterns: 5,
  categories: { stt: ["2.11"], tts: ["2.12"], audio_processing: ["2.13"], provider_management: ["2.14"], streaming: ["2.15"] },
  performance_targets: { stt: "< 60 seconds for 5-minute audio", tts: "< 5 seconds for 1000 characters", streaming: "< 5 seconds latency per chunk" }
}
```

---

## Testing Guidelines

```pseudo
TESTING VoiceServices_Tests {
  UNIT_TESTS: [
    { name: "should transcribe Vietnamese audio", input: { audio: "vietnamese_sample.wav" }, expected: { text: "Chào bạn", language: "vi" } },
    { name: "should convert MP3 to WAV", input: { format: "mp3" }, expected: { output_format: "wav", sample_rate: 16000 } }
  ]
  INTEGRATION_TESTS: ["Transcribe voice report end-to-end", "Generate notification audio", "Stream long audio file"]
}
```

---

## References

- **Whisper**: https://github.com/openai/whisper
- **VietTTS**: Vietnamese TTS engine
- **pydub**: https://github.com/jiaaro/pydub
- **Internal Docs**: `/docs/architecture/voice-services.md`

---

**Version**: 1.0
**Created**: 2026-01-03
**Patterns**: 2.11-2.15 (5 patterns)
**Lines**: ~530 target
