# Paper reading and reproduction decision

Purpose: record what was actually learned from close or targeted reading to support discussion, literature synthesis and reproduction decisions. Match the record to the reading depth and mark unread or unverified sections. Not every paper needs to be reproduced.

Instructions: first explain the problem in your own words, then record key evidence. Quotations need page numbers and citations; paraphrasing does not make a source's findings your original conclusion. For example, an improvement in Table 3 on a particular dataset supports that setting, not automatic general effectiveness.

## 1. Reference information

| Required item | Information |
| --- | --- |
| Reader, date and reading type | [Close reading / broad reading / checking a specific question] |
| Title, authors, year and version | [Published version / preprint version; version date] |
| Verifiable sources | [DOI and official paper URL; list official code and data URLs separately] |
| Reason for reading | [Which project question this paper may help address] |
| Actual reading scope | [Full paper / selected sections / abstract only; uncovered sections] |

## 2. Problem, method and evidence

| Item | Explanation in your own words | Evidence location and limitations |
| --- | --- | --- |
| Research problem and setting | [Who encounters which problem?] | [Introduction page; real case or constructed example?] |
| Key assumptions, inputs and outputs | [Conditions needed for the method] | [Section or algorithm number] |
| Mechanism | [Explain in three to five steps, beyond naming models] | [Figure or pseudocode; unclear parts] |
| Evaluation setup | [Data, baselines, metrics, budget and repetition] | [Experimental section; fairness limitations] |
| Main conclusions | [What the data actually support] | [Table or case; negative results, if any] |

## 3. Judgment and relevance

- Limitations explicitly acknowledged by the authors: [Original source location].
- Questions you identified: [Assumptions that may fail and the evidence needed to assess them].
- Relation to previous reading: [Similarities, differences and whether direct comparison is possible; reference IDs].
- Reusable ideas: [Specific method, evaluation approach or presentation technique; how to adapt it].
- Ideas that should not be transferred directly: [Differences in domain, resources, data permission or metrics].
- Follow-up reading: [Material needed to answer a specific question; avoid an indefinitely expanding reading list].

## 4. Reproduction decision and acceptance

Decision: [Do not reproduce / perform a minimal check first / schedule full reproduction; explain value and cost].

If a run was performed, record [Code version, environment, data version, command, relative path to raw logs and actual observations]. If you only inspected authors' results or replayed saved records, label these “Authors' report” or “Saved-record replay,” respectively; do not call them a live run performed here. Record errors and the extent of troubleshooting for failed runs too.

- [ ] You can independently explain the problem, mechanism, evidence and main limitations.
- [ ] Key conclusions have sources; personal conjecture is not attributed to the paper.
- [ ] Reproduction status is accurate and discussion questions are specific and answerable.

Discussion and acceptance record: [Participants, date, clarified questions, actions and whether to add the paper to the literature matrix].
