# Experiments, reproduction and run evidence

Purpose: record an experiment plan and its actual execution for undergraduate validation, master's research or thesis verification. Each record should identify a configuration and an interpretable set of runs. Complete planning, execution and analysis separately.

Instructions: write the question and assessment criteria before running, then add actual results. Preserve failures, timeouts and excluded samples rather than showing only the best output. Satisfy prerequisites for data authorization, personal information and ethics approval before affected work begins.

## 1. Run identity and evidence type

| Required item | Information |
| --- | --- |
| Experiment ID, owner and execution date | [Unique ID; start/end times and time zone] |
| Question and planned decision criteria | [Falsifiable hypothesis; metrics and decision rule] |
| Evidence type | [Live run performed here / saved-record replay / authors' report / constructed example / not yet performed; select the actual status] |
| Code and environment | [Relative repository location, commit or file version, locked dependencies, equipment, model and service versions] |
| Data and permission | [Version, splitting procedure, authorized scope, de-identification and approval status] |
| Entry point and parameters | [Complete command or script, configuration, seeds and budget; use environment-variable names instead of secrets] |

## 2. Design and execution

- Comparators: [Baselines, ablations or controls; how identical data and budgets are ensured].
- Metric definitions: [Formula, unit, unit of analysis, denominator, and whether higher or lower is better].
- Repetition and uncertainty: [Reason for repetition count, seed source and calculation of variability or intervals].
- Sample exclusion and stopping rules: [Conditions agreed in advance; record reasons for later changes separately].
- Cost and anomalies: [Time, resources, timeouts, errors, retries and actual impact].

| Run ID | Configuration or seed | Status | Relative path to raw logs / outputs | Metrics and cost | Notes |
| --- | --- | --- | --- | --- | --- |
| [Complete] | [Complete] | [Completed / failed / interrupted] | [Locatable original records] | [Include denominators and units] | [Failure cause or deviation from plan] |

## 3. Analysis and limits

Actual findings: [Only conclusions supported by records; explain effect size and variability].

Failures and counterexamples: [Samples on which the method is ineffective or worse; implications for the hypothesis].

Limitations: [Sample size, budget, versions, human judgment and external validity].

Replay note: when using saved records, specify [Source, generation time, checksum, replay script and what can be verified]. Replay may check parsing and statistical logic; it does not establish successful current execution of a model, online service or external system.

## 4. Verification and acceptance

- [ ] Logs, configuration, data and code versions correspond; no credentials or unauthorized data are included.
- [ ] Successes, failures and exclusions are complete; metric denominators can be recomputed.
- [ ] Figures and tables trace back to raw records; constructed examples are not presented as measurements.
- [ ] Whether another person reran the work is stated; verification scope and results are recorded accurately.

Verification record: [Reviewer, date, steps actually performed, differences and resolution]. Conclusion: [Supported / partly supported / unsupported / insufficient evidence]. Next steps: [Task, owner, deadline].
