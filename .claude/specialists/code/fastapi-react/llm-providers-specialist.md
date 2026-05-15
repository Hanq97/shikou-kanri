# FastAPI LLM Providers Specialist
*LLM Integration Patterns for FastAPI + React Applications*

**日本語**: FastAPI LLMプロバイダー専門家 - LLM統合パターンガイド
**Tiếng Việt**: Chuyên gia LLM Providers cho FastAPI - Hướng dẫn mô hình tích hợp LLM

---

## Role & Responsibilities

This specialist handles LLM provider integration patterns for FastAPI backends. Key responsibilities:

- Design abstraction layers for multiple LLM providers (vLLM, Ollama, OpenAI)
- Implement provider fallback chains and health monitoring
- Manage streaming responses with buffering and timeout protection
- Track token usage and costs across providers
- Validate LLM responses and handle errors gracefully
- Support Vietnamese legal domain use cases (contract analysis, document classification)

**Target Users**: Backend developers, system architects, LLM integration specialists

---

## Pattern 4.1: Base LLM Provider Interface

### Problem
Multiple LLM providers (vLLM, Ollama, OpenAI) have different APIs and response formats. Without a unified interface, switching providers requires code changes throughout the application.

### Solution
Create an abstract base class that all providers must implement, ensuring consistent interface for generate, streaming, and health checks.

### Key Points
- Type-safe configuration with validation
- Support both streaming and non-streaming modes
- Built-in health check mechanism
- Provider metadata (name, model, capabilities)

### Implementation Code
```python
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class LLMResponse:
    """Response from LLM provider."""
    content: str
    model: str
    tokens_used: int
    finish_reason: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


@dataclass
class LLMConfig:
    """Configuration for LLM provider."""
    model: str
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 0.9
    timeout: int = 60
    base_url: Optional[str] = None
    api_key: Optional[str] = None

    def __post_init__(self):
        """Validate configuration values."""
        if not 0.0 <= self.temperature <= 2.0:
            raise ValueError("temperature must be between 0.0 and 2.0")
        if not 0.0 <= self.top_p <= 1.0:
            raise ValueError("top_p must be between 0.0 and 1.0")
        if self.max_tokens <= 0:
            raise ValueError("max_tokens must be positive")
        if self.timeout <= 0:
            raise ValueError("timeout must be positive")


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or LLMConfig(model="default")

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> LLMResponse:
        """Generate response from prompt."""
        pass

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is available."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        pass
```

### Constraints
- Must implement all abstract methods
- Configuration validated on instantiation
- Async-only interface (no sync methods)
- Type hints required for all parameters

---

## Pattern 4.2: LLM Configuration with Validation

### Problem
LLM settings vary across providers (temperature, token limits, API keys). Invalid configurations cause runtime errors or silent failures.

### Solution
Use `@dataclass` with `__post_init__` validation for type-safe, validated configuration objects.

### Key Points
- Dataclass provides built-in equality and repr
- Validation prevents invalid values at construction
- Supports both local and cloud providers
- Clear error messages for configuration issues

### Implementation Code
```python
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class ProviderType(str, Enum):
    """Supported LLM providers."""
    VLLM = "vllm"
    OLLAMA = "ollama"
    OPENAI = "openai"


@dataclass
class ProviderConfig:
    """Provider-specific configuration."""
    type: ProviderType
    model: str
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 0.9
    timeout: int = 60
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    retry_count: int = 3
    retry_delay: float = 1.0

    def __post_init__(self):
        """Validate all configuration parameters."""
        if not 0.0 <= self.temperature <= 2.0:
            raise ValueError(f"temperature {self.temperature} out of range [0.0, 2.0]")
        if not 0.0 <= self.top_p <= 1.0:
            raise ValueError(f"top_p {self.top_p} out of range [0.0, 1.0]")
        if self.max_tokens <= 0:
            raise ValueError(f"max_tokens must be > 0, got {self.max_tokens}")
        if self.timeout <= 0:
            raise ValueError(f"timeout must be > 0, got {self.timeout}")
        if self.retry_count < 0:
            raise ValueError(f"retry_count must be >= 0, got {self.retry_count}")
        if self.type == ProviderType.OPENAI and not self.api_key:
            raise ValueError("OpenAI provider requires api_key")
```

### Constraints
- Configuration immutable after initialization
- Validation is strict and fails fast
- All numeric bounds checked
- Provider-specific fields required

