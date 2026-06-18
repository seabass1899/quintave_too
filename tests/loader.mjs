import { isBuiltin } from 'node:module'
import fs from 'node:fs'
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context) }
  catch (e) {
    // Try appending /index.js for directory imports
    if (context.parentURL && (specifier.startsWith('.') || specifier.startsWith('/'))) {
      const base = new URL(specifier, context.parentURL)
      for (const cand of [base.href + '/index.js', base.href + '.js']) {
        try { if (fs.existsSync(new URL(cand))) return { url: cand, shortCircuit: true } } catch {}
      }
    }
    throw e
  }
}
