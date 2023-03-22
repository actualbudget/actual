export async function sha256String(str) {
  let inputBuffer = new TextEncoder('utf-8').encode(str).buffer;
  let buffer = await crypto.subtle.digest('sha-256', inputBuffer);
  let outputStr = Array.from(new Uint8Array(buffer))
    .map(n => String.fromCharCode(n))
    .join('');
  return btoa(outputStr);
}
