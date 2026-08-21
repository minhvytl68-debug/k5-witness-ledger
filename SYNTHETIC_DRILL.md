# Synthetic external-witness drill

This drill uses synthetic commitments only. Stop immediately if any proposed record contains customer data, customer or lead identifiers, identifier-derived values, free text, secrets, keys, ciphertext, private paths, or business data.

## Preconditions

1. Pin the repository owner, repository name, default branch, and expected schema version in configuration.
2. Use a least-privilege credential limited to this repository's contents. Do not commit the credential.
3. Start with a locally verified synthetic-only state.

## Read and reconcile (must precede every write)

1. Resolve the current default-branch commit and enumerate every `witness/*.json` path from that commit. Do not use a `latest` file.
2. Require exactly `000000000001.json` through the highest sequence, with no gaps or unexpected files.
3. Apply the schema and deterministic verifier. Any fetch error, truncation, missing history, duplicate, forbidden field, sequence mismatch, or hash mismatch is `FAIL_CLOSED`.
4. Compare the validated external high-water sequence and head digest with local state. If local state is behind, divergent, or unable to prove reconciliation, block operation and require manual reconciliation. Never lower the external state to match a rolled-back local backup.

## Create-only append

1. Construct only the next path: `witness/<12-digit seq>.json`.
2. Set `prev_hash` to the SHA-256 digest of the prior canonical record.
3. Call GitHub's create-or-update contents endpoint without a `sha` field. Treat only HTTP `201 Created` as append success. HTTP `200`, `409`, `422`, or any other result is `FAIL_CLOSED`.
4. Re-read the default-branch head and full witness directory, then verify the entire chain and the exact new commitment before acknowledging success.

## Required synthetic acceptance cases

1. Normal append of the next unused sequence succeeds and the complete chain verifies.
2. Repeating the same create request for the occupied path, still without `sha`, is rejected; no commit or content change occurs.
3. A stale local snapshot whose sequence is below the external high-water mark is rejected before write.
4. A local record with a divergent `prev_hash` is rejected before write.
5. Missing record, malformed JSON, extra field, renamed sequence, or unavailable GitHub history produces `FAIL_CLOSED`.
6. An attempted force-push or protected-branch deletion is blocked for ordinary writes. Record the result without weakening repository rules.

## Pass gate

Pass only when cases 1-6 have evidence and the public repository still contains exclusively opaque synthetic commitments. Repository-owner rule changes or repository deletion remain an administrative bypass risk; this drill does not approve production or real data.

