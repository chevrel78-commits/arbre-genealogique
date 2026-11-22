# CLAUDE.md — Arbre généalogique

## Le produit

Un site où une famille construit **ensemble** son **arbre généalogique**, en ligne. Le site est **privé** : on n'y entre qu'avec un compte validé par un administrateur.

**Les personnes de l'arbre** (demandes d'Eric, 2026-11-22)

- Chaque personne a : **civilité** (M., Mme, Mlle), **prénom**, **nom**, **nom de jeune fille** (facultatif), **année de naissance** (facultative), **photo** (facultative).
- Chaque personne est représentée par une **tuile cliquable** (photo, civilité, prénom, nom). Un clic ouvre sa fiche.
- Depuis la fiche d'une personne, on ajoute en un clic : un **père** ou une **mère**, un **frère** ou une **sœur**, un **enfant**, un **conjoint**.
- Dans l'arbre, les **époux sont côte à côte**, les **frères et sœurs sur la même rangée**, et chaque génération occupe sa propre rangée (parents au-dessus, enfants en dessous).

**L'accès au site** (demandes d'Eric, 2026-11-22)

- **Accès sécurisé par mot de passe** : aucune page de l'arbre n'est visible sans connexion.
- **Demande d'accès** : un visiteur remplit un formulaire (prénom, nom, e-mail, mot de passe, message facultatif « je suis le petit-fils de… »). Son compte reste **en attente**.
- **Administrateurs** : ils voient les demandes, les **acceptent** ou les **refusent**. Le demandeur est prévenu par e-mail.
- Le premier administrateur (super-administrateur, Eric) est créé par une commande dans le terminal, comme pour Palmares et Objectif.

**Plus tard, à décider** : sources et documents (scans d'actes), dates complètes (jour, mois, lieu), import / export GEDCOM (le format d'échange des logiciels de généalogie), plusieurs arbres sur le même site (un par famille, version SaaS « multi-familles »).

## Stack imposée (la même que Palmares et Objectif)

- **Next.js 16** : App Router, TypeScript, React 19 (Node.js)
- **Prisma 7** avec **MySQL / MariaDB** (provider `mysql`, adaptateur `@prisma/adapter-mariadb`)
- **Tailwind CSS 4**, branché par PostCSS
- **sharp** pour les images, **nodemailer** pour les e-mails
- Authentification **faite maison** : scrypt (`node:crypto`), sessions en base, cookie httpOnly (reprise de Palmares / Objectif)
- **Git** pour la sauvegarde et le versionnement, dépôt sur GitHub (compte `chevrel78-commits`)
- Hébergement **Hostinger** (application Node.js), déploiement automatique à chaque push sur `main`

N'ajoute pas d'autre framework ni de bibliothèque majeure sans le proposer d'abord (ex. bibliothèque de dessin d'arbre, lecteur GEDCOM, paiement).

Next.js 16 introduit des changements par rapport aux versions précédentes : avant d'écrire du code Next.js, consulter `AGENTS.md` et la documentation embarquée dans `node_modules/next/dist/docs/`.

## Règles de travail

1. **Toujours répondre en français, sans exception** : messages à l'utilisateur, messages de commit, commentaires du code et explications.
2. **Proposer un plan avant tout changement important** : nouvelle fonctionnalité, modification du schéma Prisma, refonte, ajout d'une dépendance. Attendre la validation avant de coder.
3. **Chaque étape se termine par une vérification visible dans le navigateur**, en local : lancer l'application, montrer la page concernée et décrire ce que l'utilisateur doit voir.
4. **Après chaque étape validée, mettre à jour ce CLAUDE.md**, en particulier les sections « État d'avancement » et « Décisions ».
5. **Sauvegarder sur GitHub, seulement avec l'accord d'Eric** : une fois une étape terminée et vérifiée, **demander avant de faire le commit et le push** (le push reconstruit et republie le site en ligne). Un commit par étape, avec un message clair en français.
6. **Tenir à jour le guide d'utilisation** `docs/guide-utilisation.md` (pour les utilisateurs, en français simple, sans détails techniques) à chaque étape qui change ce que le site fait ou montre, dans le même commit.
7. **Être pédagogique** : Eric est formateur ; expliquer le pourquoi des choix techniques, en termes simples.
8. **Rien sans connexion** : chaque page et chaque action qui lit ou modifie l'arbre appelle `exigerMembre()` (compte accepté et actif) ; les actions d'administration appellent `exigerAdministrateur()`. `proxy.ts` ne fait qu'un contrôle rapide du cookie : ce n'est pas la vraie protection.

