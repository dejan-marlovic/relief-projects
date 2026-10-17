// ✅ Keep this in sync with backend:
// spring.servlet.multipart.max-file-size / spring.servlet.multipart.max-request-size
export const MAX_UPLOAD_MB = 50;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  mp4: ["video/mp4"],
  mp3: ["audio/mpeg", "audio/mp3"],
};
export const ALLOWED_FORMATS_LABEL =
  "PDF, DOCX, XLSX, PPTX, TXT, CSV, JPG, PNG, WebP, MP4 and MP3";
export const FILE_INPUT_ACCEPT = Object.entries(ALLOWED_FILE_TYPES)
  .flatMap(([extension, mimeTypes]) => [`.${extension}`, ...mimeTypes])
  .filter((value, index, values) => values.indexOf(value) === index)
  .join(",");

export const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export const validateDocumentFile = (file) => {
  if (!file) return "Choose a file to upload.";
  if (!file.size) return "The selected file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (${formatMB(file.size)}). Max allowed is ${MAX_UPLOAD_MB}MB.`;
  }

  const name = String(file.name || "").trim();
  if (!name || name.includes("/") || name.includes("\\")) {
    return "The filename is not valid.";
  }

  const nameParts = name.split(".");
  if (nameParts.length !== 2 || !nameParts[0] || !nameParts[1]) {
    return "Use a filename with one supported extension. Multiple extensions are not allowed.";
  }

  const extension = nameParts[1].toLowerCase();
  const acceptedMimeTypes = ALLOWED_FILE_TYPES[extension];
  if (!acceptedMimeTypes) {
    return `Unsupported file type. Allowed types: ${ALLOWED_FORMATS_LABEL}.`;
  }

  const declaredMimeType = String(file.type || "").toLowerCase();
  if (declaredMimeType && !acceptedMimeTypes.includes(declaredMimeType)) {
    return `The file extension and reported type do not match. Allowed types: ${ALLOWED_FORMATS_LABEL}.`;
  }

  return "";
};
