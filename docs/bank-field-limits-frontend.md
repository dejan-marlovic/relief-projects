# Bank-field length alignment

Organisation inline create/edit and Admin create/update now limit account numbers to 50 UTF-16 units and SWIFT to 20, matching the backend contract and JavaScript string length. Submission validation checks outgoing values, preserving the existing Admin trimming and Organisation null behavior. No slicing, normalization or schema changes were added.

Admin creation now retains and renders structured server field errors for account/SWIFT; update and Organisation errors remain visible with drafts retained. SWIFT remains optional. The Organisation panel sends empty optional SWIFT as null, which preserves its previous value on updates; Admin retains its existing empty-string behavior. This maintenance fix does not redesign clearing.

Manual acceptance after backend rebuild: edit a fictional bank record in Organisation and Admin, verify 50/20 input limits and successful valid saves. Oversized loaded drafts must produce errors without mutation or truncation. Confirm leading zeros and optional SWIFT remain supported. No bank information was added to reports or exports.