---

## Pattern 4.3: vLLM Provider Implementation

### Problem
vLLM is a high-throughput local inference engine, but requires different API patterns than other providers.

### Solution
Implement BaseLLMProvider with OpenAI-compatible API format and proper error handling.

### Key Points
- Uses OpenAI-compatible chat completions API
- Supports streaming with SSE format
- Health check via `/health` endpoint
- Proper token usage tracking

### Implementation Code
```python
from typing import AsyncGenerator, Optional
import httpx
import json
from src.integrations.llm.base import BaseLLMProvider, LLMResponse, LLMConfig
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class VLLMProvider(BaseLLMProvider):
    """vLLM provider for local high-throughput inference."""

    def __init__(self, config: Optional[LLMConfig] = None):
        super().__init__(config)
        self.base_url = (config.base_url or settings.VLLM_BASE_URL).rstrip('/')
        self._client = httpx.AsyncClient(timeout=config.timeout)

    @property
    def name(self) -> str:
        return "vllm"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> LLMResponse:
        """Generate response using vLLM."""
        messages = self._build_messages(prompt, system_prompt, context)

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "top_p": self.config.top_p,
        }

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=data["model"],
                tokens_used=data["usage"]["total_tokens"],
                finish_reason=data["choices"][0]["finish_reason"],
                metadata={"provider": self.name},
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"vLLM HTTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"vLLM error: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using vLLM."""
        messages = self._build_messages(prompt, system_prompt, context)

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "top_p": self.config.top_p,
            "stream": True,
        }

        async with self._client.stream(
            "POST",
            f"{self.base_url}/v1/chat/completions",
            json=payload,
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"]
                        if delta.get("content"):
                            yield delta["content"]
                    except json.JSONDecodeError:
                        continue

    async def health_check(self) -> bool:
        """Check if vLLM is available."""
        try:
            response = await self._client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"vLLM health check failed: {e}")
            return False

    def _build_messages(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> list:
        """Build message array for OpenAI-compatible API."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if context:
            messages.append({
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {prompt}"
            })
        else:
            messages.append({"role": "user", "content": prompt})

        return messages
```

### Constraints
- Requires `/health` endpoint to be available
- Streaming response format must be SSE
- Model must be OpenAI-compatible

---

## Pattern 4.4: Ollama Provider Implementation

### Problem
Ollama uses a different API format (non-streaming format with `/api/generate` endpoint) than OpenAI-compatible providers.

### Solution
Implement provider-specific message building and response parsing for Ollama's API.

### Key Points
- Uses text-based prompt format (not messages array)
- Streaming responses are JSONL (one JSON per line)
- Health check via `/api/tags` endpoint
- Token duration metrics instead of token count

### Implementation Code
```python
from typing import AsyncGenerator, Optional
import httpx
import json
from src.integrations.llm.base import BaseLLMProvider, LLMResponse, LLMConfig
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class OllamaProvider(BaseLLMProvider):
    """Ollama provider for local inference."""

    def __init__(self, config: Optional[LLMConfig] = None):
        super().__init__(config)
        self.base_url = (config.base_url or settings.OLLAMA_BASE_URL).rstrip('/')
        self._client = httpx.AsyncClient(timeout=config.timeout)

    @property
    def name(self) -> str:
        return "ollama"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> LLMResponse:
        """Generate response using Ollama."""
        full_prompt = self._build_prompt(prompt, system_prompt, context)

        payload = {
            "model": self.config.model,
            "prompt": full_prompt,
            "temperature": self.config.temperature,
            "options": {
                "num_predict": self.config.max_tokens,
                "top_p": self.config.top_p,
            },
        }

        try:
            response = await self._client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            return LLMResponse(
                content=data["response"],
                model=data["model"],
                tokens_used=data.get("eval_count", 0),
                finish_reason="stop",
                metadata={
                    "provider": self.name,
                    "eval_count": data.get("eval_count"),
                    "duration_ms": data.get("total_duration", 0) // 1_000_000,
                },
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama HTTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using Ollama."""
        full_prompt = self._build_prompt(prompt, system_prompt, context)

        payload = {
            "model": self.config.model,
            "prompt": full_prompt,
            "temperature": self.config.temperature,
            "stream": True,
            "options": {
                "num_predict": self.config.max_tokens,
                "top_p": self.config.top_p,
            },
        }

        async with self._client.stream(
            "POST",
            f"{self.base_url}/api/generate",
            json=payload,
        ) as response:
            async for line in response.aiter_lines():
                try:
                    data = json.loads(line)
                    if data.get("response"):
                        yield data["response"]
                    if data.get("done"):
                        break
                except json.JSONDecodeError:
                    continue

    async def health_check(self) -> bool:
        """Check if Ollama is available."""
        try:
            response = await self._client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            return False

    def _build_prompt(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> str:
        """Build full prompt for Ollama."""
        parts = []

        if system_prompt:
            parts.append(f"System: {system_prompt}")

        if context:
            parts.append(f"Context: {context}")

        parts.append(f"User: {prompt}")

        return "\n\n".join(parts)
```

