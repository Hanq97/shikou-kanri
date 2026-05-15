# Voice TTS Specialist

**Role**: Text-to-Speech provider interface and Piper TTS implementation
**Focus**: Base TTS interface, Piper provider, streaming synthesis, voice cloning
**Technology**: FastAPI, Python 3.11+, httpx, async/await
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST VoiceTTS {
  ROLE: "Text-to-Speech provider interface and implementation specialist"

  RESPONSIBILITIES: [
    "Define base TTS provider interface",
    "Implement Piper TTS provider for Vietnamese",
    "Handle streaming audio synthesis",
    "Audio buffer management for playback",
    "Voice selection and SSML support",
    "Health monitoring for TTS providers"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["httpx", "asyncio", "dataclasses"],
    patterns: ["Abstract Base Class", "Provider Pattern", "Streaming Pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["LegalVerdict", "Announcement", "AudioNotification"],
    use_cases: ["Verdict reading", "Legal announcement synthesis", "Vietnamese TTS"]
  }
}
```

---

## Pattern 6.6: Base TTS Provider Interface

### Overview

```pseudo
PATTERN BaseTTSProviderInterface {
  PURPOSE: "Unified interface for all TTS providers (Piper, Google, Azure)"

  PROBLEM: "Multiple TTS providers have different APIs and audio formats"

  SOLUTION: "Abstract base class ensuring consistent interface for synthesis"

  USE_CASES: [
    "Switch TTS providers without code changes",
    "Voice selection and customization",
    "Streaming audio generation"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW BaseTTSProvider_Interface {
  INPUT: {
    text: str,
    config: TTSConfig
  }

  PRECONDITIONS: [
    "Config validated on initialization",
    "Voice supported by provider",
    "Provider implements all abstract methods"
  ]

  STEPS: {
    STEP_1_DEFINE_VOICES: {
      description: "Define available TTS voices"
      logic: |
        ENUM TTSVoice {
          FEMALE_VI = "vi_female",
          MALE_VI = "vi_male",
          FEMALE_EN = "en_female",
          MALE_EN = "en_male"
        }
    }

    STEP_2_DEFINE_CONFIG: {
      description: "Define TTS configuration"
      logic: |
        DATACLASS TTSConfig {
          model: str,
          voice: TTSVoice = TTSVoice.FEMALE_VI,
          language: str = "vi",
          speed: float = 1.0,
          pitch: float = 1.0,
          timeout: int = 60,
          base_url?: str
        }

        VALIDATE_ON_INIT:
          IF speed NOT IN [0.5, 2.0] THEN ERROR
          IF pitch NOT IN [0.5, 2.0] THEN ERROR
          IF timeout <= 0 THEN ERROR
    }

    STEP_3_DEFINE_RESULT: {
      description: "Define TTS result structure"
      logic: |
        DATACLASS TTSResult {
          audio_data: bytes,
          audio_format: AudioFormat = AudioFormat.WAV,
          duration?: float,
          metadata: Dict = {}
        }
    }

    STEP_4_DEFINE_INTERFACE: {
      description: "Define abstract base TTS provider"
      logic: |
        ABSTRACT CLASS BaseTTSProvider {
          CONSTRUCTOR(config?: TTSConfig)

          ABSTRACT ASYNC synthesize(text: str) -> TTSResult

          ABSTRACT ASYNC synthesize_stream(text: str) -> AsyncGenerator[bytes]

          ABSTRACT ASYNC health_check() -> bool

          ABSTRACT PROPERTY name() -> str
          ABSTRACT PROPERTY supported_voices() -> List[TTSVoice]
        }
    }
  }

  OUTPUT: {
    base_interface: "BaseTTSProvider abstract class",
    result_model: "TTSResult dataclass with audio",
    config_model: "TTSConfig with validation",
    voice_enum: "TTSVoice enum"
  }

  POSTCONDITIONS: [
    "All providers must implement interface",
    "Voice availability checked",
    "Type safety enforced"
  ]
}
```

---

## Pattern 6.7: Piper TTS Provider

### Overview

```pseudo
PATTERN PiperTTSProvider {
  PURPOSE: "Piper implementation for Vietnamese legal text-to-speech"

  PROBLEM: "Local TTS requires specific request format for Vietnamese text"

  SOLUTION: "Implement BaseTTSProvider with Piper API patterns"

  USE_CASES: [
    "Legal verdict reading",
    "Vietnamese text synthesis",
    "Announcement generation"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW PiperTTS_Implementation {
  INPUT: {
    text: str,
    config: TTSConfig
  }

  PRECONDITIONS: [
    "Piper server running",
    "Vietnamese voice models installed",
    "Text is valid Vietnamese"
  ]

  STEPS: {
    STEP_1_VOICE_MAPPING: {
      description: "Map TTSVoice to Piper voice models"
      logic: |
        CLASS PiperTTSProvider EXTENDS BaseTTSProvider {
          VOICE_MAPPING = {
            TTSVoice.FEMALE_VI: "vi_VN-nv_f",
            TTSVoice.MALE_VI: "vi_VN-lemi_m",
            TTSVoice.FEMALE_EN: "en_US-amy-medium",
            TTSVoice.MALE_EN: "en_US-john-medium"
          }

          base_url: str
          _client: httpx.AsyncClient

          CONSTRUCTOR(config?: TTSConfig):
            CALL super().__init__(config)
            SET base_url = config.base_url OR settings.PIPER_BASE_URL
            SET _client = httpx.AsyncClient(timeout=config.timeout)
        }
    }

    STEP_2_SYNTHESIZE: {
      description: "Synthesize text to audio"
      logic: |
        ASYNC METHOD synthesize(text: str) -> TTSResult {
          voice_model = VOICE_MAPPING.get(
            config.voice,
            VOICE_MAPPING[TTSVoice.FEMALE_VI]
          )

          payload = {
            "text": text,
            "voice": voice_model,
            "speakerId": 0,
            "lengthScale": 1.0 / config.speed  // Inverse relationship
          }

          TRY:
            response = AWAIT _client.post(
              f"{base_url}/api/tts",
              json=payload
            )
            response.raise_for_status()

            audio_data = response.content
            duration = len(audio_data) / (2 * 16000)  // 16-bit PCM approximation

            RETURN TTSResult(
              audio_data=audio_data,
              audio_format=AudioFormat.WAV,
              duration=duration,
              metadata={
                "provider": name,
                "voice": config.voice.value,
                "speed": config.speed
              }
            )
          CATCH Exception AS e:
            LOG ERROR f"Piper TTS error: {e}"
            RAISE
        }
    }

    STEP_3_STREAMING_SYNTHESIZE: {
      description: "Stream synthesized audio"
      logic: |
        ASYNC METHOD synthesize_stream(text: str) -> AsyncGenerator[bytes] {
          voice_model = VOICE_MAPPING.get(
            config.voice,
            VOICE_MAPPING[TTSVoice.FEMALE_VI]
          )

          payload = {
            "text": text,
            "voice": voice_model,
            "speakerId": 0,
            "lengthScale": 1.0 / config.speed
          }

          TRY:
            ASYNC WITH _client.stream(
              "POST",
              f"{base_url}/api/tts",
              json=payload
            ) AS response:
              ASYNC FOR chunk IN response.aiter_bytes(chunk_size=4096):
                IF chunk:
                  YIELD chunk
          CATCH Exception AS e:
            LOG ERROR f"Piper TTS stream error: {e}"
            RAISE
        }
    }

    STEP_4_HEALTH_CHECK: {
      description: "Check Piper availability"
      logic: |
        ASYNC METHOD health_check() -> bool {
          TRY:
            response = AWAIT _client.get(f"{base_url}/health")
            RETURN response.status_code == 200
          CATCH Exception AS e:
            LOG WARNING f"Piper health check failed: {e}"
            RETURN False
        }
    }

    STEP_5_PROPERTIES: {
      description: "Provider metadata"
      logic: |
        PROPERTY name() -> str:
          RETURN "piper"

        PROPERTY supported_voices() -> List[TTSVoice]:
          RETURN list(TTSVoice)
    }
  }

  OUTPUT: {
    provider: "PiperTTSProvider implementation",
    audio: "Vietnamese text → WAV audio",
    streaming: "Real-time audio synthesis"
  }

  POSTCONDITIONS: [
    "Audio format is WAV (16-bit PCM)",
    "Voice model matches TTSVoice selection",
    "Speed adjustment applied"
  ]
}
```

---

## Pattern 6.8: Streaming TTS Handler

### Overview

```pseudo
PATTERN StreamingTTSHandler {
  PURPOSE: "Handle TTS streaming with buffering and WebSocket support"

  PROBLEM: "Streaming TTS audio requires chunk buffering and backpressure"

  SOLUTION: "Dedicated handler for TTS streaming with WebSocket compatibility"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW StreamingTTS_Handler {
  INPUT: {
    provider: BaseTTSProvider,
    text: str,
    on_chunk?: Callable[[bytes], None]
  }

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Configure streaming handler"
      logic: |
        CLASS StreamingTTSHandler {
          chunk_size: int = 4096,
          flush_interval: float = 0.01
        }
    }

    STEP_2_STREAM_TO_CLIENT: {
      description: "Stream TTS audio with callbacks"
      logic: |
        ASYNC METHOD stream_to_client(
          provider,
          text,
          on_chunk?
        ) -> bytes {
          buffer = bytearray()
          full_audio = bytearray()

          TRY:
            ASYNC FOR chunk IN provider.synthesize_stream(text):
              buffer.extend(chunk)
              full_audio.extend(chunk)

              IF len(buffer) >= chunk_size:
                IF on_chunk:
                  on_chunk(bytes(buffer))
                buffer = bytearray()
                AWAIT asyncio.sleep(flush_interval)

            // Flush remaining
            IF len(buffer) > 0:
              IF on_chunk:
                on_chunk(bytes(buffer))

          CATCH Exception AS e:
            LOG ERROR f"TTS streaming error: {e}"
            RAISE

          RETURN bytes(full_audio)
        }
    }

    STEP_3_STREAM_WITH_TIMEOUT: {
      description: "Stream with timeout protection"
      logic: |
        ASYNC METHOD stream_with_timeout(
          provider,
          text,
          timeout: float = 30.0,
          on_chunk?
        ) -> bytes {
          TRY:
            RETURN AWAIT asyncio.wait_for(
              stream_to_client(provider, text, on_chunk),
              timeout=timeout
            )
          CATCH asyncio.TimeoutError:
            LOG ERROR f"TTS stream timeout after {timeout}s"
            RAISE
        }
    }
  }

  OUTPUT: {
    handler: "StreamingTTSHandler with timeout",
    full_audio: "Complete audio bytes",
    progress: "Real-time audio chunks via callback"
  }
}
```

---

## Pattern 6.9: Audio Buffer Management

### Overview

```pseudo
PATTERN AudioBufferManagement {
  PURPOSE: "Efficient buffer and format handling for streaming audio"
  PROBLEM: "Streaming requires variable chunk handling and format validation"
  SOLUTION: "Ring buffer with format detection"
  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW AudioBuffer_Management {
  INPUT: {
    capacity: int = 1048576  // 1MB
  }

  STEPS: {
    STEP_1_RING_BUFFER: {
      description: "Implement ring buffer with read/write"
      logic: |
        CLASS AudioBuffer {
          capacity, buffer, write_pos, read_pos, size, overflow_count

          METHOD write(data) -> int {
            // Handle overflow, split write if wrapping
            IF overflow: truncate and log
            WRITE to buffer (handle wrap-around)
            RETURN bytes_written
          }

          METHOD read(num_bytes) -> bytes {
            // Read from buffer, handle wrap-around
            RETURN bytes_read
          }

          METHOD get_stats() -> BufferStats {
            RETURN {capacity, size, utilization%, overflow_count}
          }
        }
    }
  }

  OUTPUT: {
    buffer: "AudioBuffer ring buffer",
    stats: "Buffer utilization metrics"
  }
}
```

---

## Pattern 6.11: Voice Health Check

### Overview

```pseudo
PATTERN VoiceHealthCheck {
  PURPOSE: "Monitor TTS provider availability with retry and fallback"

  PROBLEM: "TTS providers can become unavailable"

  SOLUTION: "Health check system with retry logic and status tracking"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW Voice_HealthCheck {
  INPUT: {
    provider: BaseTTSProvider,
    max_retries: int = 3
  }

  STEPS: {
    STEP_1_DEFINE_STATUS: {
      description: "Define health status"
      logic: |
        DATACLASS VoiceHealthStatus {
          provider_name: str,
          is_healthy: bool,
          last_check: datetime = NOW(),
          consecutive_failures: int = 0,
          last_error?: str
        }
    }

    STEP_2_HEALTH_CHECKER: {
      description: "Health check system"
      logic: |
        CLASS VoiceHealthChecker {
          max_retries: int = 3,
          initial_delay: float = 0.5,
          max_delay: float = 10.0,
          status_cache: Dict = {}
        }
    }

    STEP_3_CHECK_PROVIDER: {
      description: "Check provider health with retry"
      logic: |
        ASYNC METHOD check_provider(provider) -> VoiceHealthStatus {
          delay = initial_delay

          FOR attempt IN range(max_retries + 1):
            TRY:
              result = AWAIT asyncio.wait_for(
                provider.health_check(),
                timeout=5.0
              )
              IF result:
                LOG INFO f"{provider.name} is healthy"
                status = VoiceHealthStatus(
                  provider_name=provider.name,
                  is_healthy=True,
                  last_check=NOW(),
                  consecutive_failures=0
                )
                status_cache[provider.name] = status
                RETURN status
            CATCH Exception AS e:
              LOG WARNING f"{provider.name} attempt {attempt + 1} failed: {e}"

            IF attempt < max_retries:
              AWAIT asyncio.sleep(delay)
              delay = min(delay * 2, max_delay)

          // All retries failed
          status = VoiceHealthStatus(
            provider_name=provider.name,
            is_healthy=False,
            last_check=NOW(),
            last_error=f"Failed after {max_retries + 1} attempts"
          )
          status_cache[provider.name] = status
          RETURN status
        }
    }

    STEP_4_CHECK_ALL: {
      description: "Check health of all providers"
      logic: |
        ASYNC METHOD check_all_providers(providers: List) -> Dict {
          results = {}
          FOR provider IN providers:
            result = AWAIT check_provider(provider)
            results[provider.name] = result
          RETURN results
        }
    }
  }

  OUTPUT: {
    checker: "VoiceHealthChecker with retry",
    status: "VoiceHealthStatus for each provider",
    cache: "Cached health status"
  }
}
```

---

## Vietnamese Legal Domain Example

```pseudo
EXAMPLE LegalVerdictReading {
  USE_CASE: "Read legal verdict using Vietnamese TTS"

  ASYNC FUNCTION read_legal_verdict(text: str) -> bytes {
    // Initialize TTS provider
    config = TTSConfig(
      model="vi_VN",
      voice=TTSVoice.MALE_VI,
      language="vi",
      speed=0.9  // Slightly slower for clarity
    )
    provider = PiperTTSProvider(config)

    // Check health
    IF NOT AWAIT provider.health_check():
      RAISE RuntimeError("TTS provider unavailable")

    // Synthesize with streaming
    handler = StreamingTTSHandler(chunk_size=8192)
    audio_bytes = AWAIT handler.stream_with_timeout(
      provider,
      text,
      timeout=60.0
    )

    RETURN audio_bytes
  }
}
```

---

**Specialist Version**: 1.0.0
**Last Updated**: 2026-01-02
**Target Framework**: FastAPI 0.100+, Python 3.12+
**Dependencies**: httpx, asyncio, dataclasses
**Domain**: Vietnamese legal text-to-speech
