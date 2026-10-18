// Ambient declarations for the server build's Vite imports.

// Vite's raw import (`?raw`): a file's contents as a string.
declare module '*?raw' {
  const content: string;
  export default content;
}
