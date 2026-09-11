import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Existing kotoba-lang.org Play artifact — not a new runtime. */
export const PLAY_WASM_URL = "/play/double-21.wasm";
export const PLAY_WASM_SHA256 = "99d43eb26371891bcca2f1fc8a48b3ad47f3350e50c50a3b7ae95b2daeafc214";
export const PLAY_SOURCE_SHA256 = "0471d55d668ed5f9887f9d2520ced9098d03dbbd57086dd3449e98dfb95f2e6b";
export const INSTALL_COMMAND =
  "brew tap kotoba-lang/kotoba && brew trust kotoba-lang/kotoba && brew install kotoba";
export const DOCS_HREF = "https://github.com/kotoba-lang/kotoba-lang/tree/main/docs";
export const GITHUB_HREF = "https://github.com/kotoba-lang/kotoba-lang";
export const PLAY_HREF = "/play/";

/** Existing wasm-webcomponent GitHub Pages demos — not a new compiler. */
export const WASM_WEBCOMPONENT_DEMOS = [
  {
    href: "https://kotoba-lang.github.io/wasm-webcomponent/examples/solar-helix/",
    label: "solar-helix",
  },
  {
    href: "https://kotoba-lang.github.io/wasm-webcomponent/examples/kami-survivors/",
    label: "kami-survivors",
  },
  {
    href: "https://kotoba-lang.github.io/wasm-webcomponent/examples/gpu-clear/",
    label: "gpu-clear",
  },
] as const;

export function playDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "play");
}

export function playSource(): string {
  return readFileSync(join(playDir(), "double-21.kotoba"), "utf8");
}

export const PLAY_FILES = [
  "double-21.kotoba",
  "double-21.wasm",
  "double-21.wasm.provenance.edn",
  "double-21.wasm.publication.edn",
] as const;

/** Load Freebuff only when an attributed ad click (`bfcid`) is present. */
export const FREEBUFF_BOOTSTRAP =
  "(function(){try{var clickId=new URLSearchParams(location.search).get('bfcid');if(!clickId)return;window.freebuff=window.freebuff||function(){(window.freebuff.q=window.freebuff.q||[]).push(arguments);};var script=document.createElement('script');script.async=true;script.src='https://freebuff.com/freebuff-tag.js';document.head.appendChild(script);}catch(error){}})();";

/**
 * Play runner + micro-conversion hooks.
 * Events fire only when Freebuff is loaded for a `bfcid` visit.
 * Names: trial_started (existing Play), docs_view, github_click, cli_copy.
 * No revenue / GMV events.
 */
export function playAndHooksScript(): string {
  return `document.addEventListener('DOMContentLoaded',function(){
function convert(name){try{var clickId=new URLSearchParams(location.search).get('bfcid');if(window.freebuff&&clickId){window.freebuff('conversion',name,{eventId:clickId+':'+name});}}catch(e){}}
var button=document.getElementById('kot-play-run');
var status=document.getElementById('kot-play-status');
var expected='${PLAY_WASM_SHA256}';
function hex(bytes){return Array.from(bytes,function(b){return b.toString(16).padStart(2,'0');}).join('');}
if(button&&status){button.addEventListener('click',async function(){button.disabled=true;status.textContent=status.dataset.verifying;try{var response=await fetch('${PLAY_WASM_URL}',{cache:'no-store'});if(!response.ok)throw new Error('artifact fetch failed: HTTP '+response.status);var bytes=new Uint8Array(await response.arrayBuffer());var digest=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));if(digest!==expected)throw new Error('artifact digest mismatch');var module=await WebAssembly.compile(bytes);if(WebAssembly.Module.imports(module).length!==0)throw new Error('demo artifact requested a host import');var instance=await WebAssembly.instantiate(module,{});var result=instance.exports.main();if(result!==42n)throw new Error('unexpected result');status.textContent=status.dataset.success.replace('{result}',result.toString());convert('trial_started');}catch(error){status.textContent=status.dataset.error+error.message;}finally{button.disabled=false;}});}
var copy=document.getElementById('kot-install-copy');var cmd=document.getElementById('kot-install-command');
if(copy&&cmd){copy.addEventListener('click',async function(){try{await navigator.clipboard.writeText(cmd.textContent||'');copy.textContent=copy.dataset.copied;convert('cli_copy');}catch(e){}});}
document.addEventListener('click',function(event){var a=event.target.closest&&event.target.closest('a');if(!a)return;if(a.dataset.micro==='docs')convert('docs_view');if(a.dataset.micro==='github')convert('github_click');});
});`;
}
