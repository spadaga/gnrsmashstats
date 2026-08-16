# Isolated Neon migration

This branch replaces JSON-in-Blob application state with Neon Postgres. Vercel Blob remains responsible only for uploaded photo binaries. Photo metadata and URLs are stored in Postgres.

## Required services

Create a new Vercel project from this repository and connect two resources only to that project:

1. A new Neon Postgres database, exposing its pooled connection string as `DATABASE_URL`.
2. A new Vercel Blob store, exposing `BLOB_READ_WRITE_TOKEN`.

Do not connect either resource to the existing production project.

## Import the supplied snapshot

Copy `.env.example` to `.env.local`, set `DATABASE_URL`, then run:

```powershell
npm run db:migrate -- "S:\MYdocs&downloads\Downloads\badminton-resultslatest.json"
```

The API also creates the schema on first use. `db/schema.sql` is provided for review or manual setup.

The JSON export contains photo URLs, not the photo binary files. The migration preserves those URLs. To make the new project fully independent, the source photos must later be copied into the new Blob store and their Postgres URLs updated. Do not remove the old Blob store until that copy has been verified.

## Verification gate

- Build and lint pass.
- Import counts match the source snapshot.
- `/api/state` returns all five resources.
- Player, match, video, and slot CRUD persists after a redeploy.
- Photo upload and delete use the new Blob store.
- Export/import and daily restore work.
- Existing production URL and existing Vercel project remain unchanged.
