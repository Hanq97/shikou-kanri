# FastAPI VLM Providers Specialist
*Vision-Language Model Integration Patterns for FastAPI + React Applications*

**日本語**: FastAPI VLMプロバイダー専門家 - ビジョンランゲージモデル統合パターンガイド
**Tiếng Việt**: Chuyên gia VLM Providers cho FastAPI - Hướng dẫn mô hình tích hợp nhận thức thị giác ngôn ngữ

---

## Role & Responsibilities

This specialist handles Vision-Language Model (VLM) provider integration patterns for FastAPI backends. Key responsibilities:

- Design abstraction layers for multiple VLM providers (Qwen-VL, Claude Vision, Gemini Flash)
- Implement image preprocessing and multi-image analysis pipelines
- Manage OCR text extraction and object detection response parsing
- Support scene understanding and visual question answering tasks
- Implement health monitoring and provider fallback chains
- Support Vietnamese legal domain use cases (document OCR, contract image analysis)

**Target Users**: Backend developers, computer vision engineers, multimodal AI specialists

---

## Pattern 5.1: Base VLM Provider Interface

### Problem
Multiple VLM providers (Qwen-VL, Claude Vision, Gemini Flash) have different APIs and response formats. Without a unified interface, switching providers requires code changes throughout the application.

### Solution
Create an abstract base class that all providers must implement, ensuring consistent interface for image analysis, multi-image support, and health checks.

### Key Points
- Type-safe image and response dataclasses
- Support both single and multi-image analysis
- Image format validation built-in
- Extensible for new VLM providers

### Implementation Code
```python
from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass
from enum import Enum


class ImageFormat(Enum):
    """Supported image formats."""
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"
    GIF = "gif"


@dataclass
class VLMImage:
    """Image input for VLM."""
    data: bytes  # Image bytes
    format: ImageFormat
    url: Optional[str] = None  # Alternative: image URL


@dataclass
class VLMResponse:
    """Response from VLM provider."""
    content: str  # Generated text description
    model: str
    confidence: Optional[float] = None
    metadata: dict = None


@dataclass
class VLMConfig:
    """Configuration for VLM provider."""
    model: str
    temperature: float = 0.7
    max_tokens: int = 1024
    detail: str = "auto"  # "low", "high", "auto"
    timeout: int = 60

    def __post_init__(self):
        """Validate configuration values."""
        if not 0.0 <= self.temperature <= 1.0:
            raise ValueError("temperature must be between 0.0 and 1.0")
        if self.max_tokens <= 0:
            raise ValueError("max_tokens must be positive")
        if self.detail not in ["low", "high", "auto"]:
            raise ValueError("detail must be 'low', 'high', or 'auto'")
        if self.timeout <= 0:
            raise ValueError("timeout must be positive")


class BaseVLMProvider(ABC):
    """Abstract base class for VLM providers."""

    def __init__(self, config: Optional[VLMConfig] = None):
        self.config = config or VLMConfig(model="default")

    @abstractmethod
    async def analyze_image(
        self,
        image: VLMImage,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze single image with prompt."""
        pass

    @abstractmethod
    async def analyze_images(
        self,
        images: List[VLMImage],
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze multiple images with prompt."""
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

    @property
    @abstractmethod
    def supported_formats(self) -> List[ImageFormat]:
        """List of supported image formats."""
        pass
```

### Constraints
- Must implement all abstract methods
- Configuration validated on instantiation
- Async-only interface (no sync methods)
- Type hints required for all parameters

---

## Pattern 5.2: VLM Configuration with Validation

### Problem
VLM settings vary across providers (temperature, token limits, API keys). Invalid configurations cause runtime errors or silent failures.

### Solution
Use `@dataclass` with `__post_init__` validation for type-safe, validated configuration objects.

### Key Points
- Dataclass provides built-in equality and repr
- Validation prevents invalid values at construction
- Supports both local and API-based VLM providers
- Clear error messages for configuration issues

### Implementation Code
```python
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class VLMProviderType(str, Enum):
    """Supported VLM providers."""
    QWEN_VL = "qwen-vl"
    CLAUDE_VISION = "claude-vision"
    GEMINI_FLASH = "gemini-flash"


@dataclass
class VLMProviderConfig:
    """Provider-specific VLM configuration."""
    type: VLMProviderType
    model: str
    temperature: float = 0.7
    max_tokens: int = 1024
    detail: str = "auto"  # "low", "high", "auto"
    timeout: int = 60
    base_url: Optional[str] = None
    api_key: Optional[str] = None

    def __post_init__(self):
        """Validate all configuration parameters."""
        if not 0.0 <= self.temperature <= 1.0:
            raise ValueError(f"temperature {self.temperature} out of range [0.0, 1.0]")
        if self.max_tokens <= 0:
            raise ValueError(f"max_tokens must be > 0, got {self.max_tokens}")
        if self.detail not in ["low", "high", "auto"]:
            raise ValueError(f"detail must be 'low', 'high', or 'auto', got {self.detail}")
        if self.timeout <= 0:
            raise ValueError(f"timeout must be > 0, got {self.timeout}")
        if self.type in [VLMProviderType.CLAUDE_VISION, VLMProviderType.GEMINI_FLASH]:
            if not self.api_key:
                raise ValueError(f"{self.type.value} provider requires api_key")
```

### Constraints
- Configuration immutable after initialization
- Validation is strict and fails fast
- All numeric bounds checked
- Provider-specific fields required

---

## Pattern 5.3: Qwen-VL Provider Implementation