### Constraints
- Ollama uses prompt strings, not message arrays
- Response format differs significantly from OpenAI
- No native token counting (uses eval_count instead)

---

## Pattern 4.5: OpenAI Provider Implementation

### Problem
OpenAI API requires authentication and has specific response formats. Should be fallback when local providers unavailable.

### Solution
Implement with proper API key handling, authentication headers, and detailed token tracking.

### Key Points
- Bearer token authentication
- Detailed token usage breakdown (prompt vs completion)
- OpenAI-compatible message format
- Ideal for production fallback

### Implementation Code
```python
from typing import AsyncGenerator, Optional
import httpx
import json
from src.integrations.llm.base import BaseLLMProvider, LLMResponse, LLMConfig
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider for cloud LLM inference."""

    def __init__(self, config: Optional[LLMConfig] = None):
        super().__init__(config)
        self.api_key = config.api_key or settings.OPENAI_API_KEY
        self.base_url = (config.base_url or "https://api.openai.com").rstrip('/')
        self._client = httpx.AsyncClient(
            timeout=config.timeout,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

    @property
    def name(self) -> str:
        return "openai"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> LLMResponse:
        """Generate response using OpenAI."""
        messages = self._build_messages(prompt, system_prompt, context)

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "top_p": self.config.top_p,
        }

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=data["model"],
                tokens_used=data["usage"]["total_tokens"],
                finish_reason=data["choices"][0]["finish_reason"],
                metadata={
                    "provider": self.name,
                    "prompt_tokens": data["usage"]["prompt_tokens"],
                    "completion_tokens": data["usage"]["completion_tokens"],
                },
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenAI HTTP error: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using OpenAI."""
        messages = self._build_messages(prompt, system_prompt, context)

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "top_p": self.config.top_p,
            "stream": True,
        }

        async with self._client.stream(
            "POST",
            f"{self.base_url}/v1/chat/completions",
            json=payload,
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"]
                        if delta.get("content"):
                            yield delta["content"]
                    except json.JSONDecodeError:
                        continue

    async def health_check(self) -> bool:
        """Check if OpenAI API is available."""
        try:
            response = await self._client.get(f"{self.base_url}/v1/models")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"OpenAI health check failed: {e}")
            return False

    def _build_messages(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> list:
        """Build message array for OpenAI API."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if context:
            messages.append({
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {prompt}"
            })
        else:
            messages.append({"role": "user", "content": prompt})

        return messages
```

### Constraints
- Requires valid OpenAI API key
- May incur costs for API usage
- Rate limits apply
- Should only be used as fallback

---

## Pattern 4.6: LLM Factory with Fallback Chain

### Problem
Managing multiple providers manually is error-prone. Need automatic provider selection and fallback when one provider fails.

### Solution
Factory pattern with health monitoring and automatic fallback chain: vLLM → Ollama → OpenAI

### Key Points
- Lazy initialization (only when first needed)
- Health check monitoring of active provider
- Automatic failover on provider failure
- Manual provider selection supported
- Singleton pattern for single factory instance

