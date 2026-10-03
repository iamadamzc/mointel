// Which worker entry points reach a module that imports server-only (needs --conditions=react-server).
// Usage: git grep -l -E "^import ['\"]server-only['\"]" HEAD -- "*.ts" "*.tsx" | sed "s/^HEAD://" > so.txt; node scripts/ops/server-only-trace.cjs so.txt worker/research.ts
// Static imports only (relative and @/); it misses non-literal require/import, so grep for those too.
const fs=require('fs'),path=require('path');
const so=new Set(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(s=>s.trim()));
function res(from,spec){let b; if(spec.startsWith('@/'))b=spec.slice(2); else if(spec.startsWith('.'))b=path.posix.join(path.posix.dirname(from),spec); else return null;
 for(const c of [b,b+'.ts',b+'.tsx',b+'/index.ts',b+'/index.tsx']) if(fs.existsSync(c)&&fs.statSync(c).isFile()) return c; return null;}
for(const entry of process.argv.slice(3)){
 const seen=new Map([[entry,null]]),q=[entry];
 while(q.length){const f=q.shift();const src=fs.readFileSync(f,'utf8');
  const re=/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|^import\s+['"]([^'"]+)['"]/gm;let m;
  while((m=re.exec(src))){const s=m[1]||m[2]||m[3];const r=res(f,s);if(r&&!seen.has(r)){seen.set(r,f);q.push(r);}}}
 const hits=[...seen.keys()].filter(f=>so.has(f));
 console.log(`== ${entry}: ${seen.size} files reached, ${hits.length} server-only`);
 for(const h of hits){const chain=[h];let p=seen.get(h);while(p){chain.push(p);p=seen.get(p);}console.log('  '+chain.reverse().join(' -> '));}
}
