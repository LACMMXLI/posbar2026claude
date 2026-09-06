// Verifica que cada documento respete el tope de líneas declarado en su encabezado.
// Convención: una línea `<!-- tope: N líneas -->` dentro de las primeras 5 líneas del archivo.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['CLAUDE.md', 'docs'];
const failures = [];

function walk(path) {
  const st = statSync(path);
  if (st.isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry));
    return;
  }
  if (!path.endsWith('.md')) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const header = lines.slice(0, 5).join('\n');
  const match = header.match(/<!--\s*tope:\s*(\d+)\s*l[ií]neas\s*-->/i);
  if (!match) return; // documento sin tope declarado: no se verifica
  const cap = Number(match[1]);
  const count = lines.filter((l, i) => !(i === lines.length - 1 && l === '')).length;
  if (count > cap) failures.push(`${path}: ${count} líneas (tope ${cap})`);
}

for (const root of roots) {
  try {
    walk(root);
  } catch {
    /* raíz inexistente */
  }
}

if (failures.length) {
  console.error('Documentos que rebasan su tope de líneas:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('Topes de documentación respetados.');
