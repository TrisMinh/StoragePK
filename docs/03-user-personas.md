# 03 - User Personas

## Purpose

Define representative users for product, UX, architecture, and testing decisions.

## Scope

This document covers personas, goals, pains, workflows, and acceptance signals.

## Responsibilities

- Keep feature design grounded in real behavior.
- Provide test scenarios for UX and QA.
- Clarify what "modern and logical" means for each user.

## Assumptions

- Personas are behavioral models, not demographics.
- A single real user may match multiple personas.

## Dependencies

- [02-target-users.md](02-target-users.md)
- [testing/e2e.md](testing/e2e.md)

## Detailed Explanation

| Persona | Goals | Current Pain | StoragePK Promise |
| --- | --- | --- | --- |
| The Builder | Keep project assets, screenshots, docs, and exports findable. | Files disappear across Downloads, Drive, and chats. | Drop once, auto-classify by project and type. |
| The Archivist | Preserve receipts, IDs, invoices, contracts, and proof. | Manual folder naming is inconsistent. | Reliable metadata, OCR, dates, and audit trail. |
| The Operator | Move many files fast with minimal decisions. | Cloud uploads and folder selection interrupt flow. | Batch intake, provider routing, queue status. |
| The Searcher | Find a file by memory, not filename. | Search only works when names are perfect. | Semantic search, filters, timeline, notes. |

Example acceptance scenario:

1. User drags 40 mixed files into desktop.
2. StoragePK groups them by project, type, and detected date.
3. User accepts 32 suggestions, edits 8, and starts upload.
4. Later user searches "invoice camera lens May" and finds the file immediately.

## Edge Cases

- The Archivist needs strict confidence indicators for OCR and classification.
- The Operator needs keyboard-first bulk actions.
- The Searcher may remember wrong details; search must tolerate approximate time, entity, and content matches.

## Future Considerations

- Add persona-specific onboarding paths.
- Add saved workspace modes such as "Finance", "Content", "Projects", and "Evidence".

