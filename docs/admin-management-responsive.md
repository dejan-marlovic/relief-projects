# Responsive Admin management

- Shared form styles cover 61 create, update, delete, and restore modules. Each module includes the same Sass mixin while retaining local CSS-module scoping.
- On tablets, form grids use one column and headers can wrap. On phones, nested padding is reduced, action buttons stack, labels use a single gap, and fields have 44px minimum height with 16px text.
- The Admin toolbar wraps action choices and supports touch-sized radio options and entity lookup results.
- User roles become labeled cards on phones, retaining existing checkbox accessible names and Save/Reset controls.
- The access matrix retains horizontal scrolling with a keyboard-focusable, named region and a sticky area column.

No API, permission, save, delete, or restore behavior changed. Audit History retains its separate responsive styling. Theme and logo settings were not part of this form-management slice.

Visual acceptance remains pending in the running application. Check Admin at phone, tablet, and desktop widths: a user form, employee form, exchange rate form, delete/restore form, user roles (including error messages), and the access matrix. Use dummy records for any manual save/delete/restore checks.

No commit created.

Verification: all 264 tests across 46 suites passed. Production compilation passed with existing warnings. The changed role-management component passed ESLint, and git diff --check passed.
