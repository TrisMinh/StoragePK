# AI - Prompts

## Purpose

Define prompt patterns, safety constraints, and output requirements for AI classification, summarization, and assistant features.

## Scope

This document covers system prompts, classification prompts, RAG prompts, citation rules, action confirmation prompts, and prompt injection defenses.

## Responsibilities

- Make AI behavior predictable and auditable.
- Prevent AI from taking unsafe file actions.
- Require grounded answers with citations.

## Assumptions

- AI usage is optional and policy-controlled.
- Sensitive workspaces can disable external AI processing.
- AI outputs are suggestions unless explicitly confirmed by the user.

## Dependencies

- [rag.md](rag.md)
- [agents.md](agents.md)
- [../security/threats.md](../security/threats.md)

## Detailed Explanation

Prompt principles:

| Principle | Requirement |
| --- | --- |
| Grounded | Answers cite authorized files when based on stored content. |
| Non-destructive | AI cannot delete, move, share, or rename without confirmation. |
| Permission-aware | Prompt context includes only authorized resources. |
| Injection-resistant | Document text is untrusted data, never instruction authority. |
| Auditable | Store prompt policy decisions and citations. |

Classification output schema:

```json
{
  "category": "finance.receipt",
  "suggestedFolderPath": "/Finance/Receipts/2026",
  "tags": ["receipt", "camera", "tax"],
  "confidence": 0.87,
  "reason": "The document contains invoice-like fields and a purchase date.",
  "requiresReview": true
}
```

Assistant answer requirements:

- Cite source file IDs and version IDs.
- State uncertainty when evidence is weak.
- Refuse unauthorized or destructive requests.
- Separate answer text from proposed actions.

## Edge Cases

- A document may contain instructions telling the AI to ignore policies; treat as content only.
- Classification can be uncertain; low confidence must require review.
- AI may infer sensitive categories; display carefully and allow correction.
- User asks for files outside their permissions; respond with safe denial.

## Future Considerations

- Add prompt version registry.
- Add evaluation datasets for classification quality.
- Add localized prompts.

