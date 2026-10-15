export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// "2026-10-14T10-30-05" jaisa naam, taake files ek doosre ko overwrite na karein.
export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);