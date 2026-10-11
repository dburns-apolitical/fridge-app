/**
 * iOS home-screen apps cannot reliably download files, so prefer the share sheet
 * (which offers "Save to Files") and fall back to a normal download elsewhere.
 */
export const saveFile = async (file: File): Promise<void> => {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
