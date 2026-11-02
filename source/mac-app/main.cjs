// Desktop wrapper: serves the built game (./game, = dist/) over a privileged app:// scheme so module
// scripts, fetch() of .glb/.hdr/.ktx2 and WebGL work exactly as on a web server. No network needed.
const { app, BrowserWindow, protocol, net, Menu, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, 'game');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

let win;
function open(page) { win.loadURL('app://game/' + page); }
function createWindow() {
  win = new BrowserWindow({ width: 1440, height: 860, minWidth: 960, minHeight: 540, backgroundColor: '#050404', title: 'The Manor', show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  open(process.env.MANOR_PAGE || 'launcher.html');
}
const menu = Menu.buildFromTemplate([
  { role: 'appMenu' },
  { label: '游戏', submenu: [
    { label: '主菜单', accelerator: 'CmdOrCtrl+L', click: () => open('launcher.html') },
    { label: '宅邸美术切片 (The Manor)', accelerator: 'CmdOrCtrl+1', click: () => open('index.html?q=high') },
    { label: 'Wrenfield 地图灰盒', accelerator: 'CmdOrCtrl+2', click: () => open('wrenfield.html') },
    { type: 'separator' },
    { label: '画质：低', click: () => win.loadURL(win.webContents.getURL().replace(/([?&])q=\w+/, '$1q=low')) },
    { label: '重新加载', accelerator: 'CmdOrCtrl+R', click: () => win.reload() },
  ] },
  { label: '窗口', submenu: [{ role: 'togglefullscreen', label: '全屏' }, { role: 'minimize', label: '最小化' }, { role: 'toggleDevTools', label: '开发者工具' }] },
]);

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const u = new URL(req.url); let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'launcher.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  Menu.setApplicationMenu(menu);
  createWindow();
});
app.on('window-all-closed', () => app.quit());
