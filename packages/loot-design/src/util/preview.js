export function isPreviewDeployment() {
  console.log(process.env.NETLIFY, process.env.NETLIFY === true);
  return process.env.NETLIFY === true;
}
