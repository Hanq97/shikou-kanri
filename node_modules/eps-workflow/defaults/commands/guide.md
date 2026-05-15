---
description: Hướng dẫn sử dụng EPS Framework
---

You are helping users understand and navigate the EPS Framework v10.0 (Auto-Chain Enforcement).

Parse the user's argument: `$ARGUMENTS`

## Handle Options:

### If `$ARGUMENTS` is empty or `--help`:
Display the following table in Vietnamese:

```
EPS Framework v10.0 — Hướng dẫn sử dụng

/guide                # Hiện danh sách options
/guide --workflow     # Quy trình workflow (2 stages, auto-chain)
/guide --commands     # Danh sách commands
/guide --status       # Trạng thái hiện tại
/guide --next         # Bước tiếp theo + gợi ý
/guide --quick        # Quick start cho người mới
```

---

### If `$ARGUMENTS` is `--workflow`:
Explain in Vietnamese:

**EPS Workflow v10.0 — 2 Stages, Auto-Chain**

EPS workflow gồm 2 stage. User chỉ cần gõ **2 command**, tất cả còn lại tự động chạy qua auto-chain (PostToolUse hook).

**SETUP (một lần cho project mới):**

```
npx eps init          # Scaffold config
/config-project       # Auto-detect tech stack
/architect            # Tạo architecture docs (5 phases)
```

**STAGE 1: Design Documents** — User gõ: `/research`

```
/research
  ├── Thu thập evidence (adaptive theo task type)
  │     new:         3 phases (domain KB + codebase + external refs)
  │     enhancement: 2 phases (codebase + impact analysis)
  │     bugfix:      2 phases (root cause + targeted scan)
  │
  ├── auto → /innovate (bỏ qua cho bugfix)
  │     Part 1: SRS decisions [user duyệt]
  │     Part 2: Technical decisions [user duyệt]
  │
  └── auto → /design (bỏ qua cho bugfix)
        /design --srs     → Tài liệu SRS
        /design --basic   → Basic Design
        /design --detail  → Detail Design (FDD + BDD + API)
          └── auto → /design-review (kiểm tra chất lượng)
```

**STAGE 2: Code Implementation** — User gõ: `/plan`

```
/plan
  ├── Load design docs → Tạo implementation plan (English-only)
  │     (auto-split thành sub-plan nếu > 600 dòng)
  │
  ├── auto → /plan-review (threshold: 95%)
  │     Score >= 95%: PASS → tiếp tục
  │     Score < 95%: auto → /plan-optimize → re-review (tối đa 3 lần)
  │
  ├── auto → /execute
  │     Implement từng bước theo plan
  │
  ├── auto → /validate
  │     Kiểm tra implementation so với design
  │
  └── confirm → /test
        "Chạy /test? [Y/n]"
```

**Tổng kết:**

| User gõ | Auto-chain |
|---------|-----------|
| `/research` | → `/innovate` → `/design --srs` → `--basic` → `--detail` → `/design-review` |
| `/plan` | → `/plan-review` → `/plan-optimize` (nếu <95%) → `/execute` → `/validate` → confirm `/test` |

**User commands: 2** (+ 1 confirm cho /test)

Xem chi tiết: `docs/workflow-usage-guide.md`

---

### If `$ARGUMENTS` is `--commands`:
List all commands in Vietnamese:

**Commands EPS Framework v10.0:**

**Setup (chạy 1 lần cho project mới):**
- `/config-project` — Auto-detect tech stack, cấu hình project
- `/architect` — Tạo architecture docs (5 phases: Interview → ADRs → Feature Map → Documents → Estimation)

**Feature Workflow (2 user commands):**
- `/research` — Bắt đầu feature. Thu thập evidence, auto-chain toàn bộ Stage 1
  - Flags: `--type new|enhancement|bugfix`, `--input <file>`, `--module <id>`
- `/plan` — Bắt đầu implementation. Auto-chain toàn bộ Stage 2

**Auto-Chain Commands (tự động chạy, không cần gõ):**
- `/innovate` — Brainstorm SRS + Technical decisions (Part 1 + Part 2)
- `/design --srs` — Tạo Software Requirements Specification
- `/design --basic` — Tạo Basic Design (Architecture)
- `/design --detail` — Tạo Detail Design (FDD + BDD + API Contracts)
- `/design --test` — Tạo Test Plan
- `/design-review` — Kiểm tra chất lượng Detail Design
- `/plan-review` — Đánh giá chất lượng plan (5 dimensions, threshold 95%)
- `/plan-optimize` — Tối ưu plan khi score < 95%
- `/execute` — Implement từng bước theo plan
- `/validate` — Kiểm tra implementation so với design
- `/test` — Chạy tests (cần user confirm)

**Memory:**
- `/save` — Lưu context vào memory bank (branch-aware)
- `/recall` — Nạp context từ memory bank
- `/list` — Liệt kê tất cả memories