## Les étapes prévues (0 à 5)

| # | Étape | Vérification dans le navigateur |
|---|---|---|
| 0 | **Socle** : Next.js, Tailwind, Prisma et base MySQL de développement, modules communs repris d'Objectif (`lib/prisma.ts`, `lib/email.ts`, `lib/stockage.ts`, mots de passe), page d'accueil | L'accueil s'affiche avec « Base de données : connectée » |
| 1 | **Connexion et administrateurs** : `npm run creer-superadmin`, page de connexion, site entièrement protégé, mot de passe oublié, « Mon compte », limite des connexions ratées | Eric se connecte ; déconnecté, toute page renvoie vers la connexion |
| 2 | **Demandes d'accès** : formulaire de demande, liste « Demandes en attente » des administrateurs, Accepter / Refuser, e-mails, nommer d'autres administrateurs | Un visiteur demande l'accès, Eric l'accepte, le visiteur se connecte |
| 3 | **Personnes** : créer, modifier, supprimer une personne (civilité, prénom, nom, nom de jeune fille, année de naissance, photo) ; tuile cliquable ; liste de toutes les personnes avec recherche | Eric crée sa fiche avec sa photo et la voit en tuile |
| 4 | **Liens de famille** : depuis une fiche, « Ajouter un père / une mère / un frère ou une sœur / un enfant / un conjoint » ; fiche avec parents, conjoint(s), frères et sœurs, enfants, tous cliquables | Depuis Eric, on ajoute ses parents puis un frère, et on navigue de l'un à l'autre |
| 5 | **Vue en arbre** : une rangée par génération, époux côte à côte, fratries sur la même rangée, centrée sur la personne choisie, clic sur une tuile pour recentrer ; adaptée au téléphone | L'arbre d'Eric sur 3 générations s'affiche comme voulu |

## Modèle de données prévu (`prisma/schema.prisma`)

À ajouter étape par étape, en proposant le schéma avant chaque migration.

- `Membre` (étapes 1-2) : compte d'accès au site (ce n'est pas une personne de l'arbre) : `prenom`, `nom`, e-mail unique, `motDePasseHash`, `statut` (`EN_ATTENTE` / `ACCEPTE` / `REFUSE` / `DESACTIVE`), `messageDemande`, `admin`, `superAdmin`, `valideParId`, `valideLe`.
- `SessionMembre`, `JetonEmail` (mot de passe oublié), `TentativeConnexion`, `JournalEmail` : repris d'Objectif.
- `Personne` (étape 3) : `civilite` (`M` / `MME` / `MLLE`), `prenom`, `nom`, `nomJeuneFille`, `anneeNaissance` (entier, facultatif), `photo`, `creeParId`, `modifieParId`.
- `Famille` (étape 4) : un **couple et ses enfants**, sur le modèle des logiciels de généalogie (et du format GEDCOM) : `parent1Id`, `parent2Id` (l'un ou l'autre peut manquer), `marie` (vrai par défaut).
- `Personne.familleOrigineId` (étape 4) : la famille dont la personne est l'enfant.

