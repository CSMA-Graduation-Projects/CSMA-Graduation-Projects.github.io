# Research data, code and graduation-material archive checklist

Purpose: retain research conclusions together with verifiable material at a stage freeze, paper submission, thesis examination, post-defense or group departure. Materials must be locatable and reviewable while respecting data permissions, anonymous review, privacy and intellectual property.

Instructions: list actual materials first, then distinguish the public package from restricted storage. Use project-relative paths. Never include credentials. For data that cannot be published, retain authorization information, version identifiers and access conditions; do not use empty files to imply that complete data are supplied.

## 1. Archive identity and permissions

| Required item | Information |
| --- | --- |
| Project, owner, archive date and version | [Scope and purpose of this freeze] |
| Corresponding thesis or output | [Identify anonymous examination, defense and final copies separately] |
| Storage and incoming owner | [Relative location, controlled-storage identifier and maintenance responsibility] |
| Disclosure scope and authorization | [Public / group only / named people; data, code, image and model licenses] |
| Retention period and disposal basis | [University, contractual or ethics requirements; do not independently promise permanent retention] |

## 2. Material inventory

| Category | Items to check | Actual location and version | Permissions and missing items |
| --- | --- | --- | --- |
| Reading and plans | [Topic, literature review, proposal and approved changes] | [Complete] | [Complete] |
| Data and permission | [Sources, raw/processed versions, dictionary, splits, licenses and de-identification] | [Complete] | [Complete] |
| Code and environment | [Commit, locked dependencies, execution entry point, sample configuration and third-party licenses] | [Complete] | [Complete] |
| Runs and analysis | [Raw logs, failures, statistical scripts and figure-generation entry points] | [Complete] | [Separate live runs and saved replay] |
| Thesis and procedures | [Sources, anonymous copy, final copy, examination responses, defense revisions and official receipts] | [Complete] | [Complete] |
| Getting started | [README, execution steps, known limitations and how to request non-public material] | [Complete] | [Complete] |

## 3. Integrity and recovery checks

- File integrity: generate a relative-path inventory and SHA-256 manifest. Record [Tool or command, date, file count and total size].
- Checksum scope: specify [Exclusions such as the checksum manifest itself and temporary files]. Recheck after copying or extraction and retain results.
- Usability: follow the README in a clean directory. Record [Steps actually performed, environment and results]. If only file existence was checked, say “Structural check,” not “Full reproduction.”
- Data boundaries: identify raw and processed data separately. Verify access rules for restricted data; do not copy or publish it without authorization.
- Backup recovery: record [Backup version, owner, materials sampled in the recovery exercise and checksum results].

## 4. Self-check and acceptance

- [ ] Claims, figures, data, code and run records can be linked.
- [ ] Anonymous and identified final copies are distinguished; the package contains no credentials or unauthorized material.
- [ ] The checksum manifest was actually generated and checked; missing items and unperformed steps are explicit.
- [ ] The incoming owner can find the entry point and understand permissions and recovery.

Acceptance record: [Deliverer, recipient, date, actual spot-check scope, failures and correction deadline]. Archive status: [Incomplete / checksummed and verified / received; select the actual state].