**Utility:**
- `/guide [--option]` — Hướng dẫn framework (tài liệu này)
- `/commands` — Dashboard tất cả commands
- `/plan-version` — Quản lý phiên bản plan
- `/reverse-dd` — Tạo Detail Design từ code có sẵn (reverse engineering)

---

### If `$ARGUMENTS` is `--status`:

Run the following command to get current state:
```bash
node core/state/state-manager.js get
```

Then read the active context file (found by `findActiveContext()`).

Display in Vietnamese:

**Trạng thái hiện tại:**
- Feature: [feature name from context]
- State: [current state]
- Task Type: [new/enhancement/bugfix]
- Branch: [current git branch]
- Next Command: [based on state → auto-route mapping]

**State → Next mapping:**
- `INITIAL` → Chạy `/research` để bắt đầu
- `RESEARCHED` → Auto-chain đang chạy `/innovate`
- `BD_DD_CREATED` → Chạy `/plan`
- `PLAN_CREATED` → Auto-chain đang chạy `/plan-review`
- `PLAN_REVIEWED` → Auto-chain đang chạy `/execute`
- `EXECUTED` → Auto-chain đang chạy `/validate`
- `VALIDATED` → Confirm `/test`
- `TESTED` → Workflow hoàn tất

If no active context found, say: "Chưa có workflow nào. Chạy `/research` để bắt đầu feature mới."

---

### If `$ARGUMENTS` is `--next`:

First, determine current state by running:
```bash
node core/state/state-manager.js get
```

Then based on state, display in Vietnamese:

**If INITIAL or no context:**
- Bước tiếp: `/research`
- Mô tả: Bắt đầu feature mới. Chọn task type (new/enhancement/bugfix).
- Ví dụ: `/research --type new --input docs/requirements/REQ-001.md`

**If RESEARCHED / INNOVATE_SRS / INNOVATE_TECHNICAL:**
- Đang trong auto-chain Stage 1
- Mô tả: Innovate và Design đang chạy tự động. Chờ user duyệt tại các checkpoint.
- Checkpoint: Interview questions, SRS decisions, Technical decisions

**If BD_DD_CREATED / DOCS_UPDATED / DD_REVIEWED:**
- Bước tiếp: `/plan`
- Mô tả: Design docs đã xong. Gõ `/plan` để bắt đầu Stage 2.
- Auto-chain: plan → plan-review → execute → validate → test

**If PLAN_CREATED:**
- Đang trong auto-chain: `/plan-review` sẽ tự chạy
- Nếu score < 95%: auto `/plan-optimize` → re-review (tối đa 3 lần)

**If PLAN_REVIEWED:**
- Đang trong auto-chain: `/execute` sẽ tự chạy

**If EXECUTED:**
- Đang trong auto-chain: `/validate` sẽ tự chạy

**If VALIDATED:**
- Bước tiếp: Confirm chạy `/test`
- Mô tả: Validate xong. Chọn Y để chạy test tự động.

**If TESTED:**
- Workflow hoàn tất! Feature đã implement và test xong.

---

### If `$ARGUMENTS` is `--quick`:
Display quick start in Vietnamese:

**Quick Start — EPS Framework v10.0**

**Bước 1: Cài đặt**
```bash
# Cách 1: Chỉ định registry trực tiếp
npm install eps-workflow --registry http://192.168.9.60:4873

# Cách 2: Cấu hình .npmrc rồi install bình thường
echo "registry=http://192.168.9.60:4873" > .npmrc
npm install eps-workflow

# Sau khi install:
npx eps init
```

**Bước 2: Cấu hình project (một lần)**
```bash
/config-project                    # Auto-detect tech stack
/architect                         # Tạo architecture docs (nếu project mới)
```

**Bước 3: Bắt đầu feature**
```bash
/research                          # Stage 1: Design documents
```
- Chọn task type: `new` (feature mới), `enhancement` (thay đổi), `bugfix` (sửa lỗi)
- Provide input: file path hoặc paste mô tả trực tiếp
- Duyệt decisions tại các checkpoint (innovate Part 1 + Part 2)
- Design docs tự động generate

**Bước 4: Implement**
```bash
/plan                              # Stage 2: Plan + Execute + Validate
```
- Plan tự generate, review, optimize
- Code tự implement theo plan
- Validate tự kiểm tra
- Confirm chạy test

**Task type nào phù hợp?**
```
Feature hoàn toàn mới?        → /research --type new
Thay đổi feature có sẵn?      → /research --type enhancement
Hệ thống chạy sai?            → /research --type bugfix
```

**Kiểm tra trạng thái:**
```bash
node core/state/state-manager.js get
/guide --status
/guide --next
```

Xem tài liệu đầy đủ: `docs/workflow-usage-guide.md`

---

### If `$ARGUMENTS` is something else:
Say: "Option không hợp lệ. Chạy `/guide` để xem danh sách options."

---

**IMPORTANT:** All output must be in Vietnamese.
