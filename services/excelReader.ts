/**
 * Reads a file as an ArrayBuffer. 
 * This is a lightweight asynchronous operation that does NOT block the main thread.
 * The heavy parsing will be delegated to the Worker.
 */
export const readFileAsBuffer = async (file: File): Promise<{ title: string, buffer: ArrayBuffer }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const buffer = e.target?.result;
      if (!buffer || !(buffer instanceof ArrayBuffer)) {
        reject(new Error("Failed to read file buffer"));
        return;
      }
      resolve({
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
        buffer: buffer
      });
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
};