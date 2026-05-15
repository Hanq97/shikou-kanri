# Voice STT Specialist

**Role**: Speech-to-Text provider interface and Whisper implementation
**Focus**: Base STT interface, Whisper provider, streaming transcription, VAD
**Technology**: FastAPI, Python 3.11+, httpx, async/await, ffmpeg
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST VoiceSTT {
  ROLE: "Speech-to-Text provider interface and implementation specialist"

  RESPONSIBILITIES: [
    "Define base STT provider interface",
    "Implement Whisper STT provider",
    "Handle real-time streaming transcription",
    "Audio preprocessing and format conversion",
    "Voice Activity Detection (VAD)",
    "Language detection for multilingual audio"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["httpx", "asyncio", "ffmpeg", "dataclasses"],
    patterns: ["Abstract Base Class", "Provider Pattern", "Streaming Pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["LegalHearing", "CourtProceeding", "AudioEvidence"],
    use_cases: ["Legal hearing transcription", "Audio evidence analysis", "Vietnamese speech recognition"]
  }
}
```

---

## Pattern 6.1: Base STT Provider Interface

### Overview

```pseudo
PATTERN BaseSTTProviderInterface {
  PURPOSE: "Unified interface for all STT providers (Whisper, Google, Azure)"

  PROBLEM: "Multiple STT providers have different APIs and response formats"

  SOLUTION: "Abstract base class ensuring consistent interface for transcription"

  USE_CASES: [
    "Switch STT providers without code changes",
    "Health monitoring for provider availability",
    "Streaming transcription support"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW BaseSTTProvider_Interface {
  INPUT: {
    audio_data: bytes,
    audio_format: AudioFormat,
    config: STTConfig
  }

  PRECONDITIONS: [
    "Config validated on initialization",
    "Audio format supported by provider",
    "Provider implements all abstract methods"
  ]

  STEPS: {
    STEP_1_DEFINE_FORMATS: {
      description: "Define supported audio formats"
      logic: |
        ENUM AudioFormat {
          WAV = "wav",
          MP3 = "mp3",
          OGG = "ogg",
          WEBM = "webm",
          FLAC = "flac"
        }
    }

    STEP_2_DEFINE_CONFIG: {
      description: "Define STT configuration"
      logic: |
        DATACLASS STTConfig {
          model: str,
          language: str = "auto",
          task: str = "transcribe",
          timeout: int = 60,
          base_url?: str
        }

        VALIDATE_ON_INIT:
          IF language NOT IN ["auto", "en", "vi", "ja"] THEN ERROR
          IF task NOT IN ["transcribe", "translate"] THEN ERROR
          IF timeout <= 0 THEN ERROR
    }

    STEP_3_DEFINE_RESULT: {
      description: "Define STT result structure"
      logic: |
        DATACLASS STTResult {
          text: str,
          language?: str,
          confidence?: float,
          segments: List[Dict] = [],
          duration?: float,
          metadata: Dict = {}
        }

        segments_format: {
          id: int,
          start: float,
          end: float,
          text: str
        }
    }

    STEP_4_DEFINE_INTERFACE: {
      description: "Define abstract base STT provider"
      logic: |
        ABSTRACT CLASS BaseSTTProvider {
          CONSTRUCTOR(config?: STTConfig)

          ABSTRACT ASYNC transcribe(
            audio_data: bytes,
            audio_format: AudioFormat
          ) -> STTResult

          ABSTRACT ASYNC transcribe_stream(
            audio_stream: AsyncGenerator[bytes],
            audio_format: AudioFormat
          ) -> AsyncGenerator[str]

          ABSTRACT ASYNC health_check() -> bool

          ABSTRACT PROPERTY name() -> str
          ABSTRACT PROPERTY supported_formats() -> List[AudioFormat]
        }
    }
  }

  OUTPUT: {
    base_interface: "BaseSTTProvider abstract class",
    result_model: "STTResult dataclass with segments",
    config_model: "STTConfig with validation",
    audio_formats: "AudioFormat enum"
  }

  POSTCONDITIONS: [
    "All providers must implement interface",
    "Audio format compatibility checked",
    "Type safety enforced"
  ]
}
```

---

## Pattern 6.2: Whisper STT Provider

### Overview

```pseudo
PATTERN WhisperSTTProvider {
  PURPOSE: "Whisper implementation for Vietnamese legal audio transcription"

  PROBLEM: "Whisper requires specific API format and streaming handling"

  SOLUTION: "Implement BaseSTTProvider with Whisper API patterns"

  USE_CASES: [
    "Legal hearing transcription",
    "Vietnamese speech recognition",
    "Multi-language detection"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW WhisperSTT_Implementation {
  INPUT: {
    audio_data: bytes,
    audio_format: AudioFormat,
    config: STTConfig
  }

  PRECONDITIONS: [
    "Whisper server running",
    "Audio data valid",
    "Format supported (WAV, MP3, OGG, FLAC)"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize Whisper provider"
      logic: |
        CLASS WhisperSTTProvider EXTENDS BaseSTTProvider {
          base_url: str
          _client: httpx.AsyncClient

          CONSTRUCTOR(config?: STTConfig):
            CALL super().__init__(config)
            SET base_url = config.base_url OR settings.WHISPER_BASE_URL
            SET _client = httpx.AsyncClient(timeout=config.timeout)
        }
    }

    STEP_2_SINGLE_TRANSCRIBE: {
      description: "Transcribe single audio file"
      logic: |
        ASYNC METHOD transcribe(audio_data, audio_format) -> STTResult {
          files = {
            "file": (f"audio.{audio_format.value}", audio_data)
          }

          data = {
            "model": config.model,
            "language": config.language IF != "auto" ELSE None,
            "task": config.task,
            "response_format": "verbose_json"
          }

          TRY:
            response = AWAIT _client.post(
              f"{base_url}/v1/audio/transcriptions",
              files=files,
              data=data
            )
            response.raise_for_status()
            result = response.json()

            RETURN STTResult(
              text=result["text"],
              language=result.get("language"),
              segments=result.get("segments", []),
              duration=result.get("duration"),
              metadata={
                "provider": name,
                "task": config.task
              }
            )
          CATCH Exception AS e:
            LOG ERROR f"Whisper STT error: {e}"
            RAISE
        }
    }

    STEP_3_STREAMING_TRANSCRIBE: {
      description: "Stream transcription for real-time audio"
      logic: |
        ASYNC METHOD transcribe_stream(
          audio_stream: AsyncGenerator,
          audio_format: AudioFormat
        ) -> AsyncGenerator[str] {
          buffer = bytearray()
          chunk_size = 16000 * 2 * 5  // 5 seconds at 16kHz, 16-bit

          ASYNC FOR chunk IN audio_stream:
            buffer.extend(chunk)

            IF len(buffer) >= chunk_size:
              audio_chunk = bytes(buffer[:chunk_size])
              buffer = buffer[chunk_size:]

              TRY:
                result = AWAIT transcribe(audio_chunk, audio_format)
                IF result.text.strip():
                  YIELD result.text
              CATCH Exception AS e:
                LOG WARNING f"Stream chunk error: {e}"
                CONTINUE

          // Process remaining buffer
          IF len(buffer) > 0:
            TRY:
              result = AWAIT transcribe(bytes(buffer), audio_format)
              IF result.text.strip():
                YIELD result.text
            CATCH Exception AS e:
              LOG WARNING f"Final buffer error: {e}"
        }
    }

    STEP_4_HEALTH_CHECK: {
      description: "Check Whisper availability"
      logic: |
        ASYNC METHOD health_check() -> bool {
          TRY:
            response = AWAIT _client.get(f"{base_url}/health")
            RETURN response.status_code == 200
          CATCH Exception AS e:
            LOG WARNING f"Health check failed: {e}"
            RETURN False
        }
    }

    STEP_5_PROPERTIES: {
      description: "Provider metadata"
      logic: |
        PROPERTY name() -> str:
          RETURN "whisper"

        PROPERTY supported_formats() -> List[AudioFormat]:
          RETURN [AudioFormat.WAV, AudioFormat.MP3, AudioFormat.OGG, AudioFormat.FLAC]
    }
  }

  OUTPUT: {
    provider: "WhisperSTTProvider implementation",
    transcription: "Vietnamese legal audio → text",
    streaming: "Real-time transcription support"
  }

  POSTCONDITIONS: [
    "Transcription includes segments with timestamps",
    "Language detected for multilingual audio",
    "Streaming chunks buffered properly"
  ]
}
```

---

## Pattern 6.3: Streaming STT Handler

### Overview

```pseudo
PATTERN StreamingSTTHandler {
  PURPOSE: "Handle real-time audio streaming with timeout and callbacks"

  PROBLEM: "Real-time audio requires buffering, timeout, progress tracking"

  SOLUTION: "Dedicated handler for chunk buffering and progressive output"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW StreamingSTT_Handler {
  INPUT: {
    provider: BaseSTTProvider,
    audio_stream: AsyncGenerator[bytes],
    audio_format: AudioFormat,
    on_text_chunk?: Callable[[str], None]
  }

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Configure streaming handler"
      logic: |
        CLASS StreamingSTTHandler {
          min_chunk_size: int = 4096,
          timeout: float = 60.0,
          flush_interval: float = 0.1
        }
    }

    STEP_2_PROCESS_STREAM: {
      description: "Process streaming audio with callbacks"
      logic: |
        ASYNC METHOD process_stream(
          provider,
          audio_stream,
          audio_format,
          on_text_chunk?
        ) -> str {
          full_text = []
          buffer = bytearray()

          TRY:
            ASYNC FOR chunk IN audio_stream:
              buffer.extend(chunk)

              IF len(buffer) >= min_chunk_size:
                ASYNC FOR text IN provider.transcribe_stream(
                  _buffer_generator(bytes(buffer)),
                  audio_format
                ):
                  full_text.append(text)
                  IF on_text_chunk:
                    on_text_chunk(text)
                  AWAIT asyncio.sleep(flush_interval)

                buffer = bytearray()

            // Process remaining buffer
            IF len(buffer) > 0:
              ASYNC FOR text IN provider.transcribe_stream(
                _buffer_generator(bytes(buffer)),
                audio_format
              ):
                full_text.append(text)
                IF on_text_chunk:
                  on_text_chunk(text)

          CATCH asyncio.TimeoutError:
            LOG ERROR f"Stream timeout after {timeout}s"
            RAISE
          CATCH Exception AS e:
            LOG ERROR f"Stream error: {e}"
            RAISE

          RETURN "".join(full_text)
        }
    }

    STEP_3_BUFFER_GENERATOR: {
      description: "Convert buffer to async generator"
      logic: |
        STATIC ASYNC METHOD _buffer_generator(data: bytes) -> AsyncGenerator {
          YIELD data
        }
    }
  }

  OUTPUT: {
    handler: "StreamingSTTHandler with timeout",
    full_text: "Complete transcription",
    progress: "Real-time text chunks via callback"
  }
}
```

---

## Pattern 6.4: Audio Preprocessing

### Overview

```pseudo
PATTERN AudioPreprocessing {
  PURPOSE: "Resample, convert, and optimize audio for STT"

  PROBLEM: "Raw audio needs format conversion and noise reduction"

  SOLUTION: "Unified preprocessing using ffmpeg for resampling/conversion"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW Audio_Preprocessing {
  INPUT: {
    audio_data: bytes,
    source_format: AudioFormat,
    target_sample_rate: int = 16000
  }

  STEPS: {
    STEP_1_DEFINE_RESULT: {
      description: "Define preprocessing result"
      logic: |
        DATACLASS AudioPreprocessResult {
          processed_audio: bytes,
          original_sample_rate: int,
          target_sample_rate: int = 16000,
          channels: int = 1,
          duration: float = 0.0,
          format: AudioFormat = AudioFormat.WAV
        }
    }

    STEP_2_PREPROCESS: {
      description: "Resample and convert using ffmpeg"
      logic: |
        STATIC ASYNC METHOD preprocess(
          audio_data,
          source_format,
          target_sample_rate = 16000
        ) -> AudioPreprocessResult {
          TRY:
            process = AWAIT asyncio.create_subprocess_exec(
              "ffmpeg",
              "-i", "pipe:0",
              "-acodec", "pcm_s16le",
              "-ac", "1",  // mono
              "-ar", str(target_sample_rate),
              "-f", "wav",
              "pipe:1",
              stdin=asyncio.subprocess.PIPE,
              stdout=asyncio.subprocess.PIPE,
              stderr=asyncio.subprocess.PIPE
            )

            processed_audio, stderr = AWAIT process.communicate(input=audio_data)

            IF process.returncode != 0:
              LOG ERROR f"ffmpeg error: {stderr.decode()}"
              RAISE RuntimeError

            duration = len(processed_audio) / (2 * target_sample_rate)

            RETURN AudioPreprocessResult(
              processed_audio=processed_audio,
              original_sample_rate=16000,
              target_sample_rate=target_sample_rate,
              channels=1,
              duration=duration,
              format=AudioFormat.WAV
            )
          CATCH Exception AS e:
            LOG ERROR f"Preprocessing error: {e}"
            RAISE
        }
    }

    STEP_3_GET_INFO: {
      description: "Get audio metadata using ffprobe"
      logic: |
        STATIC METHOD get_audio_info(audio_data: bytes) -> Dict {
          TRY:
            result = subprocess.run([
              "ffprobe",
              "-v", "error",
              "-show_format",
              "-show_streams",
              "-of", "json",
              "-"
            ], input=audio_data, capture_output=True, timeout=5)

            info = json.loads(result.stdout)
            stream = info["streams"][0]

            RETURN {
              "sample_rate": int(stream.get("sample_rate", 16000)),
              "channels": int(stream.get("channels", 1)),
              "duration": float(stream.get("duration", 0)),
              "codec": stream.get("codec_name", "unknown")
            }
          CATCH Exception AS e:
            LOG WARNING f"Could not get audio info: {e}"
            RETURN default_audio_info
        }
    }
  }

  OUTPUT: {
    preprocessor: "AudioPreprocessor class",
    processed_audio: "16kHz mono WAV",
    metadata: "Sample rate, channels, duration"
  }
}
```

---

## Pattern 6.5: Voice Activity Detection (VAD)

### Overview

```pseudo
PATTERN VoiceActivityDetection {
  PURPOSE: "Detect speech segments in audio for efficient processing"

  PROBLEM: "Streaming audio contains silence and noise"

  SOLUTION: "VAD using Silero VAD model for speech detection"

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW VAD_Detection {
  INPUT: {
    audio_data: bytes,
    sample_rate: int = 16000,
    threshold: float = 0.5
  }

  STEPS: {
    STEP_1_DEFINE_SEGMENT: {
      description: "Define VAD segment"
      logic: |
        DATACLASS VADSegment {
          start_time: float,
          end_time: float,
          confidence: float,
          is_speech: bool
        }
    }

    STEP_2_INITIALIZE_ENGINE: {
      description: "Initialize VAD engine"
      logic: |
        CLASS VADEngine {
          threshold: float = 0.5,
          min_speech_duration: float = 0.2,
          silence_duration: float = 0.5,
          _model: Optional

          ASYNC METHOD initialize():
            // Load Silero VAD model
            _model = load_silero_vad_model()
            LOG INFO "VAD model initialized"
        }
    }

    STEP_3_DETECT_SEGMENTS: {
      description: "Detect speech segments in audio"
      logic: |
        ASYNC METHOD detect_segments(
          audio_data: bytes,
          sample_rate: int = 16000
        ) -> List[VADSegment] {
          IF NOT _model:
            AWAIT initialize()

          segments = []
          frame_size = int(sample_rate * 0.032)  // 32ms frames
          frame_count = len(audio_data) // (2 * frame_size)

          in_speech = False
          speech_start = 0
          silence_frames = 0

          FOR frame_idx IN range(frame_count):
            offset = frame_idx * 2 * frame_size
            frame = audio_data[offset : offset + 2 * frame_size]

            confidence = _get_vad_confidence(frame)

            IF confidence > threshold:
              IF NOT in_speech:
                in_speech = True
                speech_start = frame_idx * 0.032
              silence_frames = 0
            ELSE:
              IF in_speech:
                silence_frames += 1

                IF silence_frames > int(silence_duration / 0.032):
                  speech_end = (frame_idx - silence_frames) * 0.032
                  IF (speech_end - speech_start) >= min_speech_duration:
                    segments.append(VADSegment(
                      start_time=speech_start,
                      end_time=speech_end,
                      confidence=confidence,
                      is_speech=True
                    ))
                  in_speech = False

          // Handle last segment
          IF in_speech:
            speech_end = frame_count * 0.032
            IF (speech_end - speech_start) >= min_speech_duration:
              segments.append(VADSegment(
                start_time=speech_start,
                end_time=speech_end,
                confidence=0.8,
                is_speech=True
              ))

          RETURN segments
        }
    }

    STEP_4_SPLIT_BY_VAD: {
      description: "Split audio into speech segments"
      logic: |
        ASYNC METHOD split_by_vad(
          audio_data: bytes,
          sample_rate: int = 16000
        ) -> List[bytes] {
          segments = AWAIT detect_segments(audio_data, sample_rate)
          audio_chunks = []

          FOR seg IN segments:
            start_byte = int(seg.start_time * sample_rate * 2)
            end_byte = int(seg.end_time * sample_rate * 2)
            audio_chunks.append(audio_data[start_byte:end_byte])

          RETURN audio_chunks
        }
    }
  }

  OUTPUT: {
    vad_engine: "VADEngine with Silero VAD",
    segments: "List of speech segments with timestamps",
    split_audio: "Audio split by speech activity"
  }
}
```

---

## Vietnamese Legal Domain Example

```pseudo
EXAMPLE LegalHearingTranscription {
  USE_CASE: "Transcribe Vietnamese legal hearing audio"

  ASYNC FUNCTION transcribe_legal_hearing(audio_bytes: bytes) -> Dict {
    // Initialize STT provider
    config = STTConfig(
      model="base",
      language="vi",
      task="transcribe"
    )
    provider = WhisperSTTProvider(config)

    // Check health
    IF NOT AWAIT provider.health_check():
      RAISE RuntimeError("STT provider unavailable")

    // Preprocess audio
    preprocessor = AudioPreprocessor()
    result = AWAIT preprocessor.preprocess(
      audio_bytes,
      source_format=AudioFormat.MP3
    )

    // Detect speech segments
    vad = VADEngine()
    AWAIT vad.initialize()
    segments = AWAIT vad.detect_segments(result.processed_audio)

    // Transcribe each segment
    transcriptions = []
    FOR seg IN segments:
      start_byte = int(seg.start_time * 16000 * 2)
      end_byte = int(seg.end_time * 16000 * 2)
      segment_audio = result.processed_audio[start_byte:end_byte]

      stt_result = AWAIT provider.transcribe(
        segment_audio,
        AudioFormat.WAV
      )
      transcriptions.append({
        "timestamp": seg.start_time,
        "text": stt_result.text,
        "confidence": stt_result.confidence
      })

    RETURN {
      "provider": provider.name,
      "transcriptions": transcriptions,
      "duration": result.duration
    }
  }
}
```

---

**Specialist Version**: 1.0.0
**Last Updated**: 2026-01-02
**Target Framework**: FastAPI 0.100+, Python 3.12+
**Dependencies**: httpx, asyncio, ffmpeg, dataclasses
**Domain**: Vietnamese legal audio transcription
