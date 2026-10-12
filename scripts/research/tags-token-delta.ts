/**
 * The catalyst tags' cost in INPUT, measured as the characters the model reads: the system prompt (variant A, the
 * production one) and the strict schema, at a base tree and at this tree. The instructions are the same for every
 * bundle, so the input delta does not depend on the bundle. Tokens are ESTIMATED at 4 characters per token (no
 * tokenizer is installed); the output delta is not measurable without a paid call.
 *
 * Usage, from each worktree root: node --import tsx scripts/research/tags-token-delta.ts <tree root>
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2] ?? '.');
const load = (file: string) => import(pathToFileURL(path.join(root, file)).href);

const interpreter = await load('lib/research/interpret/openaiInterpreter.ts');
const schema = await load('lib/research/interpret/schema.ts');
const prompt: string = interpreter.SYSTEM_PROMPT_A;
const json = JSON.stringify(schema.AUTOMATIC_DOSSIER_SCHEMA);
console.log(
  JSON.stringify({
    root,
    schemaVersion: schema.AUTOMATIC_DOSSIER_SCHEMA_VERSION,
    promptVersion: schema.INTERPRETER_PROMPT_VERSION,
    promptChars: prompt.length,
    schemaChars: json.length,
    totalChars: prompt.length + json.length,
  }),
);
