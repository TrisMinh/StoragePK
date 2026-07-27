# AI - Embeddings

## Purpose

Define how StoragePK creates, stores, updates, and queries embeddings for semantic search and AI retrieval.

## Scope

This document covers text extraction, chunking, embedding metadata, indexing, permissions, refresh, deletion, and evaluation.

## Responsibilities

- Make semantic search reliable and permission-safe.
- Keep embeddings tied to file versions.
- Ensure deletion and permission changes propagate.

## Assumptions

- Embeddings are derived from extracted text and selected metadata.
- Embeddings reference `resource_id` and `file_version_id`.
- Storage can be a vector database or PostgreSQL pgvector depending on scale.

## Dependencies

- [rag.md](rag.md)
- [../database/schema.md](../database/schema.md)
- [../security/encryption.md](../security/encryption.md)

## Detailed Explanation

Embedding pipeline:

```mermaid
flowchart LR
  Resource[File Version] --> Extract[Extract Text]
  Extract --> Chunk[Chunk Text]
  Chunk --> Embed[Generate Embeddings]
  Embed --> Store[Vector Store]
  Store --> Search[Hybrid Search and RAG]
```

Embedding record fields:

| Field | Purpose |
| --- | --- |
| `embedding_id` | Vector record identity. |
| `workspace_id` | Tenant isolation. |
| `resource_id` | File reference. |
| `file_version_id` | Version reference. |
| `chunk_index` | Order in file. |
| `content_hash` | Detect stale chunks. |
| `permission_hash` | Invalidation helper. |
| `model` | Embedding model used. |
| `created_at` | Refresh tracking. |

Rules:

- Recompute embeddings when extracted text or file version changes.
- Remove embeddings when file is hard-deleted or retention policy requires purge.
- Filter by permissions before returning chunks to AI.
- Store enough metadata to explain source citations.

## Edge Cases

- Scanned PDFs may have no text until OCR succeeds.
- Huge files require chunk limits and background processing.
- Permission changes can make existing embeddings unsafe unless filtered at query time.
- Different embedding models produce incompatible vector dimensions.

## Future Considerations

- Add multimodal embeddings for images.
- Add per-collection embedding policies.
- Add semantic deduplication.