### Implementation Code
```python
from typing import Optional, List
import asyncio
from src.integrations.llm.base import BaseLLMProvider, LLMConfig
from src.integrations.llm.vllm import VLLMProvider
from src.integrations.llm.ollama import OllamaProvider
from src.integrations.llm.openai import OpenAIProvider
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class LLMProviderFactory:
    """
    Factory for LLM providers with automatic fallback chain.

    Fallback order: vLLM → Ollama → OpenAI

    Usage:
        await LLMProviderFactory.initialize()
        provider = await LLMProviderFactory.get_provider()
        response = await provider.generate("Phân tích hợp đồng này...")
    """

    _providers: List[BaseLLMProvider] = []
    _active_provider: Optional[BaseLLMProvider] = None
    _initialized: bool = False
    _health_check_interval: int = 300  # 5 minutes

    @classmethod
    async def initialize(cls) -> None:
        """Initialize provider chain."""
        if cls._initialized:
            return

        configs = {
            "vllm": LLMConfig(
                model=settings.VLLM_MODEL,
                base_url=settings.VLLM_BASE_URL,
                timeout=60,
            ),
            "ollama": LLMConfig(
                model=settings.OLLAMA_MODEL,
                base_url=settings.OLLAMA_BASE_URL,
                timeout=60,
            ),
            "openai": LLMConfig(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                timeout=60,
            ),
        }

        cls._providers = [
            VLLMProvider(configs["vllm"]),
            OllamaProvider(configs["ollama"]),
            OpenAIProvider(configs["openai"]),
        ]

        await cls._select_active_provider()
        cls._initialized = True
        logger.info(f"LLM Factory initialized with {len(cls._providers)} providers")

    @classmethod
    async def _select_active_provider(cls) -> None:
        """Select first healthy provider from fallback chain."""
        for provider in cls._providers:
            logger.info(f"Checking provider: {provider.name}")

            if await provider.health_check():
                cls._active_provider = provider
                logger.info(f"✅ Active LLM provider: {provider.name}")
                return

        raise RuntimeError("❌ No LLM providers available. Check vLLM, Ollama, and OpenAI.")

    @classmethod
    async def get_provider(cls) -> BaseLLMProvider:
        """
        Get active provider with automatic fallback.

        If active provider becomes unhealthy, automatically switches to next.
        """
        if not cls._initialized:
            await cls.initialize()

        # Check if active provider is still healthy
        if cls._active_provider and not await cls._active_provider.health_check():
            logger.warning(
                f"⚠️ Provider {cls._active_provider.name} unhealthy, attempting fallback"
            )
            await cls._select_active_provider()

        return cls._active_provider

    @classmethod
    async def get_provider_by_name(cls, name: str) -> Optional[BaseLLMProvider]:
        """Get specific provider by name."""
        if not cls._initialized:
            await cls.initialize()

        for provider in cls._providers:
            if provider.name == name:
                return provider

        logger.warning(f"Provider {name} not found")
        return None

    @classmethod
    def get_active_provider_name(cls) -> Optional[str]:
        """Get name of current active provider."""
        return cls._active_provider.name if cls._active_provider else None
```

### Constraints
- Only one provider can be active at a time
- Factory is singleton (class-level state)
- Health checks add latency
- Async initialization required

---

## Pattern 4.7: Streaming Response Handling

### Problem
Streaming responses need buffering for smooth output, timeout protection, and error recovery.

### Solution
Unified streaming handler with buffering, timeout, and callback support.

### Key Points
- Buffer chunks before yielding for smooth output
- Timeout protection prevents hanging
- Callback support for real-time processing
- Works with all provider streaming responses

### Implementation Code
```python
from typing import AsyncGenerator, Callable, Optional
import asyncio
from src.core.logging import get_logger

logger = get_logger(__name__)


class StreamingHandler:
    """
    Unified streaming response handler.

    Features:
    - Buffering for smooth output
    - Timeout protection
    - Error recovery
    - Token counting
    """

    def __init__(
        self,
        buffer_size: int = 5,
        flush_interval: float = 0.05,
    ):
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
        self.total_tokens = 0

    async def handle_stream(
        self,
        stream: AsyncGenerator[str, None],
        on_chunk: Optional[Callable[[str], None]] = None,
    ) -> str:
        """
        Handle streaming response with buffering.

        Args:
            stream: Async generator yielding chunks
            on_chunk: Optional callback for each chunk

        Returns:
            Full response text
        """
        buffer = []
        full_response = []

        try:
            async for chunk in stream:
                buffer.append(chunk)
                full_response.append(chunk)
                self.total_tokens += len(chunk.split())

                # Flush buffer when full
                if len(buffer) >= self.buffer_size:
                    flushed = "".join(buffer)
                    if on_chunk:
                        on_chunk(flushed)
                    buffer = []
                    await asyncio.sleep(self.flush_interval)

            # Flush remaining buffer
            if buffer:
                flushed = "".join(buffer)
                if on_chunk:
                    on_chunk(flushed)

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            raise

        return "".join(full_response)

    async def handle_stream_with_timeout(
        self,
        stream: AsyncGenerator[str, None],
        timeout: float = 30.0,
        on_chunk: Optional[Callable[[str], None]] = None,
    ) -> str:
        """Handle streaming with timeout protection."""
        try:
            return await asyncio.wait_for(
                self.handle_stream(stream, on_chunk),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            logger.error(f"Stream timeout after {timeout}s")
            raise
```

