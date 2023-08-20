export default function screenshotConfig(page) {
  return {
    // eslint-disable-next-line rulesdir/typography
    mask: [page.locator('[data-vrt-mask="true"]')],
  };
}
