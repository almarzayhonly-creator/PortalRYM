// Runs only in the explicitly authorized activation workflow.
import fs from 'node:fs';
import {randomBytes,publicEncrypt,constants} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const secret=randomBytes(48).toString('base64url');
console.log('::add-mask::'+secret);
const result=spawnSync('npx',['--yes','wrangler@4.149.0','secret','put','GPS_COORDINATOR_SECRET','--config','qa/proposals/wrangler.gps.jsonc'],{input:secret+'\n',encoding:'utf8',env:process.env});
if(result.status!==0)throw Error('GPS secret setup failed, exit '+result.status);
const encrypted=publicEncrypt({key:fs.readFileSync('qa/proposals/gps-activation-public.pem'),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(secret));
console.log('GPS_ACTIVATION_SECRET_V1='+encrypted.toString('base64'));
console.log('GPS coordinator secret configured; only RSA-OAEP ciphertext exported.');