### Constraints
- Buffer size must be > 0
- Timeout must be reasonable (not too short)
- Callbacks should be fast (non-blocking)

---

## Pattern 4.8: Health Check with Retry Logic

### Problem
Network issues can cause sporadic health check failures. Need retry logic to avoid false negatives.

### Solution
Implement health check with exponential backoff and maximum retry count.

### Key Points
- Configurable retry attempts
- Exponential backoff delays
- Separate health check for each provider
- Logging for diagnostics

### Implementation Code
```python
from typing import Optional
import asyncio
from src.core.logging import get_logger

logger = get_logger(__name__)


class HealthChecker:
    """Health check with retry logic."""

    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 0.5,
        max_delay: float = 10.0,
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay

    async def check_with_retry(
        self,
        check_fn,
        provider_name: str,
    ) -> bool:
        """
        Perform health check with exponential backoff retry.

        Args:
            check_fn: Async function returning bool
            provider_name: Name for logging

        Returns:
            True if health check passed, False otherwise
        """
        delay = self.initial_delay

        for attempt in range(self.max_retries + 1):
            try:
                result = await asyncio.wait_for(check_fn(), timeout=5.0)
                if result:
                    if attempt > 0:
                        logger.info(f"{provider_name} recovered after {attempt} retries")
                    return True
            except Exception as e:
                logger.warning(
                    f"{provider_name} health check attempt {attempt + 1} failed: {e}"
                )

            if attempt < self.max_retries:
                await asyncio.sleep(delay)
                delay = min(delay * 2, self.max_delay)

        return False
```

### Constraints
- Retry logic adds latency
- Must not overwhelm the provider with checks
- Backoff strategy prevents thundering herd

---

## Pattern 4.9: Token Usage Tracking

### Problem
Need to track token consumption for cost estimation and quota management, especially for Vietnamese legal document analysis.

### Solution
Dataclass for token metrics with cost calculation based on provider.

### Key Points
- Separate tracking for prompt vs completion tokens
- Provider-specific cost calculation
- Aggregatable across requests
- Clear metadata for analytics

### Implementation Code
```python
from dataclasses import dataclass, field
from typing import Optional, Dict
from datetime import datetime


@dataclass
class TokenMetrics:
    """Token usage metrics."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    provider: str = "unknown"
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def calculate_cost(self, provider: str) -> float:
        """Calculate cost based on provider rates."""
        # Pricing as of 2025 (example)
        pricing = {
            "openai": {"prompt": 0.5 / 1_000_000, "completion": 1.5 / 1_000_000},
            "vllm": {"prompt": 0, "completion": 0},  # Local
            "ollama": {"prompt": 0, "completion": 0},  # Local
        }

        rates = pricing.get(provider, {"prompt": 0, "completion": 0})
        self.cost_usd = (
            self.prompt_tokens * rates["prompt"] +
            self.completion_tokens * rates["completion"]
        )
        return self.cost_usd

    def __add__(self, other: "TokenMetrics") -> "TokenMetrics":
        """Aggregate token metrics."""
        return TokenMetrics(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
            total_tokens=self.total_tokens + other.total_tokens,
            cost_usd=self.cost_usd + other.cost_usd,
        )
```

### Constraints
- Cost calculation varies by provider
- Pricing updates require manual updates
- Token counts may not be exact (estimates)

---

## Pattern 4.10: Timeout and Error Handling

### Problem
LLM requests can hang or fail silently. Need robust error handling with clear error types.

### Solution
Custom exception hierarchy with proper context and recovery suggestions.

### Key Points
- Specific exception types for different errors
- Timeout exceptions with duration context
- API error details preserved
- Clear error messages for debugging

