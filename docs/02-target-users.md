# 02 - Target Users

## Purpose

Identify who StoragePK is built for and which needs shape the MVP.

## Scope

This document covers primary, secondary, and excluded user segments.

## Responsibilities

- Guide feature priority.
- Define workflow complexity.
- Inform onboarding, terminology, and permissions.

## Assumptions

- StoragePK starts as a single-user or small-team product.
- Users already have files scattered across local folders, Google Drive, Telegram, downloads, and chat exports.
- Users are willing to connect external provider accounts for automation.

## Dependencies

- [03-user-personas.md](03-user-personas.md)
- [04-user-stories.md](04-user-stories.md)
- [frontend/design-system.md](frontend/design-system.md)

## Detailed Explanation

Primary users:

| Segment | Need | StoragePK Fit |
| --- | --- | --- |
| Solo builders | Store project files, screenshots, invoices, exports, and docs quickly. | Fast drag intake, smart tags, project collections. |
| Content operators | Archive media, captions, source files, and published assets. | Type-aware classification and provider routing. |
| Admin-heavy freelancers | Track contracts, receipts, client docs, and evidence. | Audit log, OCR, date and entity extraction. |
| AI-assisted power users | Want files searchable by meaning and context. | Embeddings, summaries, and natural-language search. |

Secondary users include small teams that share a single organized library and technical users who want provider control.

Excluded for MVP:

- Large enterprise document management.
- Legal-grade records retention.
- Consumer social sharing.
- Full Google Drive replacement storage infrastructure.

## Edge Cases

- A user may have only Telegram and no Drive; MVP should allow Telegram-only setup with explicit size warnings.
- A user may not trust AI; manual mode must remain complete.
- A user may need local-only staging before provider upload; desktop must support queued offline intake.

## Future Considerations

- Add accountant, teacher, developer, and creator-specific templates.
- Add workspace presets that create tags, smart rules, and collections automatically.

