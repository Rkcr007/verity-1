// Build a self-contained index.html from the markdown docs.
// Embeds markdown inline so the file works when opened directly (file://).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const DOCS = [
  { id: 'doc1', file: '01-product-analysis.md',    title: 'Product Analysis',     num: '01' },
  { id: 'doc2', file: '02-gap-analysis.md',         title: 'Gap Analysis',         num: '02' },
  { id: 'doc3', file: '03-technical-mapping.md',    title: 'Technical Mapping',    num: '03' },
  { id: 'doc4', file: '04-system-architecture.md',  title: 'System Architecture',  num: '04' },
  { id: 'doc5', file: '05-development-roadmap.md',   title: 'Development Roadmap',   num: '05' },
];

const blocks = DOCS.map(d => {
  const md = readFileSync(join(here, d.file), 'utf8');
  // Safe to inline in a <script type="text/markdown"> block (no </script> in content).
  return `<script type="text/markdown" id="${d.id}">\n${md}\n</script>`;
}).join('\n');

// Inline the markdown parser so index.html works fully offline (no CDN).
const markedSrc = readFileSync(join(here, 'vendor', 'marked.min.js'), 'utf8');

const nav = DOCS.map((d, i) =>
  `<button class="doc-link${i === 0 ? ' active' : ''}" data-doc="${d.id}">
     <span class="num">${d.num}</span><span class="label">${d.title}</span>
   </button>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verity — Architecture Documentation</title>
<script>${markedSrc}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg0:#0A0C10;--bg1:#0E1117;--bg2:#13171F;--bg3:#191F29;--bg4:#212834;
  --b0:#1C222C;--b1:#262E3A;--b2:#333D4D;
  --t0:#E6EAF2;--t1:#9AA5B8;--t2:#5C6776;--t3:#3A4252;
  --acc:#5B8CEF;--ai:#A472F0;--ok:#43B581;--mod:#E0A33A;--err:#E5645E;
  --font:'IBM Plex Sans',system-ui,-apple-system,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,Menlo,monospace;
}
html,body{height:100%}
body{background:var(--bg0);color:var(--t0);font-family:var(--font);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:11px;height:11px}
::-webkit-scrollbar-thumb{background:var(--b1);border-radius:6px;border:2px solid transparent;background-clip:padding-box}
::-webkit-scrollbar-thumb:hover{background:var(--b2);background-clip:padding-box}
.app{display:flex;height:100vh;overflow:hidden}

/* Sidebar */
.sidebar{width:300px;flex-shrink:0;background:var(--bg1);border-right:1px solid var(--b0);display:flex;flex-direction:column;overflow:hidden}
.brand{display:flex;align-items:center;gap:12px;padding:20px 22px;border-bottom:1px solid var(--b0)}
.logo{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,var(--acc),var(--ai));display:flex;align-items:center;justify-content:center;box-shadow:0 0 22px rgba(91,140,239,.35);flex-shrink:0}
.logo svg{width:22px;height:22px}
.brand h1{font-size:18px;font-weight:700;letter-spacing:-.3px}
.brand p{font-size:11.5px;color:var(--t2)}
.nav{flex:1;overflow-y:auto;padding:14px 12px}
.nav-title{font-size:10.5px;font-weight:700;letter-spacing:.7px;color:var(--t2);text-transform:uppercase;padding:8px 10px 6px}
.doc-link{width:100%;display:flex;align-items:center;gap:11px;padding:10px 12px;border:none;border-radius:9px;background:transparent;color:var(--t1);cursor:pointer;text-align:left;font-family:var(--font);font-size:14px;margin-bottom:2px;transition:all .12s}
.doc-link:hover{background:var(--bg3);color:var(--t0)}
.doc-link.active{background:rgba(91,140,239,.13);color:var(--acc)}
.doc-link .num{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--t3);width:20px;flex-shrink:0}
.doc-link.active .num{color:var(--acc)}
.doc-link .label{font-weight:500}
.toc{padding:6px 12px 14px;border-top:1px solid var(--b0);max-height:42%;overflow-y:auto}
.toc a{display:block;font-size:12.5px;color:var(--t2);text-decoration:none;padding:4px 10px;border-radius:6px;border-left:2px solid transparent;line-height:1.4}
.toc a:hover{color:var(--t0);background:var(--bg2)}
.toc a.h3{padding-left:22px;font-size:12px;color:var(--t3)}
.toc a.active{color:var(--acc);border-left-color:var(--acc);background:rgba(91,140,239,.08)}

/* Main */
.main{flex:1;overflow-y:auto;scroll-behavior:smooth}
.topbar{position:sticky;top:0;z-index:10;height:52px;background:rgba(10,12,16,.82);backdrop-filter:blur(12px);border-bottom:1px solid var(--b0);display:flex;align-items:center;padding:0 38px;gap:12px}
.topbar .crumb{font-size:13px;color:var(--t2)}
.topbar .crumb b{color:var(--t0);font-weight:600}
.topbar .spacer{flex:1}
.badge{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;background:rgba(91,140,239,.1);border:1px solid rgba(91,140,239,.25);border-radius:20px;font-size:11.5px;font-weight:600;color:var(--acc)}
.content{max-width:940px;margin:0 auto;padding:42px 38px 120px}

/* Markdown */
.md h1{font-size:32px;font-weight:700;letter-spacing:-.7px;margin:0 0 6px;padding-bottom:18px;border-bottom:1px solid var(--b1);background:linear-gradient(120deg,var(--t0),var(--t1));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.md h2{font-size:23px;font-weight:700;letter-spacing:-.4px;margin:42px 0 14px;padding-top:14px;scroll-margin-top:70px}
.md h3{font-size:18px;font-weight:650;margin:28px 0 10px;color:var(--t0);scroll-margin-top:70px}
.md h4{font-size:15px;font-weight:650;margin:20px 0 8px;color:var(--t1)}
.md p{margin:11px 0;color:var(--t1)}
.md a{color:var(--acc);text-decoration:none}
.md a:hover{text-decoration:underline}
.md strong{color:var(--t0);font-weight:650}
.md ul,.md ol{margin:11px 0 11px 24px;color:var(--t1)}
.md li{margin:5px 0}
.md blockquote{border-left:3px solid var(--acc);background:rgba(91,140,239,.06);padding:12px 18px;margin:16px 0;border-radius:0 8px 8px 0;color:var(--t1)}
.md blockquote p{margin:4px 0}
.md hr{border:none;border-top:1px solid var(--b1);margin:34px 0}
.md code{font-family:var(--mono);font-size:12.5px;background:var(--bg3);border:1px solid var(--b1);border-radius:5px;padding:1.5px 6px;color:var(--ai)}
.md pre{background:var(--bg0);border:1px solid var(--b1);border-radius:11px;padding:18px 20px;overflow-x:auto;margin:16px 0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2)}
.md pre code{background:none;border:none;padding:0;font-size:12.5px;line-height:1.65;color:var(--t1)}
.md table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13.5px;border:1px solid var(--b1);border-radius:10px;overflow:hidden}
.md thead{background:var(--bg3)}
.md th{text-align:left;padding:10px 14px;font-weight:650;color:var(--t0);border-bottom:1px solid var(--b1);font-size:12.5px}
.md td{padding:9px 14px;border-bottom:1px solid var(--b0);color:var(--t1);vertical-align:top}
.md tbody tr:last-child td{border-bottom:none}
.md tbody tr:hover{background:var(--bg2)}
.md td:has(:only-child),.md td{}
.md table code{font-size:11.5px}

/* status dots in tables */
.md td:contains('●'){color:var(--ok)}

@media(max-width:880px){.sidebar{width:64px}.brand h1,.brand p,.doc-link .label,.nav-title,.toc{display:none}.doc-link{justify-content:center}}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <div class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg></div>
      <div><h1>Verity</h1><p>Architecture Docs</p></div>
    </div>
    <nav class="nav">
      <div class="nav-title">Documents</div>
      ${nav}
    </nav>
    <div class="toc" id="toc"></div>
  </aside>
  <main class="main" id="main">
    <div class="topbar">
      <span class="crumb">Verity / <b id="crumb">Product Analysis</b></span>
      <span class="spacer"></span>
      <span class="badge">v1.0 · Electron MVP</span>
    </div>
    <article class="content"><div class="md" id="md"></div></article>
  </main>
</div>

${blocks}

<script>
const docs = ${JSON.stringify(DOCS.map(({id,title})=>({id,title})))};
const mdEl = document.getElementById('md');
const tocEl = document.getElementById('toc');
const crumbEl = document.getElementById('crumb');
const mainEl = document.getElementById('main');
marked.setOptions({ gfm:true, breaks:false });

function slug(s){return s.toLowerCase().replace(/[^\\w]+/g,'-').replace(/^-+|-+$/g,'');}

function render(docId){
  const raw = document.getElementById(docId).textContent;
  mdEl.innerHTML = marked.parse(raw);
  // anchor headings + build TOC
  tocEl.innerHTML='';
  mdEl.querySelectorAll('h2, h3').forEach(h=>{
    const id = slug(h.textContent);
    h.id = id;
    const a = document.createElement('a');
    a.href = '#'+id;
    a.textContent = h.textContent;
    a.className = h.tagName==='H3'?'h3':'';
    a.onclick=(e)=>{e.preventDefault();document.getElementById(id).scrollIntoView();};
    tocEl.appendChild(a);
  });
  const found = docs.find(d=>d.id===docId);
  crumbEl.textContent = found?found.title:'';
  mainEl.scrollTop=0;
}

document.querySelectorAll('.doc-link').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.doc-link').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.doc);
  };
});

// scrollspy
mainEl.addEventListener('scroll',()=>{
  const heads=[...mdEl.querySelectorAll('h2,h3')];
  let cur=null;
  for(const h of heads){ if(h.getBoundingClientRect().top<120) cur=h.id; }
  tocEl.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+cur));
});

render('doc1');
</script>
</body>
</html>`;

writeFileSync(join(here, 'index.html'), html, 'utf8');
console.log('Wrote index.html (' + (html.length/1024).toFixed(1) + ' KB)');
