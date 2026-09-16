#!/usr/bin/env bun
/** Embed portable typography and local raster assets into one shareable HTML. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const args=process.argv.slice(2);
if(args.includes('--help')||args.includes('-h')){
 console.log('EmbedAssets <deck.html> [--output <file.html>]\nEmbeds bundled IBM Plex Mono fonts, OFL license, and local PNG/JPEG/WebP img sources. Default: update the input HTML. No network requests.');process.exit(0);
}
try{
 const input=args[0];if(!input||input.startsWith('-'))throw new Error('Supply a deck HTML path; see --help');
 let output=input;for(let i=1;i<args.length;i++){if(args[i]==='--output'&&args[i+1])output=args[++i];else throw new Error('Unknown or incomplete option: '+args[i]);}
 const path=resolve(input);let html=readFileSync(path,'utf8');const fonts=resolve(import.meta.dir,'../Fonts');
 if(!html.includes('/* BEGIN DECK FONTS */')||!html.includes('/* END DECK FONTS */'))throw new Error('Font markers missing; use the current SloganTemplate.html');
 const css=['Regular','Bold'].map((name,i)=>{
  const bytes=readFileSync(resolve(fonts,`IBMPlexMono-${name}.ttf`));
  return `@font-face{font-family:"Deck Mono";font-style:normal;font-weight:${i?700:400};font-display:block;src:url("data:font/ttf;base64,${bytes.toString('base64')}") format("truetype");}`;
 }).join('\n');
 html=html.replace(/\/\* BEGIN DECK FONTS \*\/[\s\S]*?\/\* END DECK FONTS \*\//,()=>`/* BEGIN DECK FONTS */\n${css}\n/* END DECK FONTS */`);
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const license=escape(readFileSync(resolve(fonts,'IBMPlexMono-OFL.txt'),'utf8'));
 html=html.replace(/<template id="deck-font-license">[\s\S]*?<\/template>\n?/g,'');
 html=html.replace('</head>',()=>`<template id="deck-font-license">${license}</template>\n</head>`);
 let images=0;
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<template\b[^>]*>[\s\S]*?<\/template>|<!--[\s\S]*?-->|<img\b[^>]*>/gi,tag=>{
  if(!/^<img\b/i.test(tag))return tag;
  if(/\ssrcset\s*=/i.test(tag))throw new Error('img srcset is not supported; supply one local raster');
  const match=tag.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);if(!match)throw new Error('Each img needs a quoted src');
  const src=match[2].replaceAll('&amp;','&');
  if(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(src))return tag;
  if(/^[a-z][a-z0-9+.-]*:|^\/\//i.test(src))throw new Error('Only local raster paths can be embedded: '+src.slice(0,120));
  const bytes=readFileSync(resolve(dirname(path),src));
  const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':null;
  if(!mime)throw new Error('Expected PNG/JPEG/WebP bytes: '+src);
  images++;return tag.replace(match[0],()=>` src="data:${mime};base64,${bytes.toString('base64')}"`);
 });
 writeFileSync(resolve(output),html);
 console.log(`Embedded IBM Plex Mono (2 weights + OFL) and ${images} local image(s): ${resolve(output)} (${Buffer.byteLength(html)} bytes). Run ValidateDeck on this final file.`);
}catch(error){console.error('EmbedAssets: '+(error instanceof Error?error.message:String(error)));process.exit(1);}
