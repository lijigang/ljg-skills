#!/usr/bin/env bun
import {resolve,dirname} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {prepareDeck,materialize} from './DeckData';
const args=process.argv.slice(2);
if(args.includes('--help')||args.length<2){console.log('BuildDeck <input.json> <output.html> [--theme hacker-dark|hacker|black|red|yellow]\nBuilds a data-only deck; embeds fonts and validates the final HTML.');process.exit(args.includes('--help')?0:2);}
const [input,output]=args;const doc=await Bun.file(resolve(input)).json();const themeIndex=args.indexOf('--theme');if(themeIndex>=0)doc.theme=args[themeIndex+1];
const template=await Bun.file(resolve(import.meta.dir,'../SloganTemplate.html')).text();
const prepared=prepareDeck(doc);await mkdir(dirname(resolve(output)),{recursive:true});await Bun.write(resolve(output),materialize(template,prepared));
for(const tool of ['EmbedAssets.ts','ValidateDeck.ts']){const p=Bun.spawn(['bun',resolve(import.meta.dir,tool),resolve(output)],{stdout:'inherit',stderr:'inherit'});if(await p.exited)process.exit(1);}
console.log(JSON.stringify({file:resolve(output),pages:prepared.slides.length,mode:prepared.meta.mode,theme:prepared.meta.theme,buildId:prepared.meta.buildId}));