### Problem
Qwen-VL is a high-performance local vision-language model, but requires specific API patterns for image encoding and multi-image handling.

### Solution
Implement BaseLLMProvider with base64 image encoding and OpenAI-compatible API format.

### Key Points
- Uses OpenAI-compatible chat completions API
- Base64 image encoding for API transport
- Supports multiple images in single request
- Configurable detail level (low/high/auto)

### Implementation Code
```python
from typing import List, Optional
import httpx
import base64

from src.integrations.vlm.base import (
    BaseVLMProvider,
    VLMImage,
    VLMResponse,
    VLMConfig,
    ImageFormat,
)
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class QwenVLProvider(BaseVLMProvider):
    """Qwen-VL provider for local vision-language inference."""

    def __init__(self, config: Optional[VLMConfig] = None):
        super().__init__(config)
        self.base_url = config.base_url or settings.QWEN_VL_BASE_URL
        self._client = httpx.AsyncClient(timeout=config.timeout)

    @property
    def name(self) -> str:
        return "qwen-vl"

    @property
    def supported_formats(self) -> List[ImageFormat]:
        return [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP]

    async def analyze_image(
        self,
        image: VLMImage,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze single image using Qwen-VL."""
        image_b64 = base64.b64encode(image.data).decode("utf-8")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        content = [
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/{image.format.value};base64,{image_b64}",
                    "detail": self.config.detail,
                },
            },
        ]
        messages.append({"role": "user", "content": content})

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            return VLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=data["model"],
                metadata={"provider": self.name, "usage": data.get("usage")},
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Qwen-VL HTTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"Qwen-VL error: {e}")
            raise

    async def analyze_images(
        self,
        images: List[VLMImage],
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze multiple images using Qwen-VL."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        content = [{"type": "text", "text": prompt}]

        for image in images:
            image_b64 = base64.b64encode(image.data).decode("utf-8")
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/{image.format.value};base64,{image_b64}",
                    "detail": self.config.detail,
                },
            })

        messages.append({"role": "user", "content": content})

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            return VLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=data["model"],
                metadata={
                    "provider": self.name,
                    "image_count": len(images),
                    "usage": data.get("usage"),
                },
            )
        except Exception as e:
            logger.error(f"Qwen-VL multi-image error: {e}")
            raise

    async def health_check(self) -> bool:
        """Check if Qwen-VL is available."""
        try:
            response = await self._client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Qwen-VL health check failed: {e}")
            return False
```

### Constraints
- Requires local Qwen-VL server running
- Base64 encoding adds payload overhead
- Detail level affects processing time

---

## Pattern 5.4: Claude Vision Provider Implementation

### Problem
Anthropic Claude Vision API has specific message format requirements and authentication needs. Should be fallback for local VLM failures.

### Solution
Implement with proper API key handling, authentication headers, and Claude's specific message format.

### Key Points
- Bearer token authentication via x-api-key header
- Claude-specific image format (base64 with media type)
- Supports GIF format (unique to Claude)
- Cloud fallback for local VLM failures

### Implementation Code
```python
from typing import List, Optional
import httpx
import base64

from src.integrations.vlm.base import (
    BaseVLMProvider,
    VLMImage,
    VLMResponse,
    VLMConfig,
    ImageFormat,
)
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeVisionProvider(BaseVLMProvider):
    """Anthropic Claude Vision API provider."""

    def __init__(self, config: Optional[VLMConfig] = None):
        super().__init__(config)
        self.api_key = config.api_key or settings.ANTHROPIC_API_KEY
        self.base_url = config.base_url or "https://api.anthropic.com"
        self._client = httpx.AsyncClient(
            timeout=config.timeout,
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )

    @property
    def name(self) -> str:
        return "claude-vision"

    @property
    def supported_formats(self) -> List[ImageFormat]:
        return [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP, ImageFormat.GIF]

    async def analyze_image(
        self,
        image: VLMImage,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze image using Claude Vision."""
        image_b64 = base64.b64encode(image.data).decode("utf-8")

        content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": f"image/{image.format.value}",
                    "data": image_b64,
                },
            },
            {"type": "text", "text": prompt},
        ]

        payload = {
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "messages": [{"role": "user", "content": content}],
        }

        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/messages",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            return VLMResponse(
                content=data["content"][0]["text"],
                model=data["model"],
                metadata={
                    "provider": self.name,
                    "usage": data.get("usage"),
                    "stop_reason": data.get("stop_reason"),
                },
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Claude Vision HTTP error: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Claude Vision error: {e}")
            raise

    async def analyze_images(
        self,
        images: List[VLMImage],
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze multiple images using Claude Vision."""
        content = []

        for image in images:
            image_b64 = base64.b64encode(image.data).decode("utf-8")
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": f"image/{image.format.value}",
                    "data": image_b64,
                },
            })

        content.append({"type": "text", "text": prompt})

        payload = {
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "messages": [{"role": "user", "content": content}],
        }

        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/messages",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            return VLMResponse(
                content=data["content"][0]["text"],
                model=data["model"],
                metadata={
                    "provider": self.name,
                    "image_count": len(images),
                    "usage": data.get("usage"),
                },
            )
        except Exception as e:
            logger.error(f"Claude Vision multi-image error: {e}")
            raise

    async def health_check(self) -> bool:
        """Check if Claude Vision API is available."""
        try:
            response = await self._client.get(f"{self.base_url}/v1")
            return response.status_code in [200, 404]
        except Exception as e:
            logger.warning(f"Claude Vision health check failed: {e}")
            return False
```

