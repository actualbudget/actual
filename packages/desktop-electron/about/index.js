const { ipcRenderer } = require('electron');

const root = document.querySelector('#root');

const { version: appVersion } = ipcRenderer.sendSync('get-bootstrap-data');

const iconPath = __dirname + '/../icons/icon.png';

root.style.display = 'flex';
root.style.flexDirection = 'column';
root.style.alignItems = 'center';
root.style.padding = '10px';
root.innerHTML = `
  <img src="${iconPath}" width="60" height="60" />
  <strong style="font-size:14px; padding-top: 15px">Actual</strong>
  <div style="padding-bottom:15px; padding-top: 5px">Version ${appVersion}</div>
  <div id="container">
    <div id="update-check"><button>Check for updates</button></div>
    <div id="apply-update"><button>Restart to Update</button></div>
    <div id="success"></div>
    <div id="error"></div>
  </div>
  <div style="color:rgba(0, 0, 0, .45)">&copy; 2020 Shift Reset LLC</div>
`;

const container = root.querySelector('#container');
container.style.height = '45px';
container.style.textAlign = 'center';

const updateEl = root.querySelector('#update-check');
const applyUpdateEl = root.querySelector('#apply-update');
applyUpdateEl.style.display = 'none';
const successEl = root.querySelector('#success');
successEl.style.display = 'none';
successEl.style.textAlign = 'center';
const errorEl = root.querySelector('#error');
errorEl.style.display = 'none';

root.querySelector('#update-check button').addEventListener('click', () => {
  ipcRenderer.send('check-for-update');
});

root.querySelector('#apply-update button').addEventListener('click', () => {
  ipcRenderer.send('apply-update');
});

ipcRenderer.on('update-checking', () => {
  updateEl.style.display = 'none';
  successEl.innerHTML = 'Checking...';
  successEl.style.display = 'block';
  errorEl.style.display = 'none';
});

ipcRenderer.on('update-available', () => {
  updateEl.style.display = 'none';
  successEl.innerHTML = 'Update available! Downloading...';
  successEl.style.display = 'block';
});

ipcRenderer.on('update-downloaded', () => {
  updateEl.style.display = 'none';
  successEl.style.display = 'none';
  applyUpdateEl.style.display = 'block';
});

ipcRenderer.on('update-not-available', () => {
  updateEl.style.display = 'none';
  successEl.innerHTML = 'All up to date!';
  successEl.style.display = 'block';
});

ipcRenderer.on('update-error', (event, msg) => {
  updateEl.style.display = 'block';
  successEl.style.display = 'none';

  let text;
  if (msg.domain === 'SQRLUpdaterErrorDomain' && msg.code === 8) {
    text = `
      Error updating the app. It looks like it's running outside of the applications
      folder and can't be written to. Please install the app before updating.
    `;
  } else {
    text = 'Error updating the app. Please try again later.';
  }

  errorEl.innerHTML = `<div style="text-align:center; color:#F65151">${text}</div>`;
  errorEl.style.display = 'block';
});

document.addEventListener('keydown', e => {
  // Disable zoom with keys + and -
  if (e.keyCode === 187 || e.keyCode === 189) {
    e.preventDefault();
  }
});