### Implementation Code
```python
from typing import Optional


class LLMException(Exception):
    """Base exception for LLM operations."""

    def __init__(self, message: str, provider: Optional[str] = None, context: Optional[dict] = None):
        self.message = message
        self.provider = provider
        self.context = context or {}
        super().__init__(self.message)


class LLMTimeoutException(LLMException):
    """Request timed out."""

    def __init__(self, timeout_seconds: float, provider: str):
        super().__init__(
            f"LLM request timeout after {timeout_seconds}s",
            provider=provider,
            context={"timeout_seconds": timeout_seconds}
        )


class LLMAPIException(LLMException):
    """API error from provider."""

    def __init__(self, status_code: int, message: str, provider: str):
        super().__init__(
            f"API error {status_code}: {message}",
            provider=provider,
            context={"status_code": status_code}
        )


class LLMConfigException(LLMException):
    """Configuration error."""

    def __init__(self, message: str):
        super().__init__(f"Configuration error: {message}")


async def handle_llm_error(exception: Exception) -> str:
    """Convert exception to user-friendly error message."""
    if isinstance(exception, LLMTimeoutException):
        return f"Hết thời gian chờ. Hãy thử lại sau (Timeout after {exception.context.get('timeout_seconds')}s)"
    elif isinstance(exception, LLMAPIException):
        return f"Lỗi từ nhà cung cấp LLM: {exception.message}"
    elif isinstance(exception, LLMConfigException):
        return "Cấu hình LLM không đúng"
    else:
        return "Lỗi khi xử lý LLM"
```

### Constraints
- Exception hierarchy must be comprehensive
- Error context must not expose sensitive data
- Error messages should be user-friendly

---

## Pattern 4.11: Message Formatting

### Problem
Different providers expect different message formats. Need abstraction for message building.

### Solution
Provider-specific message formatters with common interface.

### Key Points
- Handles system prompts correctly
- Integrates context seamlessly
- Provider-agnostic from caller perspective
- Vietnamese legal domain support

### Implementation Code
```python
from typing import List, Dict, Optional
from enum import Enum


class MessageRole(str, Enum):
    """Message roles."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class MessageFormatter:
    """Format messages for different providers."""

    @staticmethod
    def format_for_openai(
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        """Format for OpenAI-compatible API."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if context:
            messages.append({
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {prompt}"
            })
        else:
            messages.append({"role": "user", "content": prompt})

        return messages

    @staticmethod
    def format_for_ollama(
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
    ) -> str:
        """Format for Ollama text-based API."""
        parts = []

        if system_prompt:
            parts.append(f"System: {system_prompt}")

        if context:
            parts.append(f"Context: {context}")

        parts.append(f"User: {prompt}")

        return "\n\n".join(parts)

    @staticmethod
    def create_legal_analysis_prompt(
        document: str,
        analysis_type: str = "summary",
    ) -> str:
        """
        Create Vietnamese legal document analysis prompt.

        Example for contract analysis (Phân tích hợp đồng)
        """
        if analysis_type == "summary":
            return f"""Phân tích hợp đồng sau đây:

{document}

Yêu cầu:
1. Tóm tắt điểm chính
2. Xác định các rủi ro
3. Liệt kê các điều khoản quan trọng"""

        elif analysis_type == "risk":
            return f"""Xác định rủi ro pháp lý trong hợp đồng:

{document}"""

        else:
            return document
```

### Constraints
- Format must match provider expectations exactly
- Context integration should be natural
- Support Vietnamese legal terminology

---

## Pattern 4.12: System Prompt Integration

### Problem
System prompts guide LLM behavior but are handled differently by providers and don't always work correctly.

### Solution
Unified system prompt management with provider-specific handling.

### Key Points
- Role-based system prompts (legal advisor, analyst, etc.)
- Language-specific prompts (Vietnamese, English, Japanese)
- Prompt versioning for A/B testing
- Vietnamese legal domain expertise prompts

### Implementation Code
```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class SystemPrompt:
    """System prompt configuration."""
    role: str
    language: str = "vietnamese"
    instructions: str = ""
    constraints: Optional[str] = None
    output_format: Optional[str] = None

    def build(self) -> str:
        """Build complete system prompt."""
        parts = [f"You are a {self.role}."]

        if self.instructions:
            parts.append(self.instructions)

        if self.constraints:
            parts.append(f"Constraints: {self.constraints}")

        if self.output_format:
            parts.append(f"Output format: {self.output_format}")

        return " ".join(parts)


# Vietnamese legal domain prompts
LEGAL_ADVISOR_PROMPT = SystemPrompt(
    role="Vietnamese legal advisor specializing in contracts",
    language="vietnamese",
    instructions="""
    Analyze documents in Vietnamese legal context.
    Use precise legal terminology.
    Reference relevant Vietnamese law provisions.
    """,
    constraints="Do not provide legal advice for criminal cases",
    output_format="Structured JSON with risk assessment"
)

CONTRACT_ANALYZER_PROMPT = SystemPrompt(
    role="Contract analysis specialist",
    language="vietnamese",
    instructions="""
    Analyze contracts for:
    1. Completeness (đủ điều khoản)
    2. Clarity (rõ ràng)
    3. Enforceability (khả năng thực hiện)
    4. Risk assessment (đánh giá rủi ro)
    """,
)
```

