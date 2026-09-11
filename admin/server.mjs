// 悠+設計 HYGGE DESIGN — 本機管理後台伺服器
// 用法：node admin/server.mjs  （或雙擊「啟動網站後台.bat」）
import http from 'node:http';
import { readFile, writeFile, mkdir, copyFile, readdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ADMIN = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(ADMIN, '..');
const PORT = Number(process.env.ADMIN_PORT) || 5567;
const DATA_NAMES = new Set(['site', 'home', 'about', 'hygge', 'projects', 'contact']);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

// extra：額外標頭。注意 writeHead 會蓋掉先前 setHeader 的內容，
// 所以要一起傳進來，不能在呼叫端先 setHeader。
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}
const sendJson = (res, code, obj) => send(res, code, JSON.stringify(obj));

function readBody(req, limit = 200 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function runNode(script) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [script], { cwd: ROOT });
    let out = '', err = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('close', code => resolve({ code, out, err }));
  });
}

function runGit(args) {
  return new Promise(resolve => {
    const p = spawn('git', args, { cwd: ROOT });
    let out = '', err = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('close', code => resolve({ code, out, err }));
    p.on('error', e => resolve({ code: -1, out: '', err: e.message }));
  });
}

async function backupData(name) {
  const src = path.join(ADMIN, 'data', name + '.json');
  if (!existsSync(src)) return;
  const dir = path.join(ADMIN, 'data', 'backups');
  await mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  await copyFile(src, path.join(dir, `${name}-${ts}.json`));
  // 只保留每種資料最近 30 份備份
  const files = (await readdir(dir)).filter(f => f.startsWith(name + '-')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 30))) await unlink(path.join(dir, f));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const p = decodeURIComponent(url.pathname);

    if (p === '/admin' || p === '/admin/') {
      return send(res, 200, await readFile(path.join(ADMIN, 'ui.html')), MIME['.html']);
    }

    if (p.startsWith('/api/data/')) {
      const name = p.slice('/api/data/'.length).replace(/\.json$/, '');
      if (!DATA_NAMES.has(name)) return sendJson(res, 404, { error: 'unknown data: ' + name });
      const file = path.join(ADMIN, 'data', name + '.json');
      // 版本 = 檔案內容的雜湊。後台開著的期間如果檔案被別處改動（另一個
      // 分頁、或直接改檔案），儲存時整份寫回會無聲蓋掉那些修改，所以擋下來。
      const versionOf = async () =>
        createHash('sha1').update(await readFile(file)).digest('hex').slice(0, 12);

      if (req.method === 'GET') {
        const buf = await readFile(file);
        const v = createHash('sha1').update(buf).digest('hex').slice(0, 12);
        return send(res, 200, buf, MIME['.json'], { 'X-Data-Version': v });
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const body = (await readBody(req)).toString('utf8');
        let parsed;
        try { parsed = JSON.parse(body); } catch { return sendJson(res, 400, { error: '資料格式錯誤（JSON 無法解析）' }); }
        const sent = req.headers['x-data-version'];
        if (sent) {
          const current = await versionOf();
          if (sent !== current) {
            return sendJson(res, 409, {
              error: '這份資料在你編輯期間被其他地方改過了。請重新整理頁面再編輯，'
                   + '否則會蓋掉那些修改。（你目前畫面上的內容尚未儲存）',
            });
          }
        }
        await backupData(name);
        await writeFile(file, JSON.stringify(parsed, null, 2), 'utf8');
        return sendJson(res, 200, { ok: true, version: await versionOf() });
      }
    }

    if (p === '/api/build' && req.method === 'POST') {
      const r = await runNode(path.join(ADMIN, 'build.mjs'));
      return sendJson(res, r.code === 0 ? 200 : 500, { ok: r.code === 0, output: (r.out + r.err).trim() });
    }

    if (p === '/api/upload' && req.method === 'POST') {
      const rawName = url.searchParams.get('name') || 'upload.bin';
      const safe = rawName.replace(/[\\/:*?"<>|]/g, '_');
      // 案例照片可指定子資料夾（用案例代號），其他上傳統一進 assets/uploads
      const rawFolder = url.searchParams.get('folder') || '';
      const folder = rawFolder.replace(/[^\w-]/g, '');
      const destDir = folder
        ? path.join(ROOT, 'assets', 'img', 'projects', folder)
        : path.join(ROOT, 'assets', 'uploads');
      await mkdir(destDir, { recursive: true });
      let dest = path.join(destDir, safe);
      // 避免覆蓋既有檔案：同名時加序號
      if (existsSync(dest)) {
        const ext = path.extname(safe), base = safe.slice(0, safe.length - ext.length);
        let i = 2;
        while (existsSync(dest)) { dest = path.join(destDir, `${base}-${i}${ext}`); i++; }
      }
      const body = await readBody(req);
      await writeFile(dest, body);
      const rel = '/' + path.relative(ROOT, dest).split(path.sep).join('/');
      return sendJson(res, 200, { ok: true, path: rel, size: body.length });
    }

    if (p === '/api/publish' && req.method === 'POST') {
      if (!existsSync(path.join(ROOT, '.git'))) {
        return sendJson(res, 400, { error: '這個資料夾還沒設定 git，無法發布。' });
      }
      const remote = await runGit(['remote']);
      if (!remote.out.trim()) {
        return sendJson(res, 400, { error: '尚未設定 GitHub 發布（等網站正式上線後就會啟用）。目前按「儲存並更新網站」即可在本機預覽。' });
      }
      const add = await runGit(['add', '-A']);
      if (add.code !== 0) return sendJson(res, 500, { error: add.err || add.out });
      const commit = await runGit(['commit', '-m', '更新網站內容（後台）']);
      if (commit.code !== 0 && !/nothing to commit/.test(commit.out + commit.err)) {
        return sendJson(res, 500, { error: commit.err || commit.out });
      }
      const push = await runGit(['push']);
      if (push.code !== 0) return sendJson(res, 500, { error: push.err || push.out });
      return sendJson(res, 200, { ok: true, output: '已發布！幾分鐘內就會出現在正式網站上。' });
    }

    if (p === '/api/status' && req.method === 'GET') {
      const remote = existsSync(path.join(ROOT, '.git')) ? await runGit(['remote']) : { out: '' };
      return sendJson(res, 200, { ok: true, git: !!remote.out.trim() });
    }

    // 其餘路徑：以靜態檔案方式提供網站本身（本機預覽用）
    if (req.method === 'GET') {
      let fp = path.join(ROOT, p.replace(/^\//, ''));
      if (!path.resolve(fp).startsWith(ROOT)) return send(res, 403, 'forbidden', MIME['.txt']);
      try {
        const st = await stat(fp);
        if (st.isDirectory()) fp = path.join(fp, 'index.html');
      } catch { }
      if (!path.extname(fp) && !existsSync(fp)) fp += '.html';
      if (!existsSync(fp)) {
        const notFound = path.join(ROOT, '404.html');
        return send(res, 404, existsSync(notFound) ? await readFile(notFound) : 'Not found', MIME['.html']);
      }
      return send(res, 200, await readFile(fp), MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
    }

    sendJson(res, 405, { error: 'method not allowed' });
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`悠+設計網站後台已啟動：http://127.0.0.1:${PORT}/admin`);
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log('後台已經在執行中，直接開啟瀏覽器即可。');
    process.exit(0);
  }
  throw e;
});
