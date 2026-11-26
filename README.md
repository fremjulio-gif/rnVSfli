# VERSUS — Situation judiciaire comparée (RN vs LFI)

Site statique factuel, symétrique et sourcé mettant en regard les procédures judiciaires concernant le **Rassemblement National (RN, ex-FN)** et **La France insoumise (LFI)** (date de référence initiale : **26/11/2026**).

- **Stack** : Astro 5 (statique), TypeScript, Zod (validation stricte au build), CSS natif (16-bit sobre, 6 couleurs, WCAG AA, `prefers-reduced-motion`), Web Audio API (sons 8-bit originaux désactivés par défaut), Python via `uv` pour la vérification des liens.
- **Dépôt GitHub** : `https://github.com/fremjulio-gif/rnVSfli`

---

## Prérequis (MacBook Pro Apple Silicon / ARM64)

- Node.js 24+ (`node -v`)
- `uv` (`uv --version`) — utilisé exclusivement pour les scripts Python
- Git (`git --version`)

---

## Commandes `zsh` essentielles

```zsh
# 1. Installer les dépendances Node et Python (uv)
npm install && uv sync

# 2. Lancer le serveur de développement local (http://localhost:4321)
npm run dev

# 3. Valider le schéma des données (Zod) et compiler le site statique dans dist/
npm run build

# 4. Vérifier que toutes les URLs sources répondent (via uv exclusivement)
npm run check:links

# 5. Tout vérifier avant un commit (données + TypeScript/Astro + build + liens)
npm run check
```

---

## Ajouter ou mettre à jour une fiche judiciaire

1. Ouvrir `data/cases.yaml` et ajouter/modifier l'entrée concernée en respectant le schéma défini dans `src/lib/schema.ts`.
   - Chaque fiche exige au moins une source avec URL valide, titre, éditeur, date de publication et date de consultation.
   - Les enquêtes, informations judiciaires, mises en examen et renvois doivent impérativement avoir `section: procedures_en_cours` (jamais mélangés aux décisions rendues).
2. Documenter la modification dans `CHANGELOG-DONNEES.md` (qui, quoi, date, source).
3. Lancer `npm run check` : le build échoue automatiquement si un champ manque, si un statut est incohérent ou si un lien est mort.

---

## Déployer sur GitHub puis Vercel

1. **Pousser le dépôt sur GitHub** (si pas encore fait) :
   ```zsh
   git push -u origin main
   ```
2. **Déployer sur Vercel (gratuit, sans CLI requis)** :
   - Connectez-vous sur [vercel.com](https://vercel.com) avec votre compte GitHub (`fremjulio-gif`).
   - Cliquez sur **Add New… → Project** puis sélectionnez **`fremjulio-gif/rnVSfli`**.
   - Vercel détecte automatiquement **Astro** (`Build Command: npm run build`, `Output Directory: dist`).
   - Cliquez sur **Deploy**. Chaque `git push` sur `main` redéploiera automatiquement le site.
3. **Activer la surveillance hebdomadaire des liens** :
   - Le workflow `.github/workflows/weekly-link-check.yml` s'exécute chaque lundi à 07:00 UTC et ouvre automatiquement une Issue GitHub si une source devient inaccessible.

---

## Documents importants

- `data/cases.yaml` : base de données sourcée et validée par Zod.
- `CHANGELOG-DONNEES.md` : historique des ajouts et mises à jour factuelles.
- `CHECKLIST-JURIDIQUE.md` : points de relecture juridique (présomption d'innocence, loi de 1881, RGPD, LCEN).
