import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// The iOS and Android web views ignore `<a download>` links, so the browser
// way of saving a file does nothing inside the native apps. Instead the file
// is written to the app's cache and handed to the system share sheet, where
// the user can save it to Files, AirDrop it, send it to another app, etc.
// The copy is left in the cache (the receiving app may read it after the
// share sheet closes); the system clears the cache when it needs space.
export async function saveFileInNativeApp(
  contents: string | Uint8Array<ArrayBuffer>,
  filename: string,
  dialogTitle?: string,
) {
  const { uri } = await Filesystem.writeFile({
    path: filename,
    directory: Directory.Cache,
    // Text is written as-is; only binary data needs the base64 round trip.
    ...(typeof contents === 'string'
      ? { data: contents, encoding: Encoding.UTF8 }
      : { data: await toBase64(contents) }),
  });

  try {
    await Share.share({ files: [uri], dialogTitle });
  } catch (error) {
    // Closing the share sheet without picking anything is not a failure.
    if (!isShareCanceled(error)) {
      throw error;
    }
  }
}

function toBase64(contents: Uint8Array<ArrayBuffer>): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // The result is a data URL: "data:<type>;base64,<data>".
      const dataUrl = String(reader.result);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([contents]));
  });
}

function isShareCanceled(error: unknown) {
  return (
    error instanceof Error && error.message.toLowerCase().includes('cancel')
  );
}
