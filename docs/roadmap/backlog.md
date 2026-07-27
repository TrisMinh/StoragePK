# Roadmap - Backlog

## Purpose

Collect prioritized future work that is not required for MVP.

## Scope

This document covers product, architecture, security, AI, desktop, provider, and operational backlog items.

## Responsibilities

- Preserve good ideas without bloating MVP.
- Provide implementation candidates after MVP.
- Track risks and dependencies.

## Assumptions

- Backlog priority changes after user testing.
- Items here require separate acceptance criteria before implementation.

## Dependencies

- [mvp.md](mvp.md)
- [future-features.md](future-features.md)

## Detailed Explanation

| Priority | Item | Rationale |
| --- | --- | --- |
| P1 | Folder watch on desktop | Continuous capture from Downloads/Desktop. |
| P1 | Version history | Safer replacement for manual Drive folders. |
| P1 | OCR for scanned PDFs/images | Improves search and classification. |
| P1 | Provider migration | Move files between Drive and Telegram. |
| P2 | Rule builder | User-controlled automation. |
| P2 | Duplicate comparison UI | Better cleanup and storage savings. |
| P2 | Share links | Collaboration and retrieval. |
| P2 | Mobile companion | Capture from phone. |
| P3 | Billing and plans | Commercialization. |
| P3 | Enterprise SSO | Team adoption. |
| P3 | Compliance exports | Advanced business use. |

## Edge Cases

- Watch folders can upload unintended sensitive files; require explicit include/exclude rules.
- Version history can multiply storage usage; quota display must account for it.
- Share links create access-control risks.
- OCR can process sensitive documents; policy controls required.

## Future Considerations

- Convert backlog items into issue templates.
- Add scoring model by impact, risk, and effort.
- Add user feedback pipeline.

