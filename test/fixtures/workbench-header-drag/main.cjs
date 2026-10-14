// Run with Electron, not Node. All state stays in a temporary profile.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-header-drag-'))
app.setPath('userData', root)
app.setName('DSH Header Drag Verification')
const log = (event, detail) => {
  const entry = JSON.stringify({ event, ...detail })
  fs.appendFileSync(path.join(root, 'events.jsonl'), entry + '\n')
  console.log(entry)
}
const source = fs.readFileSync(path.resolve(__dirname, '../../../packages/dsh-desktop-workbenches/client.js'), 'utf8')
const css = source.split('\n').filter(line => line.includes('html[data-platform=darwin] :is(.dshWbBusiness')).join('\n')
assert.ok(css.includes('-webkit-app-region:drag'))
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 980, height: 560, x: 160, y: 140, frame: false, title: 'DSH Header Drag Verification', webPreferences: { preload: path.join(__dirname, 'preload.cjs') } })
  win.on('move', () => log('move', { bounds: win.getBounds() }))
  ipcMain.on('fixture-click', (_event, id) => log('click', { id, bounds: win.getBounds() }))
  const html = `<html data-platform="darwin"><head><style>${css}
  body{margin:0;font:16px sans-serif;background:#fafafa}header{display:flex;align-items:center;gap:20px;height:100px;padding:0 24px;background:#e8edf5}button,input{padding:14px}#blank{flex:1;height:60px;border:1px dashed #888}main{padding:24px}#menu{position:absolute;top:102px;left:400px;background:white;padding:20px;border:1px solid #888}summary{padding:10px}#content-header{height:50px;background:#ddd}
  </style></head><body><div class="dshWbBusiness" data-side="left" data-embedded="true"><section><header><strong>Top header</strong><div id="blank">DRAG BLANK</div><button id="refresh"><span style="-webkit-app-region:drag">Refresh</span></button><input id="input" value="editable" size="8"><details><summary id="toggle">Menu</summary><div id="menu" role="menu"><button id="item">Menu item</button><div data-dsh-no-drag id="optout">Explicit no-drag</div></div></details></header><main><h2>Isolated host CSS fixture</h2><p>Drag the dashed blank area. Click Refresh and Menu. The log records native window bounds and clicks.</p><div id="counts"></div><header id="content-header">Nested content header: must not drag</header><p><a id="link" href="#">Link control</a></p></main></section></div></body></html>`
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  const results = await win.webContents.executeJavaScript(`(() => {
    const region = id => getComputedStyle(document.querySelector(id)).webkitAppRegion;
    const host = document.querySelector('.dshWbBusiness');
    const check = () => ({header:region('header'),button:region('#refresh'),nested:region('#refresh span'),input:region('#input'),menu:region('#menu'),optout:region('#optout'),content:region('#content-header')});
    const probes = ['a','select','textarea','label','summary','[role=slider]','[role=menuitem]','[role=dialog]','[contenteditable]','[contenteditable=plaintext-only]','[tabindex]','[draggable=true]','[data-window-drag=false]'].map(selector => {
      const el=document.createElement(selector.startsWith('[')?'div':selector);
      if(selector.startsWith('[')){const [name,value='']=selector.slice(1,-1).split('=');el.setAttribute(name,value)}
      const child=document.createElement('span');child.style.webkitAppRegion='drag';el.append(child);document.querySelector('header').append(el);
      const result={selector,region:getComputedStyle(el).webkitAppRegion,nested:['SELECT','TEXTAREA'].includes(el.tagName)?null:getComputedStyle(child).webkitAppRegion};el.remove();return result;
    });
    const mac = check();
    document.documentElement.dataset.platform='win32'; const windows=check();
    document.documentElement.dataset.platform='darwin'; host.dataset.embedded='false'; const standard=check();
    host.className='dshWbCustomFrame'; const custom=check();
    host.className='dshWbBusiness';host.dataset.embedded='true';
    document.addEventListener('click', e => {const target=e.target.closest('button,summary,[data-dsh-no-drag]');if(target){document.querySelector('#counts').textContent='Clicked '+target.id;window.fixture.click(target.id)}});
    return {mac,windows,standard,custom,probes};
  })()`)
  for (const variant of [results.mac, results.custom]) {
    assert.equal(variant.header, 'drag')
    for (const id of ['button','nested','input','menu','optout']) assert.equal(variant[id], 'no-drag', id)
    assert.notEqual(variant.content, 'drag')
  }
  for (const probe of results.probes) { assert.equal(probe.region, 'no-drag', probe.selector); if(probe.nested!==null) assert.equal(probe.nested, 'no-drag', probe.selector) }
  assert.notEqual(results.windows.header, 'drag')
  assert.notEqual(results.standard.header, 'drag')
  log('ready', { root, bounds: win.getBounds(), results })
  if (process.env.DSH_DRAG_ASSERT_ONLY === '1') app.quit()
}).catch(error => { console.error(error); app.exit(1) })
app.on('window-all-closed', () => app.quit())
