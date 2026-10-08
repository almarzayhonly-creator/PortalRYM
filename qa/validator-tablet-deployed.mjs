import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const build=fs.readFileSync('unit-validator.html','utf8').match(/rym-validator-build" content="([^"]+)"/)[1];
const version=build.match(/v(\d+)$/)[1];
const urls=process.argv.slice(2);assert.ok(urls.length,'Pass immutable and/or alias URLs');
const files=['unit-validator.html','validator-tablet-sw.js','validator-tablet.webmanifest','css/validator-tablet-app.css','modules/core/unit-validator-shell.js','modules/control-auto/validator-presentation.js','modules/control-auto/validator-tablet-app.js'];
const normalized=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(normalized(s)).digest('hex');
const results=[];
const attempts=Number(process.env.VALIDATOR_VERIFY_ATTEMPTS||12);
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
for(const base of urls){
  let evidence,lastError;
  for(let attempt=0;attempt<attempts;attempt++){
    try{
      const resources=[];
      for(const file of files){
        const url=file==='unit-validator.html'?'/?app=validador-unidad':'/'+file+(file.endsWith('.css')||file.endsWith('.js')&&!file.includes('-sw.js')?'?v='+version:'');
        const response=await fetch(base+url,{cache:'no-store',redirect:'manual'});
        assert.equal(response.status,200,url+' must be a final 200, not a redirect');
        assert.equal(response.headers.get('x-portal-build'),build,url+' wrong build');
        assert.match(response.headers.get('cache-control'),/no-store/);
        const actual=hash(await response.text()),expected=hash(fs.readFileSync(file,'utf8'));
        assert.equal(actual,expected,url+' content differs from tested commit');
        resources.push({file,sha256:actual,build,status:response.status});
      }
      const host=await fetch(base+'/?validator-host=1',{cache:'no-store',redirect:'manual'});
      assert.equal(host.status,200);assert.equal(host.headers.get('x-portal-build'),build);
      const html=await host.text();
      for(const file of ['validator-presentation.js','validator-tablet-app.js','validator-tablet-app.css'])assert.ok(html.includes(file+'?v='+version));
      assert.ok(html.includes("const tone=level==='CRITICO'?'bad'"),'Official GPS summary bridge missing');
      evidence={base,build,commit,resources,hostSha256:hash(html)};break;
    }catch(error){lastError=error;if(attempt<attempts-1)await new Promise(resolve=>setTimeout(resolve,5000));}
  }
  if(!evidence)throw lastError;
  results.push(evidence);console.log(`PASS: ${base} ${build}; ${files.length} exact resource hashes, final 200 headers and isolated host.`);
}
fs.mkdirSync('.sandbox/validator-qa',{recursive:true});
fs.writeFileSync(path.join('.sandbox/validator-qa','deployed-resources.json'),JSON.stringify(results,null,2));
