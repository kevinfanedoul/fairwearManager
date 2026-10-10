<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Règles de développement

## 1. Modules (CommonJS / ES Modules)

Le projet est une application **Next.js 16** en **TypeScript** qui utilise les **ES Modules** :

- Toute source `.ts` / `.tsx` utilise la syntaxe `import` / `export`.
- Les fichiers de configuration Node (`.mjs`) sont en ESM.
- Le `package.json` ne déclare pas `"type": "module"` : tout script `.js` pur serait donc interprété en CommonJS par défaut.
- Règle : **ne jamais mélanger** `require` / `module.exports` avec la syntaxe ESM. Utiliser exclusivement `import` / `export` dans le code applicatif. Si un script Node autonome doit être ajouté, le nommer en `.mjs` (ESM) ou `.cjs` (CommonJS) de façon explicite, en cohérence avec son contenu.
- Respecter les alias de chemins définis dans `tsconfig.json` (`@/*` → racine) et ne pas en introduire de nouveaux sans modification de `tsconfig.json`.

## 2. Gestion des erreurs asynchrones

- Toute opération asynchrone (Prisma, Supabase, fetch, fs, etc.) doit être **explicitement** gérée.
- Dans les routes Next.js / Server Actions : utiliser `try/catch` et renvoyer une réponse d'erreur propre (jamais laisser une erreur remonter silencieusement).
- Dans les Server Components / routes : propager les erreurs via `next/navigation` (`notFound`, `error.tsx`, `redirect`) quand c'est approprié.
- Ne jamais `catch` puis ignorer une erreur (`catch (e) {}`) : journaliser (`console.error`) ou remonter.
- Typer les erreurs (`unknown`, puis affinage) plutôt que `any`.

## 3. Modifications ciblées uniquement

- Modifier **uniquement** le code nécessaire à la tâche. Ne jamais réécrire un fichier entier sans raison.
- Ne pas introduire de **code mort** (imports inutilisés, variables non référencées, fonctions orphelines).
- Ne pas laisser de `// TODO` non résolus. Tout `TODO` laissé doit être intentionnel, daté et explicite, ou être résolu immédiatement.
- Ne pas reformater ou « nettoyer » du code qui n'est pas lié à la tâche en cours.
- Ne pas ajouter de commentaires inutiles : le code doit être lisible par lui-même.

## 4. Validation systématique avant de proposer une modification

Avant de considérer une modification comme terminée, exécuter systématiquement :

- `npm run lint` — qualité de code (ESLint).
- `npm run test` — tests (Vitest).

Si une modification touche à la compilation ou aux types, vérifier également avec `npx tsc --noEmit` (aucun script `typecheck` dédié n'existe dans le `package.json`).

Ne proposer aucun changement sans avoir vérifié que les commandes ci-dessus passent, ou sans expliquer précisément pourquoi elles échouent.
