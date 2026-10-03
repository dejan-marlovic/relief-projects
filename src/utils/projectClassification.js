export const classificationFields = [
  { name: "projectNameSv", label: "Swedish title", max: 255 },
  { name: "projectNameEn", label: "English title", max: 255 },
  { name: "targetGroupDescription", label: "Target group description", max: 2000 },
];
export const supportsClassification = project => !!project && classificationFields.every(({ name }) => Object.prototype.hasOwnProperty.call(project, name));
export const classificationValues = project => Object.fromEntries(classificationFields.map(({ name }) => [name, project?.[name] ?? ""]));
// Match Java String.strip/Character.isWhitespace rather than JS trim (NBSP differs).
// eslint-disable-next-line no-control-regex
export const normalizeClassification = value => String(value ?? "").replace(/^[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+$/g, "") || null;
export const classificationChanges = (draft, original) => Object.fromEntries(classificationFields.filter(({ name }) => normalizeClassification(draft[name]) !== normalizeClassification(original?.[name])).map(({ name }) => [name, normalizeClassification(draft[name])]));
export const classificationErrors = draft => Object.fromEntries(classificationFields.filter(({ name, max }) => (normalizeClassification(draft[name]) || "").length > max).map(({ name, max }) => [name, `Use at most ${max} characters.`]));
