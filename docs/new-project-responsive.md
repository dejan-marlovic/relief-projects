# Responsive New Project

The main grid uses one column at tablet widths. On phones, paired fields stack, nested padding is reduced, and the header scrolls with the form. Inputs use 16px text and a 44px minimum height. Actions wrap, long upload filenames and validation text can break, and label/section spacing follows the Project page.

Only RegisterProject.module.scss changed. Registration, reset, validation, and upload logic remain unchanged.

Verification: Sass compilation and git diff --check passed. No behavioral tests were added for this CSS-only change. Browser visual acceptance remains pending: check phone/tablet/desktop widths, date inputs, validation errors, a long image filename, and Register/Reset buttons.

Nothing committed.