### Constraints
- System prompts affect model behavior significantly
- Testing required for each prompt
- Multilingual support adds complexity

---

## Pattern 4.13: Context Window Management

### Problem
Different providers have different context window limits (max tokens for input + output). Exceeding limits causes errors.

### Solution
Context window manager that truncates or summarizes context to fit within limits.

### Key Points
- Provider-specific window sizes
- Smart truncation strategies
- Token counting before request
- Fallback to summarization

### Implementation Code
```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class ContextWindow:
    """Context window configuration per provider."""
    provider: str
    total_tokens: int
    reserved_for_output: int = 1024

    @property
    def available_for_input(self) -> int:
        """Available tokens for input."""
        return self.total_tokens - self.reserved_for_output

    def fits(self, text: str) -> bool:
        """Check if text fits in context window."""
        # Approximate: 1 token ≈ 4 characters
        tokens = len(text) // 4
        return tokens <= self.available_for_input

    def truncate_to_fit(self, text: str) -> str:
        """Truncate text to fit in context window."""
        available = self.available_for_input * 4
        if len(text) <= available:
            return text

        # Keep beginning and end
        half = available // 2
        truncated = text[:half] + "\n...[truncated]...\n" + text[-half:]
        return truncated


# Provider-specific window sizes
CONTEXT_WINDOWS = {
    "vllm": ContextWindow("vllm", 8192),
    "ollama": ContextWindow("ollama", 4096),
    "openai": ContextWindow("openai", 128000),  # GPT-4 context
}
```

### Constraints
- Token counting is approximate
- Truncation can lose important context
- May require multiple requests for large documents

---

## Pattern 4.14: Provider Selection Strategy

### Problem
Different providers have different strengths. Should select best provider for specific task (cost, speed, accuracy).

### Solution
Strategy pattern for provider selection based on requirements.

### Key Points
- Task-specific provider selection
- Cost-based selection (use local providers first)
- Quality-based selection (use best model for critical tasks)
- Performance-based selection (use fastest provider)

### Implementation Code
```python
from enum import Enum
from typing import Optional
from abc import ABC, abstractmethod


class SelectionStrategy(ABC):
    """Base strategy for provider selection."""

    @abstractmethod
    async def select(self, available_providers: list) -> Optional[str]:
        """Select provider name."""
        pass


class CostOptimizedStrategy(SelectionStrategy):
    """Prefer local providers (free) over cloud."""

    async def select(self, available_providers: list) -> Optional[str]:
        """Select cheapest available provider."""
        preference = ["vllm", "ollama", "openai"]
        for name in preference:
            if name in available_providers:
                return name
        return None


class QualityOptimizedStrategy(SelectionStrategy):
    """Prefer best model quality for critical tasks."""

    async def select(self, available_providers: list) -> Optional[str]:
        """Select best quality provider."""
        if "openai" in available_providers:
            return "openai"
        if "ollama" in available_providers:
            return "ollama"
        return None


class PerformanceOptimizedStrategy(SelectionStrategy):
    """Prefer fastest provider for real-time tasks."""

    async def select(self, available_providers: list) -> Optional[str]:
        """Select fastest provider."""
        if "vllm" in available_providers:
            return "vllm"
        if "ollama" in available_providers:
            return "ollama"
        return None
```

### Constraints
- Strategy selection must consider all constraints
- May change during request execution
- Need provider performance metrics

---

## Pattern 4.15: LLM Response Parsing

### Problem
LLM responses need validation and parsing to extract structured data, especially for Vietnamese legal domain.

### Solution
Response parser with validation rules and structured output support.

### Key Points
- JSON response parsing and validation
- Fallback to free-form text parsing
- Structured extraction for legal fields
- Error recovery with re-prompting

