# JMS database schema (`jms`)

Created by `infrastructure/postgres/migrations/010_jms_schema.sql` (idempotent). Roles are added by `003_jms_roles.sql`.
No foreign keys cross into the `iam` schema; user ids are stored as plain uuids and names are read from `iam.users`.

| Table | Purpose |
|---|---|
| journals, journal_staff | Journal identity (ISSN, review model, APC) and public editorial board |
| categories, article_types | Subject taxonomy used by the submission form |
| manuscripts, manuscript_authors, manuscript_files | Submission, co-authors (ORCID, corresponding), files per round (manuscript, revision, supplementary, proof) |
| manuscript_events | Audit timeline of every status change |
| review_assignments | Reviewer invitations and reviews (double blind) |
| editor_recommendations | Associate editor recommendation to the EIC |
| fees | Publication fee (PENDING, VERIFYING, WAIVER_REQUESTED, PAID, WAIVED, CANCELLED) |
| proofs | Production proofs and author corrections |
| issues, articles, doi_counters | Volumes/issues, published articles, DOI sequence `ORA/<CODE>/<YYYY>/<VOL>/<ISSUE>/<NNNNN>` |
| reviewer_profiles | Expertise, ORCID, availability |
| contact_messages | Messages from the public contact form |

Workflow: DRAFT → SUBMITTED → UNDER_SCREENING → UNDER_REVIEW → (ACCEPTED | REVISION_REQUIRED → REVISED → … | REJECTED)
→ IN_PRODUCTION → PUBLISHED. Desk rejection is allowed from screening. See SRS FR-JM-001..008 and UC-JMS-01..10.
