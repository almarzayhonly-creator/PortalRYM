import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const output=path.resolve(root,'dist/validator-worker-assets');
const dist=path.resolve(root,'dist');
if(!output.startsWith(dist+path.sep))throw new Error('Unsafe validator asset output path');
const files=[
  'index.html',
  'unit-validator.html',
  'validator-tablet-sw.js',
  'validator-tablet.webmanifest',
  'css/validator-tablet-app.css',
  'css/validator-tablet-app-legacy.css',
  'assets/rym-validator-192.png',
  'assets/rym-validator-512.png',
  'modules/core/unit-validator-shell.js',
  'modules/core/validator-session.js',
  'modules/control-auto/validator-presentation.js',
  'modules/control-auto/validator-details.js',
  'modules/control-auto/validator-tablet-app.js',
  'modules/control-auto/validator-tablet-app-legacy.js',
  'vue-next/dist/portal-rym-vue-next.css',
  'vue-next/dist/portal-rym-vue-next.js',
  'vue-next/dist/portal-rym-vue-next-bridge.js'
];
fs.rmSync(output,{recursive:true,force:true});
for(const file of files){
  const source=path.resolve(root,file);
  if(!source.startsWith(root+path.sep)||!fs.statSync(source).isFile())throw new Error(`Missing validator asset: ${file}`);
  const destination=path.join(output,file);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(source,destination);
}
console.log(`Packaged ${files.length} validator runtime assets.`);
