import * as Handlebars from 'handlebars';
import * as fs from 'node:fs';
import * as path from 'node:path';

const cache = new Map<string, HandlebarsTemplateDelegate>();

const TEMPLATE_DIR = path.resolve(__dirname);

export function renderTemplate<TVars extends object>(
  name: string,
  vars: TVars,
): string {
  let compiled = cache.get(name);
  if (!compiled) {
    const file = path.join(TEMPLATE_DIR, `${name}.hbs`);
    const source = fs.readFileSync(file, 'utf8');
    compiled = Handlebars.compile(source, { noEscape: false });
    cache.set(name, compiled);
  }
  return compiled(vars);
}