### Constraints
- Requires valid Anthropic API key
- May incur costs for API usage
- Rate limits apply
- Should only be used as fallback

---

## Pattern 5.5: Gemini Flash Provider Implementation

### Problem
Google Gemini Flash API provides fast vision understanding but has different request/response format than OpenAI-compatible APIs.

### Solution
Implement with Gemini's parts-based content format and safety ratings support.

### Key Points
- Google Gemini Flash API (fast and cost-effective)
- Parts-based content structure (text + inline data)
- Safety ratings for content moderation
- Alternative cloud VLM provider

### Implementation Code
```python
from typing import List, Optional
import httpx
import base64

from src.integrations.vlm.base import (
    BaseVLMProvider,
    VLMImage,
    VLMResponse,
    VLMConfig,
    ImageFormat,
)
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class GeminiFlashProvider(BaseVLMProvider):
    """Google Gemini Flash Vision API provider."""

    def __init__(self, config: Optional[VLMConfig] = None):
        super().__init__(config)
        self.api_key = config.api_key or settings.GOOGLE_API_KEY
        self.base_url = config.base_url or "https://generativelanguage.googleapis.com"
        self._client = httpx.AsyncClient(timeout=config.timeout)

    @property
    def name(self) -> str:
        return "gemini-flash"

    @property
    def supported_formats(self) -> List[ImageFormat]:
        return [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP]

    async def analyze_image(
        self,
        image: VLMImage,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze image using Gemini Flash."""
        image_b64 = base64.b64encode(image.data).decode("utf-8")

        parts = []
        if system_prompt:
            parts.append({"text": system_prompt})

        parts.append({"text": prompt})
        parts.append({
            "inline_data": {
                "mime_type": f"image/{image.format.value}",
                "data": image_b64,
            }
        })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": self.config.temperature,
                "maxOutputTokens": self.config.max_tokens,
            },
        }

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/models/{self.config.model}:generateContent",
                params={"key": self.api_key},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            content = data["candidates"][0]["content"]["parts"][0]["text"]

            return VLMResponse(
                content=content,
                model=self.config.model,
                metadata={
                    "provider": self.name,
                    "usage": data.get("usageMetadata"),
                    "safety_ratings": data["candidates"][0].get("safetyRatings"),
                },
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini Flash HTTP error: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Gemini Flash error: {e}")
            raise

    async def analyze_images(
        self,
        images: List[VLMImage],
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> VLMResponse:
        """Analyze multiple images using Gemini Flash."""
        parts = []

        if system_prompt:
            parts.append({"text": system_prompt})

        parts.append({"text": prompt})

        for image in images:
            image_b64 = base64.b64encode(image.data).decode("utf-8")
            parts.append({
                "inline_data": {
                    "mime_type": f"image/{image.format.value}",
                    "data": image_b64,
                }
            })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": self.config.temperature,
                "maxOutputTokens": self.config.max_tokens,
            },
        }

        try:
            response = await self._client.post(
                f"{self.base_url}/v1/models/{self.config.model}:generateContent",
                params={"key": self.api_key},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            content = data["candidates"][0]["content"]["parts"][0]["text"]

            return VLMResponse(
                content=content,
                model=self.config.model,
                metadata={
                    "provider": self.name,
                    "image_count": len(images),
                    "usage": data.get("usageMetadata"),
                },
            )
        except Exception as e:
            logger.error(f"Gemini Flash multi-image error: {e}")
            raise

    async def health_check(self) -> bool:
        """Check if Gemini Flash API is available."""
        try:
            response = await self._client.get(
                f"{self.base_url}/v1/models/{self.config.model}",
                params={"key": self.api_key},
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Gemini Flash health check failed: {e}")
            return False
```

### Constraints
- Requires valid Google API key
- Safety ratings may filter sensitive content
- Different pricing than Claude

---

## Pattern 5.6: VLM Factory with Fallback Chain

### Problem
Managing multiple VLM providers manually is error-prone. Need automatic provider selection and fallback when one provider fails.

### Solution
Factory pattern with health monitoring and automatic fallback chain: Qwen-VL → Claude Vision → Gemini Flash

### Key Points
- Lazy initialization (only when first needed)
- Health check monitoring of active provider
- Automatic failover on provider failure
- Manual provider selection supported
- Singleton pattern for single factory instance

