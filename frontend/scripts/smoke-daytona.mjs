/** Real Daytona round-trip; only synthetic menu data, no Dify calls or DB writes. */
import { Daytona } from '@daytona/sdk';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
try { process.loadEnvFile(fileURLToPath(new URL('.env', root))); } catch {}
if (!process.env.DAYTONA_API_KEY) throw new Error('Add DAYTONA_API_KEY to the root .env.');
const output = new URL('daytona/runs/', root);
await mkdir(output, { recursive: true });
let sandbox;
try {
  sandbox = await new Daytona({ apiKey: process.env.DAYTONA_API_KEY }).create({language:'python', snapshot:process.env.DAYTONA_SNAPSHOT, autoStopInterval:5, autoDeleteInterval:0}, {timeout:60});
  async function command(cmd) {
    const r = await sandbox.process.executeCommand(cmd, undefined, undefined, 120);
    if (r.exitCode !== 0) throw new Error('PDF worker command failed.');
  }
  await command("python3 -m pip install --disable-pip-version-check pymupdf==1.26.7 'qrcode[pil]==8.2'");
  await sandbox.fs.uploadFile(await readFile(new URL('daytona/pdf_worker.py', root)), 'pdf_worker.py');
  const input = {task:'render', name:'Kafana · Мени', items:[
    {name:'Karađorđeva šnicla',description:'Традиционално јело',price:1200,currency:'RSD',portion:'250 g',category:'Главна јела'},
    {name:'Ćevapi',description:'Grilled meat',price:950,currency:'RSD',portion:'10 kom',category:'Главна јела'},
  ]};
  await sandbox.fs.uploadFile(Buffer.from(JSON.stringify(input)), 'input.json');
  await command('python3 pdf_worker.py');
  const pdf = await sandbox.fs.downloadFile('output/menu.pdf');
  if (pdf.subarray(0,5).toString() !== '%PDF-') throw new Error('Invalid generated PDF.');
  await writeFile(new URL('menu.pdf',output),pdf);
  await writeFile(new URL('preview.png',output),await sandbox.fs.downloadFile('output/preview.png'));
  await sandbox.fs.uploadFile(pdf,'source.pdf');
  await sandbox.fs.uploadFile(Buffer.from(JSON.stringify({task:'split',limit:5})),'input.json');
  await command('python3 pdf_worker.py');
  const pages = JSON.parse((await sandbox.fs.downloadFile('manifest.json')).toString());
  if (!pages.length || pages.length>5) throw new Error('Invalid split result.');
  for (const name of pages) {
    if (!/^page-\d{3}\.png$/.test(name)) throw new Error('Invalid page filename.');
    await writeFile(new URL(name,output),await sandbox.fs.downloadFile(`output/${name}`));
  }
  await writeFile(new URL('result.json',output),JSON.stringify({provider:'Daytona',sandboxId:sandbox.id,at:new Date().toISOString(),pdfBytes:pdf.length,pages:pages.length},null,2));
  console.log(`Daytona round-trip passed: PDF ${pdf.length} bytes, ${pages.length} page(s). Artifacts: daytona/runs/`);
} catch {
  console.error('Daytona smoke failed. Check API key, credits, snapshot and network. SDK error details suppressed to protect credentials.');
  process.exitCode=1;
} finally {
  if (sandbox) await sandbox.delete(20).catch(() => console.error('Sandbox cleanup failed; auto-stop/delete is enabled.'));
}
