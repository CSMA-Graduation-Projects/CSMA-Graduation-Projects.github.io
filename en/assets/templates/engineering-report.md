# Software requirements, detailed design and test report

Purpose: connect requirements, design, implementation and validation in a traceable record for undergraduate graduation projects, competitions or master's engineering projects. The record may be split into three reports if requirement IDs and versions remain consistent. Official course, school or project templates take precedence.

Instructions: start with the behavior users need and its acceptance conditions, then explain implementation and testing. Feature screenshots and lines of code do not replace quality evidence. Example IDs include REQ-01, DES-01 and TEST-01; maintain a stable numbering scheme.

## 1. Project baseline

| Required item | Information |
| --- | --- |
| Project, owner, version and date | [Corresponding commit or release] |
| Users and real problem | [Setting, roles, main difficulties and evidence] |
| Scope and constraints | [Included/excluded features, equipment, budget, authorization and time] |
| Applicable requirements | [School form, project agreement or technical specification and version] |

## 2. Requirements

| Requirement ID | Scenario and input | Expected behavior and output | Exception and permission rules | Verifiable acceptance conditions |
| --- | --- | --- | --- | --- |
| [REQ-01] | [Who acts under which conditions?] | [What should the system do?] | [Handling denied access, invalid input and service failure] | [Specific observable result] |

Non-functional requirements: [Performance measurement conditions, reliability, usability, security, privacy and maintainability; provide a reasonable basis rather than promising arbitrary extreme targets].

Requirements confirmation: [Person, date, unresolved items and change record].

## 3. Detailed design and implementation mapping

- Architecture and modules: [Diagram location, responsibilities, data flow and boundaries; reasons for key choices].
- Data design: [Entities, fields, constraints, retention periods, authorization and de-identification].
- Interface design: [Inputs, outputs, error codes, identity/access checks and failure handling].
- Key processes: [Algorithms or state transitions, concurrency, transactions and recovery; as relevant to the project].
- Deployment and dependencies: [Environment, sample configuration, third-party licenses, startup and recovery entry points; no credentials].

| Requirement ID | Design location | Implementation location and version | Related tests |
| --- | --- | --- | --- |
| [REQ-01] | [Module or design section] | [Relative code path, version] | [TEST-01] |

## 4. Tests and defects

Test environment: [Hardware, software, data version, execution command, date and authorized test scope].

| Test ID and requirement | Input, prerequisites and steps | Expected result | Actual result and logs | Status / defect |
| --- | --- | --- | --- | --- |
| [TEST-01 / REQ-01] | [Repeatable steps] | [Explicit output] | [Relative location of actual execution records] | [Passed / failed / not performed] |

Coverage: [Normal, boundary, exception, permission and recovery paths; uncovered scope and reasons]. Distinguish saved-record replay from actual system testing. Screenshots are supporting material and cannot establish that an unperformed process ran.

## 5. Acceptance

- [ ] Each key requirement maps to design, implementation and an actual test.
- [ ] Failed tests, known defects and limitations are fully stated in the report.
- [ ] Data permissions, third-party licenses and sensitive configuration have been checked.
- [ ] The recipient can run the supplied entry point; the report matches the final delivered version.

Acceptance record: [Reviewer, date, accepted scope, outstanding defects and correction deadline]. After a version change, recheck affected requirements and tests.
