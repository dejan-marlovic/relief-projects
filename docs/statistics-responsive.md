# Responsive Statistics

Sector charts now use a responsive container. At tablet and phone widths, a wrapping legend replaces outside sector labels and includes counts and percentages. Status charts use proportional radii. On phones, project types use horizontal bars with height based on category count and a full-name/count legend. Page spacing, legends, and tooltips fit narrow screens.

Aggregation and API requests are unchanged. The existing page contains three charts, with no filters or data tables.

Verification: three focused tests passed (phone/desktop legend data and empty state). Production build passed with existing warnings elsewhere and the existing bundle-size warning. Chart components are mocked in these tests; browser visual acceptance is pending.

Manual checks: open Statistics at 390px, 768px, and desktop widths. Check chart sizing, long category names, legends, tooltips, and a dataset with several project types.

Nothing committed. No backend changes.
