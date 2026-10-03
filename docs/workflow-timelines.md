# Workflow steps and retained history

The frontend groups multi-stage work into expandable sections, with an overview before the steps and explanatory text on every step. Numbers explain the process; they do not assert completion or grant permission. Existing server permissions, commands and revision checks remain authoritative.

## Where to use the steps

- Travel: prepare the trip, then request independent approval. Approval does not confirm booking, payment or travel. Steps 3 and 4 record the actual outcome and obtain independent report acceptance. Report acceptance does not verify outcomes or approve expenses.
- Follow-ups: now uses board progress and a compact Details & activity disclosure instead of numbered steps. Completion affects only the task. Recorded activity contains current attribution, not an invented immutable event history.
- Findings and lessons: understand the observation, record the response, link actions/evidence, then resolve and reassess. Responses are optional for lessons; management resolution can explicitly retain outstanding tasks.
- Project closeout: record final-report acceptance, review attention and close administratively, then record archive filing. These decisions neither freeze project work nor move files.
- Budget revisions: prepare the revised plan, record donor decisions, choose the current plan, then activate financial execution explicitly. Existing financial references and shared capacity guards remain unchanged.
- Results: define the measurement, then record and review period-to-date results. Repeated reports are never summed and numeric comparison is not verification.
- Risks: identify and assess, mitigate and review, then close or reopen. Review dates are reminders, not evidence of completed reviews.

Retained history for findings, closeout, revisions, results and risks uses timeline styling with attribution and expandable saved details. Document version history follows the replacement chain; versions remain distinct from approval steps. Financial audit history keeps its comparison table, with a general explanation. Simple registers and financial ledgers are not forced into artificial sequential workflows.

## Interaction and verification

Shared sections start expanded and can be collapsed independently. Content remains mounted so collapsing does not discard an editor or its values. Explanations remain visible in the header. Editors outside the sections remain visible throughout editing. Travel retains its context-sensitive expansion and editing behavior. Follow-up editing remains separate from the compact details disclosure.

The shared controls use native buttons, unique `aria-controls`, `aria-expanded`, keyboard focus styling and narrow-screen spacing. Disclosure navigation performs no writes. Existing workflow tests cover commands and permissions; shared-component tests cover draft retention and independent controls. Live browser acceptance remains a separate manual check.
