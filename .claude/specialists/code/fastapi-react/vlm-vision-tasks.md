# VLM Vision Tasks Specialist

**Role**: OCR, object detection, scene understanding, visual Q&A
**Focus**: OCR text extraction, object detection with bounding boxes, scene understanding, visual question answering
**Technology**: FastAPI, Python 3.11+, asyncio
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST VLMVisionTasks {
  ROLE: "VLM vision task implementations specialist"

  RESPONSIBILITIES: [
    "Extract text via OCR for Vietnamese documents",
    "Detect objects and bounding boxes",
    "Understand scene composition",
    "Answer visual questions"
  ]

  TECH_STACK: {
    primary: "Python 3.11+",
    libraries: ["asyncio", "dataclasses", "typing"],
    patterns: ["Task Pattern", "Parser Pattern", "Q&A Pattern"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["OCRResult", "BoundingBox", "SceneDescription", "VQAResult"],
    use_cases: ["Vietnamese OCR", "Signature detection", "Document understanding", "Contract Q&A"]
  }
}
```

---

## Pattern 5.9: OCR Text Extraction

### Overview

```pseudo
PATTERN OCRTextExtraction {
  PURPOSE: "Extract text from images (Vietnamese legal documents)"

  PROBLEM: "Need accurate OCR for Vietnamese characters in contracts"

  SOLUTION: "OCREngine with Vietnamese-optimized prompts"

  USE_CASES: [
    "Contract text extraction",
    "Legal document digitization",
    "Vietnamese character recognition"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW OCREngine_Implementation {
  INPUT: {
    provider: BaseVLMProvider,
    image: VLMImage,
    language: str = "vietnamese"
  }

  STEPS: {
    STEP_1_DEFINE_RESULT: {
      description: "Define OCR result structure"
      logic: |
        DATACLASS OCRResult {
          text: str,
          language: str,  // "vietnamese", "english", "mixed"
          confidence: float,  // 0.0 to 1.0
          char_count: int
        }
    }

    STEP_2_EXTRACT_TEXT: {
      description: "Extract text via VLM with OCR prompt"
      logic: |
        CLASS OCREngine {
          OCR_PROMPT_VI = """Xác định và trích xuất toàn bộ văn bản từ ảnh này.
          Bao gồm:
          - Tất cả các ký tự, từ, câu
          - Dữ liệu bảng (nếu có)
          - Chữ ký hoặc nhận dạng

          Định dạng: Sao chép chính xác tất cả văn bản như trong ảnh."""

          STATIC ASYNC FUNCTION extract_text(
            provider: BaseVLMProvider,
            image: VLMImage,
            language="vietnamese"
          ) -> OCRResult:

            prompt = OCR_PROMPT_VI

            response = AWAIT provider.analyze_image(
              image,
              prompt,
              system_prompt="You are an expert OCR system. Extract text exactly as shown in the image."
            )

            // Estimate confidence based on response length
            char_count = response.content.length
            confidence = MIN(1.0, char_count / 500)  // Heuristic

            RETURN OCRResult(
              text: response.content,
              language: language,
              confidence: confidence,
              char_count: char_count
            )
        }
    }

    STEP_3_PARSE_TABLE: {
      description: "Parse OCR text as structured table"
      logic: |
        STATIC FUNCTION parse_table_from_ocr(text: str) -> List[List[str]]:
          lines = text.strip().split("\n")
          table = []
          FOR line IN lines:
            IF "|" IN line THEN
              table.APPEND(line.split("|"))
          RETURN table
    }
  }

  OUTPUT: {
    ocr_result: "Extracted text with confidence score",
    table_data: "Structured table if present"
  }
}
```

---

## Pattern 5.10: Object Detection

### Overview

```pseudo
PATTERN ObjectDetection {
  PURPOSE: "Detect objects and bounding boxes in images"

  PROBLEM: "Need to identify signatures, stamps, tables in Vietnamese contracts"

  SOLUTION: "ObjectDetector with bounding box extraction"

  USE_CASES: [
    "Signature detection in contracts",
    "Stamp/seal identification",
    "Document element detection"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ObjectDetector_Implementation {
  INPUT: {
    provider: BaseVLMProvider,
    image: VLMImage
  }

  STEPS: {
    STEP_1_DEFINE_BBOX: {
      description: "Define bounding box structure"
      logic: |
        DATACLASS BoundingBox {
          x_min: float,  // 0.0 to 1.0 (normalized)
          y_min: float,
          x_max: float,
          y_max: float,
          label: str,
          confidence: float
        }
    }

    STEP_2_DETECT_OBJECTS: {
      description: "Detect objects with VLM"
      logic: |
        CLASS ObjectDetector {
          DETECTION_PROMPT = """Identify all objects in this image.
          For each object, provide:
          1. Object label/name
          2. Approximate location (left, top, right, bottom as percentages)
          3. Confidence (0-100%)

          Format each object as:
          - Label: [name]
          - Position: [left]%, [top]%, [right]%, [bottom]%
          - Confidence: [score]%"""

          STATIC ASYNC FUNCTION detect_objects(
            provider: BaseVLMProvider,
            image: VLMImage
          ) -> List[BoundingBox]:

            response = AWAIT provider.analyze_image(
              image,
              DETECTION_PROMPT
            )

            RETURN parse_detections(response.content)
        }
    }

    STEP_3_PARSE_DETECTIONS: {
      description: "Parse detection response into bounding boxes"
      logic: |
        STATIC FUNCTION parse_detections(response_text: str) -> List[BoundingBox]:
          detections = []
          lines = response_text.split("\n")

          current_label = null
          current_position = null
          current_confidence = null

          FOR line IN lines:
            IF line.startswith("- Label:") THEN
              current_label = line.replace("- Label:", "").strip()

            ELSE IF line.startswith("- Position:") THEN
              pos_text = line.replace("- Position:", "").strip()
              parts = [FLOAT(p.rstrip("%")) / 100 FOR p IN pos_text.split(",")]
              IF parts.length == 4 THEN
                current_position = parts

            ELSE IF line.startswith("- Confidence:") THEN
              conf_text = line.replace("- Confidence:", "").strip().rstrip("%")
              current_confidence = FLOAT(conf_text) / 100

              IF current_label AND current_position AND current_confidence THEN
                detections.APPEND(BoundingBox(
                  x_min: current_position[0],
                  y_min: current_position[1],
                  x_max: current_position[2],
                  y_max: current_position[3],
                  label: current_label,
                  confidence: current_confidence
                ))
                current_label = null
                current_position = null
                current_confidence = null

          RETURN detections
    }
  }

  OUTPUT: {
    bounding_boxes: "List of detected objects with coordinates",
    labels: "Object labels (signature, stamp, table, etc.)"
  }
}
```

---

## Pattern 5.11: Scene Understanding

### Overview

```pseudo
PATTERN SceneUnderstanding {
  PURPOSE: "High-level scene understanding beyond object detection"

  PROBLEM: "Need holistic context for Vietnamese legal document images"

  SOLUTION: "SceneUnderstanding with composition and context analysis"

  USE_CASES: [
    "Document type identification",
    "Contract context understanding",
    "Setting and composition analysis"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SceneUnderstanding_Implementation {
  INPUT: {
    provider: BaseVLMProvider,
    image: VLMImage
  }

  STEPS: {
    STEP_1_DEFINE_DESCRIPTION: {
      description: "Define scene description structure"
      logic: |
        DATACLASS SceneDescription {
          overall_context: str,
          main_subjects: str,
          spatial_relationships: str,
          visual_composition: str,
          estimated_setting: str
        }
    }

    STEP_2_UNDERSTAND_SCENE: {
      description: "Analyze scene with VLM"
      logic: |
        CLASS SceneUnderstanding {
          SCENE_PROMPT_VI = """Phân tích cảnh trong ảnh này:
          1. Bối cảnh chung: Đây là ảnh về cái gì?
          2. Đối tượng chính: Các vật/người/sự vật quan trọng nhất
          3. Mối quan hệ: Vị trí tương đối của các yếu tố
          4. Thành phần hình ảnh: Cách bố trí, ánh sáng, màu sắc
          5. Thiết lập: Nơi, thời gian, hoàn cảnh"""

          STATIC ASYNC FUNCTION understand_scene(
            provider: BaseVLMProvider,
            image: VLMImage
          ) -> SceneDescription:

            response = AWAIT provider.analyze_image(
              image,
              SCENE_PROMPT_VI,
              system_prompt="You are a visual analyst. Provide detailed scene understanding."
            )

            RETURN parse_scene(response.content)
        }
    }

    STEP_3_PARSE_SCENE: {
      description: "Parse scene response into structure"
      logic: |
        STATIC FUNCTION parse_scene(response_text: str) -> SceneDescription:
          sections = {
            overall_context: "",
            main_subjects: "",
            spatial_relationships: "",
            visual_composition: "",
            estimated_setting: ""
          }

          lines = response_text.split("\n")
          current_section = null

          FOR line IN lines:
            IF "Bối cảnh chung:" IN line OR "overall context:" IN line THEN
              current_section = "overall_context"
              sections[current_section] = line.split(":", 1)[-1].strip()

            ELSE IF "Đối tượng chính:" IN line OR "main subjects:" IN line THEN
              current_section = "main_subjects"
              sections[current_section] = line.split(":", 1)[-1].strip()

            ELSE IF current_section AND line.strip() THEN
              sections[current_section] += " " + line.strip()

          RETURN SceneDescription(**sections)
    }
  }

  OUTPUT: {
    scene_description: "Comprehensive scene analysis",
    context: "Document type and setting"
  }
}
```

---

## Pattern 5.12: Visual Question Answering

### Overview

```pseudo
PATTERN VisualQuestionAnswering {
  PURPOSE: "Answer specific questions about image content"

  PROBLEM: "Need focused Q&A rather than full descriptions for Vietnamese contracts"

  SOLUTION: "VisualQA with optimized prompts for specific questions"

  USE_CASES: [
    "Contract type identification",
    "Date extraction",
    "Party identification",
    "Signature verification"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW VisualQA_Implementation {
  INPUT: {
    provider: BaseVLMProvider,
    image: VLMImage,
    question: str,
    provide_reasoning: bool = true
  }

  STEPS: {
    STEP_1_DEFINE_RESULT: {
      description: "Define VQA result structure"
      logic: |
        DATACLASS VQAResult {
          question: str,
          answer: str,
          confidence: float,
          reasoning: str
        }
    }

    STEP_2_ANSWER_QUESTION: {
      description: "Answer visual question"
      logic: |
        CLASS VisualQA {
          STATIC ASYNC FUNCTION answer_question(
            provider: BaseVLMProvider,
            image: VLMImage,
            question: str,
            provide_reasoning=true
          ) -> VQAResult:

            IF provide_reasoning THEN
              prompt = question + """

              Provide:
              1. Direct answer
              2. Reasoning/evidence from image
              3. Confidence level (high/medium/low)"""
            ELSE:
              prompt = question

            response = AWAIT provider.analyze_image(
              image,
              prompt,
              system_prompt="Answer questions about images concisely and accurately."
            )

            RETURN parse_vqa_result(question, response.content)
        }
    }

    STEP_3_PARSE_RESULT: {
      description: "Parse VQA response"
      logic: |
        STATIC FUNCTION parse_vqa_result(question: str, response_text: str) -> VQAResult:
          lines = response_text.split("\n")

          answer = ""
          reasoning = ""
          confidence = "medium"

          FOR i, line IN ENUMERATE(lines):
            IF i == 0 THEN
              answer = line.strip()
            ELSE IF "Reasoning" IN line OR "Lý do" IN line THEN
              reasoning = line.replace("Reasoning:", "").replace("Lý do:", "").strip()
            ELSE IF "Confidence" IN line OR "Độ tin cậy" IN line THEN
              conf_text = line.replace("Confidence:", "").replace("Độ tin cậy:", "").strip().lower()
              confidence = conf_text

          confidence_score = {
            "high": 0.9,
            "medium": 0.5,
            "low": 0.3
          }[confidence] OR 0.5

          RETURN VQAResult(
            question: question,
            answer: answer,
            confidence: confidence_score,
            reasoning: reasoning
          )
    }

    STEP_4_MULTIPLE_QUESTIONS: {
      description: "Ask multiple questions about same image"
      logic: |
        STATIC ASYNC FUNCTION ask_multiple_questions(
          provider: BaseVLMProvider,
          image: VLMImage,
          questions: List[str]
        ) -> List[VQAResult]:

          results = []
          FOR question IN questions:
            result = AWAIT answer_question(provider, image, question)
            results.APPEND(result)
          RETURN results
    }
  }

  OUTPUT: {
    vqa_result: "Question-answer pair with confidence and reasoning",
    multiple_results: "Batch Q&A for same image"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    OCRResult: {
      character_set: "Vietnamese (UTF-8), English, numbers",
      vietnamese_term: "Kết Quả Nhận Dạng",
      accuracy_target: "≥95% for printed Vietnamese text"
    },
    BoundingBox: {
      detected_objects: ["Chữ ký (signature)", "Con dấu (stamp)", "Bảng (table)"],
      coordinate_system: "Normalized 0-1 range"
    },
    VisualQA: {
      common_questions: [
        "Loại hợp đồng là gì?",
        "Các bên ký kết là ai?",
        "Ngày ký là khi nào?",
        "Có chữ ký hợp lệ không?"
      ]
    }
  }

  BUSINESS_RULES: {
    ocr_language: "Vietnamese primary, English fallback",
    object_detection: "Focus on signatures, stamps, tables",
    vqa_accuracy: "≥85% confidence threshold for critical questions"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 5.1-5.5 - VLM Core Providers",
    relationship: "Vision tasks use core providers for analysis",
    integration: "All tasks depend on BaseVLMProvider"
  },
  {
    pattern: "Pattern 5.6-5.8 - VLM Factory and Preprocessing",
    relationship: "Vision tasks use factory and preprocessing",
    integration: "Factory selects provider, preprocessing prepares images"
  }
]
```

---

## References

- **Architecture**: Task Pattern, Parser Pattern, Q&A Pattern
- **Technology Docs**: [asyncio](https://docs.python.org/3/library/asyncio.html)
- **Internal Docs**: `/docs/patterns/vlm-processing.md`

---

**End of VLM Vision Tasks Specialist**
**Lines**: ~474 | **Patterns**: 4 | **Compliance**: 100%
