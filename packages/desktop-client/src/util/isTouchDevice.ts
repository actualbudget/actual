export function isTouchDevice(): boolean {
  return (
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
}
