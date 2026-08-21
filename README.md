# Opaque Integrity Witness

This public repository is a synthetic staging witness for testing monotonic, hash-chained integrity commitments. It contains no customer data and is not a production service.

## Data policy

Witness records contain only:

- `schema_version`
- `seq`
- `prev_hash`
- `destruction_authority_root_hash`
- `issued_at`

Do not add names, contact details, customer or lead identifiers, identifier-derived fingerprints, free text, secrets, keys, ciphertext, private paths, or business data.

## Ledger rules

- Records live at `witness/NNNNNNNNNNNN.json`.
- Sequence numbers start at 1 and have no gaps.
- Record 1 uses 64 zeroes for `prev_hash`.
- Every later `prev_hash` is the lowercase SHA-256 digest of the prior record's canonical JSON: recursively sort object keys, then serialize with JSON and no insignificant whitespace.
- The highest record is discovered by enumerating and validating the complete directory. There is no mutable `latest` authority.
- Missing, duplicated, malformed, or inconsistent history must fail closed.

Run `node verify.mjs` to validate the included synthetic chain.

## Security boundary

Branch rules block ordinary force-push and branch deletion, but a repository owner can change rules or delete the repository. GitHub also permits an authorized update when the existing blob SHA is supplied. An integration must therefore use a create-only request for each new sequence path, omit `sha`, reject any non-`201` result, re-read and verify the full external chain, and treat missing or rewritten history as a hard failure. This repository is suitable only for the authorized synthetic staging drill.