### Implementation Code
```python
from typing import Optional, List

from src.integrations.vlm.base import BaseVLMProvider, VLMConfig
from src.integrations.vlm.qwen_vl import QwenVLProvider
from src.integrations.vlm.claude_vision import ClaudeVisionProvider
from src.integrations.vlm.gemini_flash import GeminiFlashProvider
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class VLMProviderFactory:
    """
    Factory for creating VLM providers with fallback chain.

    Fallback order: Qwen-VL → Claude Vision → Gemini Flash

    Usage:
        await VLMProviderFactory.initialize()
        provider = await VLMProviderFactory.get_provider()
        response = await provider.analyze_image(image, "Xác định văn bản trong ảnh này...")
    """

    _providers: List[BaseVLMProvider] = []
    _active_provider: Optional[BaseVLMProvider] = None
    _initialized: bool = False

    @classmethod
    async def initialize(cls) -> None:
        """Initialize VLM provider chain."""
        if cls._initialized:
            return

        configs = {
            "qwen-vl": VLMConfig(
                model=settings.QWEN_VL_MODEL,
                base_url=settings.QWEN_VL_BASE_URL,
                timeout=60,
            ),
            "claude-vision": VLMConfig(
                model=settings.CLAUDE_VISION_MODEL,
                api_key=settings.ANTHROPIC_API_KEY,
                timeout=60,
            ),
            "gemini-flash": VLMConfig(
                model=settings.GEMINI_FLASH_MODEL,
                api_key=settings.GOOGLE_API_KEY,
                timeout=60,
            ),
        }

        cls._providers = [
            QwenVLProvider(configs["qwen-vl"]),
            ClaudeVisionProvider(configs["claude-vision"]),
            GeminiFlashProvider(configs["gemini-flash"]),
        ]

        await cls._select_active_provider()
        cls._initialized = True
        logger.info(f"VLM Factory initialized with {len(cls._providers)} providers")

    @classmethod
    async def _select_active_provider(cls) -> None:
        """Select first healthy provider from fallback chain."""
        for provider in cls._providers:
            logger.info(f"Checking VLM provider: {provider.name}")

            if await provider.health_check():
                cls._active_provider = provider
                logger.info(f"✅ Active VLM provider: {provider.name}")
                return

        raise RuntimeError(
            "❌ No VLM providers available. Check Qwen-VL, Claude Vision, and Gemini Flash."
        )

    @classmethod
    async def get_provider(cls) -> BaseVLMProvider:
        """
        Get active provider with automatic fallback.

        If active provider becomes unhealthy, automatically switches to next available.
        """
        if not cls._initialized:
            await cls.initialize()

        if cls._active_provider and not await cls._active_provider.health_check():
            logger.warning(
                f"⚠️ VLM provider {cls._active_provider.name} unhealthy, attempting fallback"
            )
            await cls._select_active_provider()

        return cls._active_provider

    @classmethod
    async def get_provider_by_name(cls, name: str) -> Optional[BaseVLMProvider]:
        """Get specific VLM provider by name."""
        if not cls._initialized:
            await cls.initialize()

        for provider in cls._providers:
            if provider.name == name:
                return provider

        logger.warning(f"VLM provider {name} not found")
        return None

    @classmethod
    def get_active_provider_name(cls) -> Optional[str]:
        """Get name of current active VLM provider."""
        return cls._active_provider.name if cls._active_provider else None
```

### Constraints
- Only one provider can be active at a time
- Factory is singleton (class-level state)
- Health checks add latency
- Async initialization required

---

## Pattern 5.7: Image Preprocessing

### Problem
Raw images need resizing, format conversion, and encoding for API transport. Different providers have different requirements.

### Solution
Unified image preprocessing pipeline with resize, format conversion, and base64 encoding.

### Key Points
- Resize to standard dimensions
- Format conversion to supported types
- Base64 encoding for API transport
- Metadata preservation (original size, format)

### Implementation Code
```python
from typing import Tuple, Optional
from dataclasses import dataclass
from PIL import Image
import io
import base64

from src.integrations.vlm.base import VLMImage, ImageFormat


@dataclass
class ImagePreprocessResult:
    """Result of image preprocessing."""
    processed_image: VLMImage
    original_size: Tuple[int, int]
    resized_size: Tuple[int, int]
    format: ImageFormat


class ImagePreprocessor:
    """Preprocess images for VLM providers."""

    MAX_WIDTH = 1024
    MAX_HEIGHT = 1024
    SUPPORTED_FORMATS = [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP]

    @staticmethod
    async def preprocess(
        image_data: bytes,
        target_format: Optional[ImageFormat] = None,
        max_width: int = MAX_WIDTH,
        max_height: int = MAX_HEIGHT,
    ) -> ImagePreprocessResult:
        """
        Preprocess image: resize, convert format, encode to base64.

        Args:
            image_data: Raw image bytes
            target_format: Target image format
            max_width: Maximum width after resize
            max_height: Maximum height after resize

        Returns:
            ImagePreprocessResult with processed image
        """
        # Open image
        image = Image.open(io.BytesIO(image_data))
        original_size = image.size

        # Resize if needed
        image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        resized_size = image.size

        # Determine output format
        if target_format is None:
            target_format = ImageFormat.PNG

        # Convert to target format
        output_buffer = io.BytesIO()
        image.save(output_buffer, format=target_format.value.upper())
        processed_bytes = output_buffer.getvalue()

        # Create VLMImage
        vlm_image = VLMImage(
            data=processed_bytes,
            format=target_format,
        )

        return ImagePreprocessResult(
            processed_image=vlm_image,
            original_size=original_size,
            resized_size=resized_size,
            format=target_format,
        )

    @staticmethod
    def get_format_from_bytes(image_data: bytes) -> Optional[ImageFormat]:
        """Detect image format from bytes."""
        try:
            image = Image.open(io.BytesIO(image_data))
            format_name = image.format.lower()
            for fmt in ImageFormat:
                if fmt.value == format_name:
                    return fmt
        except Exception:
            pass
        return None
```

### Constraints
- Resizing may lose quality
- Conversion adds processing time
- Memory overhead for large images

---

## Pattern 5.8: Multi-Image Analysis

### Problem
Analyzing multiple related images (document pages, contract signatures) requires coordinating requests and combining results.

### Solution
Multi-image handler that manages image batching and response aggregation.

### Key Points
- Batch processing for related images
- Response aggregation strategies
- Coordinated requests to same provider
- Context preservation across images