### Implementation Code
```python
from typing import Optional, Dict, Any
import json
from dataclasses import dataclass


@dataclass
class ParsedResponse:
    """Parsed LLM response."""
    raw_text: str
    parsed_data: Optional[Dict[str, Any]] = None
    is_valid: bool = False
    error: Optional[str] = None


class ResponseParser:
    """Parse and validate LLM responses."""

    @staticmethod
    def parse_json(response_text: str) -> ParsedResponse:
        """Parse JSON response."""
        try:
            # Try to extract JSON from response
            start = response_text.find('{')
            end = response_text.rfind('}') + 1

            if start == -1 or end == 0:
                return ParsedResponse(
                    raw_text=response_text,
                    is_valid=False,
                    error="No JSON found in response"
                )

            json_str = response_text[start:end]
            data = json.loads(json_str)

            return ParsedResponse(
                raw_text=response_text,
                parsed_data=data,
                is_valid=True,
            )
        except json.JSONDecodeError as e:
            return ParsedResponse(
                raw_text=response_text,
                is_valid=False,
                error=f"JSON parse error: {str(e)}"
            )

    @staticmethod
    def parse_legal_analysis(response_text: str) -> ParsedResponse:
        """
        Parse Vietnamese legal analysis response.

        Expected format:
        Summary: ...
        Risks: ...
        Key Terms: ...
        """
        result = {}
        lines = response_text.split('\n')

        for line in lines:
            if line.startswith('Summary:'):
                result['summary'] = line.replace('Summary:', '').strip()
            elif line.startswith('Risks:'):
                result['risks'] = line.replace('Risks:', '').strip()
            elif line.startswith('Key Terms:'):
                result['key_terms'] = line.replace('Key Terms:', '').strip()

        return ParsedResponse(
            raw_text=response_text,
            parsed_data=result if result else None,
            is_valid=bool(result),
        )
```

### Constraints
- JSON may not always be valid (LLM hallucination)
- Need fallback parsing strategy
- Structured extraction may lose information

---

## Summary Table

| Pattern | Purpose | Key Class | Use Case |
|---------|---------|-----------|----------|
| 4.1 | Abstract interface | `BaseLLMProvider` | Unified provider interface |
| 4.2 | Configuration | `LLMConfig` | Type-safe settings |
| 4.3 | vLLM implementation | `VLLMProvider` | Local inference |
| 4.4 | Ollama implementation | `OllamaProvider` | Local inference |
| 4.5 | OpenAI implementation | `OpenAIProvider` | Cloud fallback |
| 4.6 | Factory pattern | `LLMProviderFactory` | Automatic failover |
| 4.7 | Streaming handler | `StreamingHandler` | Real-time responses |
| 4.8 | Health check | `HealthChecker` | Provider monitoring |
| 4.9 | Token tracking | `TokenMetrics` | Cost estimation |
| 4.10 | Error handling | Custom exceptions | Error recovery |
| 4.11 | Message formatting | `MessageFormatter` | Provider compatibility |
| 4.12 | System prompts | `SystemPrompt` | Behavior guidance |
| 4.13 | Context windows | `ContextWindow` | Token management |
| 4.14 | Provider selection | `SelectionStrategy` | Smart provider choice |
| 4.15 | Response parsing | `ResponseParser` | Structured extraction |

---

## Vietnamese Legal Domain Example

```python
# Contract analysis workflow using LLM providers

async def analyze_contract(contract_text: str) -> Dict[str, Any]:
    """Analyze Vietnamese contract using LLM."""

    # Get appropriate provider (cost-optimized)
    factory = LLMProviderFactory()
    provider = await factory.get_provider()

    # Create analysis prompt
    prompt = MessageFormatter.create_legal_analysis_prompt(
        contract_text,
        analysis_type="risk"
    )

    # Use legal advisor system prompt
    system_prompt = LEGAL_ADVISOR_PROMPT.build()

    # Generate response with streaming
    handler = StreamingHandler(buffer_size=10)
    response_text = await handler.handle_stream_with_timeout(
        await provider.generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
        ),
        timeout=60.0,
    )

    # Parse response
    parser = ResponseParser()
    parsed = parser.parse_legal_analysis(response_text)

    return {
        "provider": factory.get_active_provider_name(),
        "analysis": parsed.parsed_data or parsed.raw_text,
        "valid": parsed.is_valid,
    }
```

---

*FastAPI LLM Providers Specialist | Version 1.0 | 2025-12-20*
*Supporting Vietnamese legal domain applications with multi-provider LLM integration*
