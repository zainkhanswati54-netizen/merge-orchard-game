// Shared helpers for all Merge Orchard test scripts.
// Each test file requires() this and gets { browser, page, teardown } back.

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ---- Fake Matter.js stub (no network needed in CI) -------------------------
const FAKE_MATTER = `
(function () {
  function Vec(x, y) { return { x: x || 0, y: y || 0 }; }
  let idCounter = 1;
  const Engine = {
    create() { return { world: { bodies: [] }, gravity: { x:0,y:1,scale:1 }, _handlers:{} }; },
    update(engine, dt) {
      const s = dt / 16.6667;
      for (const b of engine.world.bodies) {
        if (b.isStatic) continue;
        if (b._forceX) b.velocity.x += (b._forceX / (b.mass||1)) * s;
        if (b._forceY) b.velocity.y += (b._forceY / (b.mass||1)) * s;
        b._forceX = 0; b._forceY = 0;
        b.velocity.y += engine.gravity.y * s * 0.2;
        b.position.x += b.velocity.x * s;
        b.position.y += b.velocity.y * s;
      }
      const items = engine.world.bodies.filter(b => b.label==='item');
      const pairs = [];
      for (let i=0;i<items.length;i++)
        for (let j=i+1;j<items.length;j++) {
          const a=items[i],b=items[j];
          if (Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)<a.circleRadius+b.circleRadius)
            pairs.push({bodyA:a,bodyB:b});
        }
      if (pairs.length && engine._handlers.collisionStart)
        for (const h of engine._handlers.collisionStart) h({pairs});
    },
  };
  const World = {
    add(w,b){ for(const x of Array.isArray(b)?b:[b]) w.bodies.push(x); },
    remove(w,b){ const i=w.bodies.indexOf(b); if(i>=0) w.bodies.splice(i,1); },
  };
  const Composite = { allBodies(w){ return w.bodies.slice(); } };
  const Bodies = {
    rectangle(x,y,w,h,opts){ return Object.assign({id:idCounter++,position:Vec(x,y),velocity:Vec(),isStatic:true,label:'rect',mass:1},opts||{}); },
    circle(x,y,r,opts){ return Object.assign({id:idCounter++,position:Vec(x,y),velocity:Vec(),circleRadius:r,isStatic:false,label:'circle',mass:Math.max(0.1,r*r*0.01)},opts||{}); },
  };
  const Events = { on(e,n,h){ (e._handlers[n]=e._handlers[n]||[]).push(h); } };
  const Body = { applyForce(b,p,f){ b._forceX=(b._forceX||0)+f.x; b._forceY=(b._forceY||0)+f.y; } };
  window.Matter = { Engine, World, Composite, Bodies, Events, Body };
})();
`;

// ---- Static file server (no npx serve needed in CI) -----------------------
function startServer(rootDir, port = 0) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(rootDir, url.parse(req.url).pathname);
      if (filePath.endsWith('/')) filePath += 'index.html';
      const extToMime = {
        '.html':'text/html','.js':'application/javascript',
        '.css':'text/css','.json':'application/json',
        '.ogg':'audio/ogg','.svg':'image/svg+xml','.png':'image/png',
      };
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': extToMime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    server.on('error', reject);
  });
}

// ---- Exported helper -------------------------------------------------------
async function createTestContext(rootDir) {
  const { server, port } = await startServer(rootDir);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  await page.route('**/matter.min.js', r => r.fulfill({ contentType:'application/javascript', body:FAKE_MATTER }));
  await page.route('**fonts.googleapis.com/**', r => r.fulfill({ contentType:'text/css', body:'' }));
  await page.route('**fonts.gstatic.com/**', r => r.abort());

  const BASE = 'http://127.0.0.1:' + port;

  async function gotoGame() {
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('#main-menu.visible', { timeout: 15000 });
    await page.click('#menu-play-btn');
    await page.waitForSelector('#level-select-screen.visible', { timeout: 5000 });
    await page.click('.level-card:not(.is-locked)');
    await page.waitForFunction(() => window.__game && window.__game.state === 'playing', { timeout: 10000 });
  }

  async function teardown() {
    await browser.close();
    await new Promise(r => server.close(r));
  }

  return { browser, page, errors, BASE, gotoGame, teardown };
}

module.exports = { createTestContext };