### Implementation Code
```python
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from src.integrations.vlm.base import VLMImage, VLMResponse, BaseVLMProvider


@dataclass
class MultiImageAnalysisResult:
    """Result of multi-image analysis."""
    images_analyzed: int
    combined_response: str
    individual_responses: List[VLMResponse]
    provider_name: str


class MultiImageAnalyzer:
    """Handle analysis of multiple related images."""

    @staticmethod
    async def analyze_document_pages(
        provider: BaseVLMProvider,
        pages: List[VLMImage],
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> MultiImageAnalysisResult:
        """
        Analyze multiple document pages.

        For Vietnamese legal documents (hợp đồng, giấy chứng nhận).
        """
        responses = []

        # Try multi-image analysis first
        if len(pages) <= 10:
            try:
                combined = await provider.analyze_images(
                    pages,
                    prompt,
                    system_prompt,
                )
                responses.append(combined)
            except Exception:
                # Fallback to individual analysis
                for page in pages:
                    response = await provider.analyze_image(
                        page,
                        f"Page {len(responses) + 1}: {prompt}",
                        system_prompt,
                    )
                    responses.append(response)
        else:
            # Large document: analyze page-by-page
            for idx, page in enumerate(pages):
                response = await provider.analyze_image(
                    page,
                    f"Page {idx + 1}/{len(pages)}: {prompt}",
                    system_prompt,
                )
                responses.append(response)

        # Combine responses
        combined_text = "\n\n---\n\n".join(
            [f"Page {i+1}:\n{r.content}" for i, r in enumerate(responses)]
        )

        return MultiImageAnalysisResult(
            images_analyzed=len(pages),
            combined_response=combined_text,
            individual_responses=responses,
            provider_name=provider.name,
        )
```

### Constraints
- Large batches may exceed token limits
- Response combination can be complex
- Order preservation is critical

---

## Pattern 5.9: OCR Text Extraction

### Problem
Need to extract text from images (document OCR, receipt scanning) for Vietnamese legal documents.

### Solution
Specialized OCR prompt and response parsing for text extraction.

### Key Points
- Optimized prompt for OCR tasks
- Vietnamese character support
- Confidence scoring for extracted text
- Structured output with coordinates

### Implementation Code
```python
from typing import List, Optional
from dataclasses import dataclass

from src.integrations.vlm.base import VLMImage, BaseVLMProvider


@dataclass
class OCRResult:
    """OCR text extraction result."""
    text: str
    language: str  # "vietnamese", "english", "mixed"
    confidence: float  # 0.0 to 1.0
    char_count: int


class OCREngine:
    """OCR text extraction using VLM."""

    OCR_PROMPT_VI = """Xác định và trích xuất toàn bộ văn bản từ ảnh này.
    Bao gồm:
    - Tất cả các ký tự, từ, câu
    - Dữ liệu bảng (nếu có)
    - Chữ ký hoặc nhận dạng

    Định dạng: Sao chép chính xác tất cả văn bản như trong ảnh."""

    @staticmethod
    async def extract_text(
        provider: BaseVLMProvider,
        image: VLMImage,
        language: str = "vietnamese",
    ) -> OCRResult:
        """
        Extract text from image using OCR.

        Perfect for Vietnamese legal documents (hợp đồng, giấy tờ).
        """
        prompt = OCREngine.OCR_PROMPT_VI

        response = await provider.analyze_image(
            image,
            prompt,
            system_prompt="You are an expert OCR system. Extract text exactly as shown in the image.",
        )

        # Estimate confidence based on response length
        # More text usually means better extraction
        char_count = len(response.content)
        confidence = min(1.0, char_count / 500)  # Heuristic

        return OCRResult(
            text=response.content,
            language=language,
            confidence=confidence,
            char_count=char_count,
        )

    @staticmethod
    def parse_table_from_ocr(text: str) -> List[List[str]]:
        """Parse OCR text as structured table."""
        lines = text.strip().split("\n")
        table = [line.split("|") for line in lines if "|" in line]
        return table
```

### Constraints
- OCR quality depends on image quality
- Handwriting may not be recognized
- Languages must be specified

---

## Pattern 5.10: Object Detection Response Parsing

### Problem
VLM responses for object detection (bounding boxes, labels, confidence) need parsing into structured format.

### Solution
Parser for object detection responses with bounding box extraction and label classification.

### Key Points
- Extract bounding box coordinates
- Parse confidence scores
- Label classification
- Structured output for downstream processing

### Implementation Code
```python
from typing import List, Optional
from dataclasses import dataclass

from src.integrations.vlm.base import VLMImage, BaseVLMProvider


@dataclass
class BoundingBox:
    """Object bounding box."""
    x_min: float  # 0.0 to 1.0 (normalized)
    y_min: float
    x_max: float
    y_max: float
    label: str
    confidence: float


class ObjectDetector:
    """Object detection using VLM."""

    DETECTION_PROMPT = """Identify all objects in this image.
    For each object, provide:
    1. Object label/name
    2. Approximate location (left, top, right, bottom as percentages)
    3. Confidence (0-100%)

    Format each object as:
    - Label: [name]
    - Position: [left]%, [top]%, [right]%, [bottom]%
    - Confidence: [score]%"""

    @staticmethod
    async def detect_objects(
        provider: BaseVLMProvider,
        image: VLMImage,
    ) -> List[BoundingBox]:
        """
        Detect objects in image.

        Useful for document element detection (signature, tables, etc.).
        """
        response = await provider.analyze_image(
            image,
            ObjectDetector.DETECTION_PROMPT,
        )

        return ObjectDetector.parse_detections(response.content)

    @staticmethod
    def parse_detections(response_text: str) -> List[BoundingBox]:
        """Parse object detection response."""
        detections = []
        lines = response_text.split("\n")

        current_label = None
        current_position = None
        current_confidence = None

        for line in lines:
            if line.startswith("- Label:"):
                current_label = line.replace("- Label:", "").strip()
            elif line.startswith("- Position:"):
                pos_text = line.replace("- Position:", "").strip()
                parts = [float(p.rstrip("%")) / 100 for p in pos_text.split(",")]
                if len(parts) == 4:
                    current_position = parts
            elif line.startswith("- Confidence:"):
                conf_text = line.replace("- Confidence:", "").strip().rstrip("%")
                current_confidence = float(conf_text) / 100

                if current_label and current_position and current_confidence:
                    detections.append(BoundingBox(
                        x_min=current_position[0],
                        y_min=current_position[1],
                        x_max=current_position[2],
                        y_max=current_position[3],
                        label=current_label,
                        confidence=current_confidence,
                    ))
                    current_label = None
                    current_position = None
                    current_confidence = None

        return detections
```

