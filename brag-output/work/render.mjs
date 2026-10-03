const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
import fs from 'fs'; import { spawn } from 'child_process'; import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const mode = process.argv[2] || 'stills';
const icons = {}; for (const n of ['camera-outline','time-outline','pencil','cloud-upload','arrow-forward']) icons[n] = fs.readFileSync(path.join(dir, n + '.svg'), 'utf8').replace(/<svg /, '<svg fill="currentColor" ');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files','--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript(i => { window.ICONS = i; }, icons);
await page.goto('file://' + path.join(dir, 'video.html'));
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => i.onload = r))); });
await page.waitForTimeout(300);
if (mode === 'stills') {
  const times = (process.argv[3] || '1.2,3.2,4.2,5.4,6.8,7.6,8.1,8.8,9.9,10.8,12.3,13.5,14.4,15.1,16.5,17.2,18.6,19.9').split(',').map(Number);
  fs.mkdirSync(path.join(dir, 'stills'), { recursive: true });
  for (const t of times) { await page.evaluate(t => render(t), t); await page.screenshot({ path: path.join(dir, 'stills', `t${t.toFixed(2)}.png`) }); }
} else {
  const fps = 30, dur = Number(process.argv[3] || 20), N = Math.round(fps * dur);
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-r',String(fps), path.join(dir,'video-silent.mp4')], { stdio: ['pipe','inherit','inherit'] });
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => render(t), f / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log('frame', f);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();