**Pourquoi une table `Famille` plutôt que `pereId` / `mereId` ?** Parce qu'une seule règle répond à toutes les demandes :
- **conjoint** = l'autre parent d'une même famille (les époux s'affichent côte à côte) ;
- **frère ou sœur** = une personne qui a la **même famille d'origine** (même rangée). Ajouter un frère à quelqu'un dont les parents sont inconnus crée une famille « parents inconnus », que l'on complétera plus tard ;
- **enfant** = une personne dont la famille d'origine est l'une des familles de la personne ;
- **remariage** = plusieurs familles pour la même personne, chacune avec ses enfants (les demi-frères et demi-sœurs viennent sans rien ajouter).

## Commandes

- `npm run dev` : lancer en développement, puis ouvrir http://localhost:3000
- `npx prisma migrate dev --name <nom>` : créer et appliquer une migration (utilise la base shadow).
- `npx prisma generate` : régénérer le client après un changement de schéma, **puis relancer `npm run dev`**.
- `npx prisma studio` : explorer la base dans le navigateur.
- `npm run build` (lancé par Hostinger à chaque push) : `prisma migrate deploy` puis `next build --webpack`.

## Hébergement (contraintes reprises de Palmares et Objectif)

- **Construction avec Webpack** (`"build": "next build --webpack"`) et **`next.config.mjs` en JavaScript** : sur Hostinger, la glibc est trop ancienne pour le compilateur natif de Next.js. En local, `npm run dev` reste sur Turbopack.
- **Construction sans base** : `prisma generate` utilise une adresse factice si `DATABASE_URL` manque, et `lib/prisma.ts` ne lève l'erreur qu'à la première requête.
- **Quota Hostinger : 500 connexions MySQL par heure** et par utilisateur, connexions inactives coupées au bout de 20 secondes. D'où `minimumIdle: 0` et `idleTimeout: 15` dans `lib/prisma.ts`. Ne pas retirer ce réglage.
- Hostinger **n'utilise pas `npm start`** : rien ne doit dépendre du script `start`.
- **Déploiement automatique** : chaque push sur `main` reconstruit et republie le site.
- Les variables d'environnement en ligne se règlent dans hPanel → site → variables d'environnement. L'outil Hostinger qui les modifie **remplace la liste entière** : toujours renvoyer la liste complète.
- Site, nom de domaine et application Node.js : **à créer** (voir « Questions ouvertes »).

## Environnement de développement local

- Dossier du projet : `Documents\ArbreGenealogique` (à confirmer)
- Outils (les mêmes que pour Palmares et Objectif) : Node.js, npm 11, Git, GitHub CLI connecté au compte `chevrel78-commits`.
- **Trois bases MySQL Hostinger**, chacune avec son utilisateur du même nom, distinctes de celles de Palmares et d'Objectif (le quota de connexions n'est donc pas partagé) :
  - base **réelle** (site en ligne, `127.0.0.1:3306` côté serveur). Ne jamais tester dessus ; Claude ne la lit ni ne la modifie.
  - base de **développement** (`DATABASE_URL` dans `.env`) : c'est elle qui sert aux tests en local.
  - base **shadow**, seulement pour `prisma migrate dev` (`SHADOW_DATABASE_URL`).
  - En développement : accès distant autorisé pour l'IPv4 publique du PC, connexion par l'IPv4 du serveur MySQL, comme pour Palmares et Objectif.
- Copier `.env.example` en `.env` et le remplir. `.env` est exclu par `.gitignore` : ne jamais committer ce fichier.
- npm 11 bloque les scripts d'installation : ceux de `prisma`, `@prisma/engines` et `esbuild` sont à autoriser dans `package.json` (`allowScripts`).

## Questions ouvertes

- Nom du site et nom de domaine.
- Un seul arbre (celui de la famille) ou plusieurs familles sur le même site (version SaaS) ? Pour l'instant : un seul arbre, sans fermer la porte au reste.
- Les membres acceptés peuvent-ils tous modifier l'arbre, ou certains seulement le consulter ?
- Bibliothèque pour dessiner l'arbre (étape 5) : à proposer le moment venu (un dessin fait maison en CSS est possible).

## État d'avancement

- [ ] Étape 0 : socle

## Décisions

- 2026-11-22 : même stack que Palmares et Objectif (Next.js 16, Prisma 7, MariaDB, Hostinger, Git) ; comptes séparés des deux autres sites ; dépôt GitHub `chevrel78-commits/arbre-genealogique` (privé).
- 2026-11-22 : **site privé** : accès par mot de passe, **demande d'accès validée par un administrateur** (pas d'inscription libre) ; personnes avec civilité, prénom, nom, nom de jeune fille, **année** de naissance et photo ; liens de famille par une table `Famille` (couple + enfants).