### Constraints
- Parsing depends on response format
- Bounding box accuracy varies
- May require re-prompting for structured output

---

## Pattern 5.11: Scene Understanding

### Problem
Need high-level scene understanding (context, composition) beyond simple object detection.

### Solution
Scene understanding prompt that generates rich descriptions of image content and context.

### Key Points
- Holistic scene analysis
- Context and relationships
- Visual composition description
- Semantic understanding

### Implementation Code
```python
from typing import Optional
from dataclasses import dataclass

from src.integrations.vlm.base import VLMImage, BaseVLMProvider


@dataclass
class SceneDescription:
    """High-level scene understanding."""
    overall_context: str
    main_subjects: str
    spatial_relationships: str
    visual_composition: str
    estimated_setting: str


class SceneUnderstanding:
    """Scene understanding using VLM."""

    SCENE_PROMPT_VI = """Phân tích cảnh trong ảnh này:
    1. Bối cảnh chung: Đây là ảnh về cái gì?
    2. Đối tượng chính: Các vật/người/sự vật quan trọng nhất
    3. Mối quan hệ: Vị trí tương đối của các yếu tố
    4. Thành phần hình ảnh: Cách bố trí, ánh sáng, màu sắc
    5. Thiết lập: Nơi, thời gian, hoàn cảnh"""

    @staticmethod
    async def understand_scene(
        provider: BaseVLMProvider,
        image: VLMImage,
    ) -> SceneDescription:
        """
        Understand scene composition and context.

        Great for analyzing Vietnamese document contexts.
        """
        response = await provider.analyze_image(
            image,
            SceneUnderstanding.SCENE_PROMPT_VI,
            system_prompt="You are a visual analyst. Provide detailed scene understanding.",
        )

        return SceneUnderstanding.parse_scene(response.content)

    @staticmethod
    def parse_scene(response_text: str) -> SceneDescription:
        """Parse scene understanding response."""
        sections = {
            "overall_context": "",
            "main_subjects": "",
            "spatial_relationships": "",
            "visual_composition": "",
            "estimated_setting": "",
        }

        lines = response_text.split("\n")
        current_section = None

        for line in lines:
            if "Bối cảnh chung:" in line or "overall context:" in line:
                current_section = "overall_context"
                sections[current_section] = line.split(":", 1)[-1].strip()
            elif "Đối tượng chính:" in line or "main subjects:" in line:
                current_section = "main_subjects"
                sections[current_section] = line.split(":", 1)[-1].strip()
            elif "Mối quan hệ:" in line or "spatial relationships:" in line:
                current_section = "spatial_relationships"
                sections[current_section] = line.split(":", 1)[-1].strip()
            elif "Thành phần hình ảnh:" in line or "visual composition:" in line:
                current_section = "visual_composition"
                sections[current_section] = line.split(":", 1)[-1].strip()
            elif "Thiết lập:" in line or "estimated setting:" in line:
                current_section = "estimated_setting"
                sections[current_section] = line.split(":", 1)[-1].strip()
            elif current_section and line.strip():
                sections[current_section] += " " + line.strip()

        return SceneDescription(**sections)
```

### Constraints
- Subjective interpretation varies
- May be too verbose for simple images
- Culture-specific understanding differs

---

## Pattern 5.12: Visual Question Answering

### Problem
Need to ask specific questions about image content rather than get full descriptions.

### Solution
VQA (Visual Question Answering) interface with prompt optimization for specific questions.

### Key Points
- Focused question-answer format
- Prompts optimized for yes/no, multiple choice
- Context preservation across related questions
- High accuracy for specific queries

