// Draw a red dashed bounding box + label over an element so the next
// playwright-cli screenshot captures a "look here" annotation.
//
// Inputs come via env vars when invoked through:
//   SELECTOR='...' LABEL='...' playwright-cli run-code --filename=this-file.js
//
// The overlay nodes are tagged with data-pr-highlight so they can be wiped:
//   playwright-cli eval "document.querySelectorAll('[data-pr-highlight]').forEach(n => n.remove())"

module.exports = async page => {
  const selector = process.env.SELECTOR;
  const label = process.env.LABEL || '';

  if (!selector) {
    throw new Error('SELECTOR env var is required');
  }

  const result = await page.evaluate(
    ({ selector, label }) => {
      const el = document.querySelector(selector);
      if (!el) return { ok: false, reason: 'not-found' };

      el.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'instant',
      });

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return { ok: false, reason: 'zero-size' };
      }

      const PAD = 6;
      const box = document.createElement('div');
      box.setAttribute('data-pr-highlight', 'box');
      Object.assign(box.style, {
        position: 'fixed',
        left: `${rect.left - PAD}px`,
        top: `${rect.top - PAD}px`,
        width: `${rect.width + PAD * 2}px`,
        height: `${rect.height + PAD * 2}px`,
        border: '3px dashed #e3342f',
        borderRadius: '6px',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.04)',
        pointerEvents: 'none',
        zIndex: '2147483647',
        boxSizing: 'border-box',
      });
      document.body.appendChild(box);

      if (label) {
        const tag = document.createElement('div');
        tag.setAttribute('data-pr-highlight', 'label');
        tag.textContent = label;
        const labelTop = Math.max(0, rect.top - PAD - 28);
        Object.assign(tag.style, {
          position: 'fixed',
          left: `${rect.left - PAD}px`,
          top: `${labelTop}px`,
          padding: '4px 8px',
          background: '#e3342f',
          color: '#fff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: '12px',
          fontWeight: '600',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: '2147483647',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        });
        document.body.appendChild(tag);
      }

      return {
        ok: true,
        rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      };
    },
    { selector, label },
  );

  if (!result.ok) {
    throw new Error(
      `Highlight failed: ${result.reason} (selector: ${selector})`,
    );
  }

  // Give the browser a frame to paint before the next screenshot fires.
  await page.waitForTimeout(50);
};
