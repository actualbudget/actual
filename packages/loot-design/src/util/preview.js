export function isPreviewDeployment() {
  console.log(
    process.env.REACT_APP_NETLIFY,
    process.env.REACT_APP_NETLIFY === true
  );
  return process.env.REACT_APP_NETLIFY === true;
}