### Implementation Code
```python
from typing import Optional, List
from dataclasses import dataclass

from src.integrations.vlm.base import VLMImage, BaseVLMProvider


@dataclass
class VQAResult:
    """Visual Question Answering result."""
    question: str
    answer: str
    confidence: float
    reasoning: str


class VisualQA:
    """Visual Question Answering using VLM."""

    @staticmethod
    async def answer_question(
        provider: BaseVLMProvider,
        image: VLMImage,
        question: str,
        provide_reasoning: bool = True,
    ) -> VQAResult:
        """
        Answer specific question about image.

        Example: "Xác định loại hợp đồng?" (Identify contract type?)
        """
        if provide_reasoning:
            prompt = f"""{question}

Provide:
1. Direct answer
2. Reasoning/evidence from image
3. Confidence level (high/medium/low)"""
        else:
            prompt = question

        response = await provider.analyze_image(
            image,
            prompt,
            system_prompt="Answer questions about images concisely and accurately.",
        )

        return VisualQA.parse_vqa_result(question, response.content)

    @staticmethod
    def parse_vqa_result(question: str, response_text: str) -> VQAResult:
        """Parse VQA response."""
        lines = response_text.split("\n")

        answer = ""
        reasoning = ""
        confidence = "medium"

        for i, line in enumerate(lines):
            if i == 0:
                answer = line.strip()
            elif "Reasoning" in line or "Lý do" in line:
                reasoning = line.replace("Reasoning:", "").replace("Lý do:", "").strip()
            elif "Confidence" in line or "Độ tin cậy" in line:
                conf_text = line.replace("Confidence:", "").replace("Độ tin cậy:", "").strip().lower()
                confidence = conf_text

        confidence_score = {
            "high": 0.9,
            "medium": 0.5,
            "low": 0.3,
        }.get(confidence, 0.5)

        return VQAResult(
            question=question,
            answer=answer,
            confidence=confidence_score,
            reasoning=reasoning,
        )

    @staticmethod
    async def ask_multiple_questions(
        provider: BaseVLMProvider,
        image: VLMImage,
        questions: List[str],
    ) -> List[VQAResult]:
        """Ask multiple questions about same image."""
        results = []
        for q in questions:
            result = await VisualQA.answer_question(provider, image, q)
            results.append(result)
        return results
```

### Constraints
- Question quality affects answer quality
- Ambiguous questions may have poor results
- May hallucinate answers not in image

---

## Pattern 5.13: Health Check for VLM Providers

### Problem
VLM providers can become unavailable. Need monitoring to detect failures and trigger fallback.

### Solution
Health check system with retry logic and provider status tracking.

### Key Points
- Provider availability monitoring
- Retry logic with exponential backoff
- Health check logging
- Automatic fallback triggering

### Implementation Code
```python
from typing import Optional
import asyncio
from dataclasses import dataclass
from datetime import datetime

from src.integrations.vlm.base import BaseVLMProvider
from src.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class HealthCheckResult:
    """Provider health check result."""
    provider_name: str
    is_healthy: bool
    last_check: datetime
    consecutive_failures: int = 0


class VLMHealthChecker:
    """Health check system for VLM providers."""

    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 0.5,
        max_delay: float = 10.0,
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.health_status: dict = {}

    async def check_provider(
        self,
        provider: BaseVLMProvider,
    ) -> HealthCheckResult:
        """
        Check provider health with exponential backoff retry.
        """
        delay = self.initial_delay

        for attempt in range(self.max_retries + 1):
            try:
                result = await asyncio.wait_for(
                    provider.health_check(),
                    timeout=5.0,
                )
                if result:
                    logger.info(f"{provider.name} is healthy")
                    return HealthCheckResult(
                        provider_name=provider.name,
                        is_healthy=True,
                        last_check=datetime.utcnow(),
                    )
            except Exception as e:
                logger.warning(
                    f"{provider.name} health check failed (attempt {attempt + 1}): {e}"
                )

            if attempt < self.max_retries:
                await asyncio.sleep(delay)
                delay = min(delay * 2, self.max_delay)

        return HealthCheckResult(
            provider_name=provider.name,
            is_healthy=False,
            last_check=datetime.utcnow(),
        )

    async def check_all_providers(
        self,
        providers: list,
    ) -> dict:
        """Check health of all providers."""
        results = {}
        for provider in providers:
            result = await self.check_provider(provider)
            results[provider.name] = result
        return results
```

### Constraints
- Health checks add latency
- False positives possible
- May miss intermittent failures

---

## Pattern 5.14: Image Format Validation

### Problem
Providers support different image formats. Invalid formats cause API errors.

### Solution
Format validator that checks and converts to supported formats.

### Key Points
- Format detection from bytes
- Conversion to supported formats
- MIME type validation
- Metadata preservation

### Implementation Code
```python
from typing import Optional
from src.integrations.vlm.base import ImageFormat


class ImageFormatValidator:
    """Validate and handle image formats."""

    PROVIDER_FORMATS = {
        "qwen-vl": [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP],
        "claude-vision": [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP, ImageFormat.GIF],
        "gemini-flash": [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP],
    }

    @staticmethod
    def is_valid_format(
        format: ImageFormat,
        provider: str,
    ) -> bool:
        """Check if format is valid for provider."""
        supported = ImageFormatValidator.PROVIDER_FORMATS.get(provider, [])
        return format in supported

    @staticmethod
    def get_supported_formats(provider: str) -> list:
        """Get supported formats for provider."""
        return ImageFormatValidator.PROVIDER_FORMATS.get(provider, [])

    @staticmethod
    def validate_mime_type(mime_type: str) -> Optional[ImageFormat]:
        """Validate and convert MIME type to ImageFormat."""
        mime_map = {
            "image/jpeg": ImageFormat.JPEG,
            "image/jpg": ImageFormat.JPEG,
            "image/png": ImageFormat.PNG,
            "image/webp": ImageFormat.WEBP,
            "image/gif": ImageFormat.GIF,
        }
        return mime_map.get(mime_type.lower())
```

### Constraints
- Some conversions may lose quality
- MIME type detection not always reliable
- Metadata may be stripped

---

## Pattern 5.15: VLM Response Parsing

### Problem
VLM responses need validation and structured extraction, especially for Vietnamese legal domain tasks.

### Solution
Response parser with multiple parsing strategies and fallback support.

