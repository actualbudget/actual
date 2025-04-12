import JSZip from 'jszip';

export async function extractZipToMap(zipBlob: Blob) {
  const zip = await JSZip.loadAsync(zipBlob);
  const fileMap = new Map();

  for (const [filePath, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      const content = await file.async('text');
      fileMap.set(filePath, content);
    }
  }
  return fileMap;
}