### Key Points
- JSON response parsing and validation
- Free-form text parsing fallback
- Structured extraction for legal fields
- Error recovery with re-prompting

### Implementation Code
```python
from typing import Optional, Dict, Any
import json
from dataclasses import dataclass


@dataclass
class ParsedVLMResponse:
    """Parsed VLM response."""
    raw_text: str
    parsed_data: Optional[Dict[str, Any]] = None
    is_valid: bool = False
    error: Optional[str] = None


class VLMResponseParser:
    """Parse and validate VLM responses."""

    @staticmethod
    def parse_json(response_text: str) -> ParsedVLMResponse:
        """Parse JSON response."""
        try:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1

            if start == -1 or end == 0:
                return ParsedVLMResponse(
                    raw_text=response_text,
                    is_valid=False,
                    error="No JSON found in response"
                )

            json_str = response_text[start:end]
            data = json.loads(json_str)

            return ParsedVLMResponse(
                raw_text=response_text,
                parsed_data=data,
                is_valid=True,
            )
        except json.JSONDecodeError as e:
            return ParsedVLMResponse(
                raw_text=response_text,
                is_valid=False,
                error=f"JSON parse error: {str(e)}"
            )

    @staticmethod
    def parse_legal_document(response_text: str) -> ParsedVLMResponse:
        """
        Parse Vietnamese legal document analysis response.

        Expected format for contract analysis (Phân tích hợp đồng)
        """
        result = {}
        lines = response_text.split('\n')

        for line in lines:
            if line.startswith('Loại hợp đồng:') or line.startswith('Contract Type:'):
                result['contract_type'] = line.split(':', 1)[-1].strip()
            elif line.startswith('Các bên:') or line.startswith('Parties:'):
                result['parties'] = line.split(':', 1)[-1].strip()
            elif line.startswith('Rủi ro chính:') or line.startswith('Key Risks:'):
                result['risks'] = line.split(':', 1)[-1].strip()
            elif line.startswith('Điều khoản quan trọng:') or line.startswith('Key Terms:'):
                result['key_terms'] = line.split(':', 1)[-1].strip()

        return ParsedVLMResponse(
            raw_text=response_text,
            parsed_data=result if result else None,
            is_valid=bool(result),
        )
```

### Constraints
- JSON may not always be valid
- Need fallback parsing strategy
- Structured extraction may lose information

---

## Summary Table

| Pattern | Purpose | Key Class | Use Case |
|---------|---------|-----------|----------|
| 5.1 | Abstract interface | `BaseVLMProvider` | Unified provider interface |
| 5.2 | Configuration | `VLMConfig` | Type-safe settings |
| 5.3 | Qwen-VL implementation | `QwenVLProvider` | Local inference |
| 5.4 | Claude Vision implementation | `ClaudeVisionProvider` | Cloud fallback |
| 5.5 | Gemini Flash implementation | `GeminiFlashProvider` | Alternative cloud VLM |
| 5.6 | Factory pattern | `VLMProviderFactory` | Automatic failover |
| 5.7 | Image preprocessing | `ImagePreprocessor` | Format/size conversion |
| 5.8 | Multi-image analysis | `MultiImageAnalyzer` | Document analysis |
| 5.9 | OCR text extraction | `OCREngine` | Text recognition |
| 5.10 | Object detection | `ObjectDetector` | Bounding boxes |
| 5.11 | Scene understanding | `SceneUnderstanding` | Context analysis |
| 5.12 | Visual QA | `VisualQA` | Question answering |
| 5.13 | Health check | `VLMHealthChecker` | Provider monitoring |
| 5.14 | Format validation | `ImageFormatValidator` | Format compatibility |
| 5.15 | Response parsing | `VLMResponseParser` | Structured extraction |

---

## Vietnamese Legal Domain Example

```python
# Contract analysis workflow using VLM providers

async def analyze_contract_image(
    contract_image_bytes: bytes,
) -> Dict[str, Any]:
    """Analyze Vietnamese contract image using VLM."""

    # Get appropriate provider (cost-optimized)
    factory = VLMProviderFactory()
    provider = await factory.get_provider()

    # Preprocess image
    preprocessor = ImagePreprocessor()
    result = await preprocessor.preprocess(
        contract_image_bytes,
        target_format=ImageFormat.PNG,
    )

    # Extract text via OCR
    ocr_engine = OCREngine()
    ocr = await ocr_engine.extract_text(provider, result.processed_image)

    # Analyze scene
    scene_analyzer = SceneUnderstanding()
    scene = await scene_analyzer.understand_scene(provider, result.processed_image)

    # Detect signatures/stamps
    detector = ObjectDetector()
    objects = await detector.detect_objects(provider, result.processed_image)

    # Parse legal content
    vqa = VisualQA()
    analysis = await vqa.ask_multiple_questions(
        provider,
        result.processed_image,
        [
            "Loại hợp đồng là gì?",
            "Các bên ký kết là ai?",
            "Ngày ký là khi nào?",
            "Có chữ ký hợp lệ không?",
        ],
    )

    return {
        "provider": factory.get_active_provider_name(),
        "ocr_text": ocr.text,
        "scene_context": scene.overall_context,
        "detected_objects": [
            {"label": obj.label, "confidence": obj.confidence}
            for obj in objects
        ],
        "legal_analysis": [
            {"question": a.question, "answer": a.answer}
            for a in analysis
        ],
    }
```

---

*FastAPI VLM Providers Specialist | Version 1.0 | 2025-12-20*
*Supporting Vietnamese legal domain applications with multi-provider Vision-Language Model integration*
