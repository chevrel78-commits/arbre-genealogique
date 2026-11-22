# CLAUDE.md — Arbre généalogique

> **Langue : toujours parler à Eric en français**, sans exception : chaque message, question, récapitulatif, compte rendu, message de commit et commentaire du code. Jamais d'anglais, même pour un message court ou technique (demande d'Eric du 2026-11-22).

## Le produit

Un site où une famille construit **ensemble** son **arbre généalogique**, en ligne. Le site est **privé** : on n'y entre qu'avec un compte validé par un administrateur.

**Les personnes de l'arbre** (demandes d'Eric, 2026-11-22)

- Chaque personne a : **civilité** (M., Mme, Mlle), **prénom**, **nom**, **nom de jeune fille** (facultatif), **date de naissance** (facultative, complète ou partielle : année seule, ou mois et année), **lieu de naissance** (facultatif), **photo** (facultative).
- Chaque personne est représentée par une **tuile cliquable** (photo, civilité, prénom, nom). Un clic ouvre sa fiche.
- Depuis la fiche d'une personne, on ajoute en un clic : un **père** ou une **mère**, un **frère** ou une **sœur**, un **enfant**, un **conjoint**.
- Dans l'arbre, les **époux sont côte à côte**, les **frères et sœurs sur la même rangée**, et chaque génération occupe sa propre rangée (parents au-dessus, enfants en dessous).

**L'accès au site** (demandes d'Eric, 2026-11-22)

- **Accès sécurisé par mot de passe** : aucune page de l'arbre n'est visible sans connexion.
- **Demande d'accès** : un visiteur remplit un formulaire (prénom, nom, e-mail, mot de passe, message facultatif « je suis le petit-fils de… »). Son compte reste **en attente**.
- **Administrateurs** : ils voient les demandes, les **acceptent** ou les **refusent**. Le demandeur est prévenu par e-mail.
- Le premier administrateur (super-administrateur, Eric) est créé par une commande dans le terminal, comme pour Palmares et Objectif.

**Plus tard, à décider** : sources et documents (scans d'actes), date et lieu de décès, import / export GEDCOM (le format d'échange des logiciels de généalogie), plusieurs arbres sur le même site (un par famille, version SaaS « multi-familles »).

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
3. **Chaque étape du plan (présenté et validé dans la conversation) se termine par une vérification visible dans le navigateur**, en local : lancer l'application, montrer la page concernée et décrire ce que l'utilisateur doit voir.
4. **Après chaque étape validée, mettre à jour ce CLAUDE.md**, en particulier les sections « État d'avancement » et « Décisions ».
5. **Sauvegarder sur GitHub, seulement avec l'accord d'Eric** : une fois une étape terminée et vérifiée, **demander avant de faire le commit et le push** (le push reconstruit et republie le site en ligne). Un commit par étape, avec un message clair en français.
6. **Tenir à jour le guide d'utilisation** `docs/guide-utilisation.md` (pour les utilisateurs, en français simple, sans détails techniques) à chaque étape qui change ce que le site fait ou montre, dans le même commit.
7. **Être pédagogique** : Eric est formateur ; expliquer le pourquoi des choix techniques, en termes simples.
8. **Rien sans connexion** : chaque page et chaque action qui lit ou modifie l'arbre appelle `exigerMembre()` (compte accepté et actif) ; les actions d'administration appellent `exigerAdministrateur()`. `proxy.ts` ne fait qu'un contrôle rapide du cookie : ce n'est pas la vraie protection.

## Modèle de données prévu (`prisma/schema.prisma`)

À ajouter au fil du plan, en proposant le schéma avant chaque migration.

- `Membre` : compte d'accès au site (ce n'est pas une personne de l'arbre) : `prenom`, `nom`, e-mail unique, `motDePasseHash`, `statut` (`EN_ATTENTE` / `ACCEPTE` / `REFUSE` / `DESACTIVE`), `messageDemande`, `admin`, `superAdmin`, `valideParId`, `valideLe`.
- `SessionMembre`, `JetonEmail` (mot de passe oublié), `TentativeConnexion`, `JournalEmail` : repris d'Objectif (en place).
- `Personne` : `civilite` (`M` / `MME` / `MLLE`), `prenom`, `nom`, `nomJeuneFille`, `jourNaissance`, `moisNaissance`, `anneeNaissance` (entiers facultatifs), `lieuNaissance`, `photo`, `creeParId`, `modifieParId`.
- `Famille` : un **couple et ses enfants**, sur le modèle des logiciels de généalogie (et du format GEDCOM) : `parent1Id`, `parent2Id` (l'un ou l'autre peut manquer), `marie` (vrai par défaut).
- `Personne.familleOrigineId` : la famille dont la personne est l'enfant.

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
- `npm run creer-admin` : créer (ou remettre en état : nouveau mot de passe) le compte du super-administrateur dans la base de `DATABASE_URL`. Le mot de passe se tape dans le terminal, sans s'afficher, et ne passe jamais par Claude.
- `npm run build` (lancé par Hostinger à chaque push) : `prisma migrate deploy` puis `next build --webpack`.

## Hébergement (contraintes reprises de Palmares et Objectif)

- **Construction avec Webpack** (`"build": "next build --webpack"`) et **`next.config.mjs` en JavaScript** : sur Hostinger, la glibc est trop ancienne pour le compilateur natif de Next.js. En local, `npm run dev` reste sur Turbopack.
- **Construction sans base** : `prisma generate` utilise une adresse factice si `DATABASE_URL` manque, et `lib/prisma.ts` ne lève l'erreur qu'à la première requête.
- **Quota Hostinger : 500 connexions MySQL par heure** et par utilisateur, connexions inactives coupées au bout de 20 secondes. D'où `minimumIdle: 0` et `idleTimeout: 15` dans `lib/prisma.ts`. Ne pas retirer ce réglage.
- Hostinger **n'utilise pas `npm start`** : rien ne doit dépendre du script `start`.
- **Déploiement automatique** : chaque push sur `main` reconstruit et republie le site.
- Les variables d'environnement en ligne se règlent dans hPanel → site → variables d'environnement. L'outil Hostinger qui les modifie **remplace la liste entière** : toujours renvoyer la liste complète.
- Site : **https://arbre.altea.website** (choix d'Eric du 2026-11-22), application Node.js de l'hébergement Hostinger (compte `u145882112`, comme Palmares et Objectif), créé le 2026-11-22, relié au dépôt GitHub (construction à chaque push sur `main`, Node.js 24). Variables en ligne : `DATABASE_URL` (base réelle, `127.0.0.1:3306`), `URL_SITE`, `STOCKAGE_MEDIAS` = `/home/u145882112/arbre-stockage/medias`, et pour les e-mails (étape 2) `SMTP_HOTE` = `smtp.hostinger.com`, `SMTP_PORT` = `465`, `SMTP_UTILISATEUR` = `noreply@altea.website`, `SMTP_MOT_DE_PASSE` (saisi par Eric seul), `EMAIL_EXPEDITEUR` = `Arbre généalogique <noreply@altea.website>`.

## Environnement de développement local

- Dossier du projet sur le PC d'Eric (Windows) : `C:\Users\chevr\Documents\Arbre généalogique\ArbreGenealogique` (choix d'Eric du 2026-11-22)
- Outils (les mêmes que pour Palmares et Objectif) : Node.js, npm 11, Git, GitHub CLI connecté au compte `chevrel78-commits`.
- **Trois bases MySQL Hostinger**, chacune avec son utilisateur du même nom, distinctes de celles de Palmares et d'Objectif (le quota de connexions n'est donc pas partagé) :
  - `u145882112_arbre` = base **réelle** (site en ligne, `127.0.0.1:3306` côté serveur). Ne jamais tester dessus ; Claude ne la lit ni ne la modifie.
  - `u145882112_arbreDev` (avec un **D majuscule**) = base de **développement** (`DATABASE_URL` dans `.env`) : c'est elle qui sert aux tests en local.
  - `u145882112_arbreshadow` = base **shadow**, seulement pour `prisma migrate dev` (`SHADOW_DATABASE_URL`).
  - En développement : accès distant autorisé pour l'IPv4 publique du PC, connexion par l'IPv4 du serveur MySQL, comme pour Palmares et Objectif.
- Copier `.env.example` en `.env` et le remplir. `.env` est exclu par `.gitignore` : ne jamais committer ce fichier.
- npm 11 bloque les scripts d'installation : ceux de `prisma`, `@prisma/engines` et `esbuild` sont à autoriser dans `package.json` (`allowScripts`).

## Questions ouvertes

- Un seul arbre (celui de la famille) ou plusieurs familles sur le même site (version SaaS) ? Pour l'instant : un seul arbre, sans fermer la porte au reste.
- Sauvegarde des photos : les fichiers de `STOCKAGE_MEDIAS` ne sont pas sur GitHub ; vérifier que les sauvegardes Hostinger couvrent ce dossier.
- Parents de même sexe : les boutons « Père » et « Mère » supposent aujourd'hui un parent M. et un parent Mme ou Mlle. À adapter si la famille en a besoin.

## État d'avancement

- [x] Étape 0 : socle (2026-11-22) : site Hostinger `arbre.altea.website` relié à GitHub, trois bases créées, migration `init` appliquée pendant la construction
- [x] Étape 1 : connexion (2026-11-22) : tables `Membre` et `SessionMembre` (migration `connexion`), page `/connexion`, bouton « Se déconnecter », tout le site protégé (`proxy.ts` + `exigerMembre()`), blocage 15 min après 5 essais ratés, commande `npm run creer-admin`
- [x] Étape 2 : demandes d'accès (2026-11-22) : pages publiques `/demande-acces`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` ; page `/admin` (accepter / refuser, désactiver / réactiver, nommer administrateur) ; e-mails aux demandeurs et aux administrateurs ; table `JetonEmail` (migration `demandes_acces`)
- [x] Étape 3 : personnes (2026-11-22) : tables `Personne` et `Famille` (migrations `personnes` et `date_lieu_naissance`, `Famille` encore vide), date partielle et lieu de naissance, tuiles sur l'accueil, pages `/personnes/nouvelle`, `/personnes/[id]` et `/personnes/[id]/modifier`
- [x] Étape 4 : liens de famille (2026-11-22) : rubriques Parents, Conjoints, Frères et sœurs, Enfants sur la fiche ; page `/personnes/[id]/ajouter/[lien]` (nouvelle personne ou recherche dans l'arbre) ; retrait d'un lien ; suppression d'une personne réservée aux administrateurs ; aucune migration
- [x] Étape 5 : dessin de l'arbre (2026-11-22) : l'accueil affiche l'arbre centré sur une personne (`/?centre=id`), 3 générations de chaque côté, avec recentrage, recherche, zoom et bascule vers la liste (`/?vue=liste`) ; aucune migration
- [x] Étape 6 : photos (2026-11-22) : ajout, remplacement et retrait depuis la fiche ; grande image et vignette WebP sans métadonnées (`lib/stockage.ts`) ; adresse protégée `/photos/[fichier]` ; affichage sur la fiche, les tuiles et l'arbre ; aucune migration

## Décisions

- 2026-11-22 : même stack que Palmares et Objectif (Next.js 16, Prisma 7, MariaDB, Hostinger, Git) ; comptes séparés des deux autres sites ; dépôt GitHub `chevrel78-commits/arbre-genealogique` (privé).
- 2026-11-22 : **site privé** : accès par mot de passe, **demande d'accès validée par un administrateur** (pas d'inscription libre) ; personnes avec civilité, prénom, nom, nom de jeune fille, **année** de naissance et photo ; liens de famille par une table `Famille` (couple + enfants).
- 2026-11-22 : **Next.js 16.4.6** (et non 16.4.3 comme Palmares et Objectif) : la 16.4.3 est signalée par Next.js comme touchée par une faille de sécurité et refuse de construire le site tant qu'on ne relance pas la commande.
- 2026-11-22 : **connexion maison** : mot de passe haché par scrypt (`lib/mot-de-passe.ts`, 10 caractères minimum) ; session = jeton aléatoire dans un cookie httpOnly `arbre_session` (30 jours), la base ne garde que son empreinte SHA-256 (`lib/session.ts`) ; 5 essais ratés par e-mail (ou 20 par adresse IP) en 15 minutes bloquent la connexion (`lib/limite-connexion.ts`). Seul un compte au statut `ACCEPTE` peut entrer. Pages réservées aux membres dans le groupe `app/(membres)/` (bandeau avec nom et « Se déconnecter »). « Mot de passe oublié » reporté à l'étape 2 (il a besoin des e-mails).
- 2026-11-22 : avec `cacheComponents`, toute lecture de session passe par `membreDeLaSession()`, qui appelle `await connection()` d'abord, et se fait dans un composant sous `<Suspense>` (sinon Next.js refuse `new Date()` pendant le pré-rendu).
- 2026-11-22 : **demandes d'accès** : un visiteur crée un compte `EN_ATTENTE` ; un administrateur l'accepte ou le refuse sur `/admin` (actions dans `app/(membres)/admin/actions.ts`, toutes derrière `exigerAdministrateur()`). Règles : personne ne touche au super-administrateur ni à son propre compte ; seul le super-administrateur nomme, retire ou désactive un administrateur. Une demande refusée peut être refaite (elle repasse en attente). Les pages publiques ne révèlent jamais si une adresse a un compte (même réponse ; le titulaire d'un compte actif reçoit un e-mail). Limites : 5 demandes d'accès par heure et par IP (3 par e-mail), 10 demandes de mot de passe par heure et par IP (3 par e-mail), notées dans `TentativeConnexion` (espaces `demande` et `oubli`).
- 2026-11-22 : **mot de passe oublié** : lien à usage unique valable 1 heure (`lib/jetons.ts`, la base ne garde que l'empreinte SHA-256 du jeton) ; le nouveau mot de passe ferme toutes les sessions du membre puis le connecte. Textes des e-mails dans `lib/emails-membres.ts` ; un e-mail qui ne part pas ne bloque jamais l'action (échec noté dans `JournalEmail`).
- 2026-11-22 : **expéditeur des e-mails** : la boîte existante `noreply@altea.website` (offre mail Hostinger d'Eric), via `smtp.hostinger.com:465`. Sans `SMTP_HOTE` (développement), le texte des e-mails s'affiche dans le terminal de `npm run dev`.
- 2026-11-22 : après une action d'administration, le message de confirmation passe par un cookie de 10 secondes (`arbre_admin_info`) et `revalidatePath("/", "layout")` recalcule aussi le bandeau (compteur de demandes en attente) en même temps que la page.
- 2026-11-22 : **tous les membres acceptés peuvent modifier l'arbre** (choix d'Eric) ; la base garde qui a créé et modifié chaque fiche. Un rôle « lecture seule » pourra être ajouté plus tard.
- 2026-11-22 : **personnes** : supprimer un compte membre n'efface jamais une personne (`creeParId` et `modifieParId` passent à vide) ; tuiles classées par nom puis prénom (elles n'affichent que l'année) ; initiales à la place de la photo jusqu'à l'étape 6. Dans les formulaires avec `useActionState`, garder `defaultValue` / `defaultChecked` : React remet le formulaire à ces valeurs après l'envoi (un bouton radio contrôlé par `useState` se décoche), et donner au `<select>` une `key` égale à sa valeur, sinon il se vide après une erreur.
- 2026-11-22 : **date de naissance partielle** (choix d'Eric) : trois colonnes `jourNaissance`, `moisNaissance`, `anneeNaissance` plutôt qu'un champ date, pour ne jamais inventer un jour ou un mois inconnu. Pas de jour sans mois, pas de mois sans année, année à partir de 1000, ni date impossible ni date future (`erreurDateNaissance`, `lib/personnes.ts`). Avant 1583, une année sur quatre est bissextile (calendrier julien). Lieu de naissance en texte libre (150 caractères).
- 2026-11-22 : **photos** : JPEG, PNG ou WebP, 10 Mo au plus ; `sharp` crée une image de 1200 px au plus et une vignette carrée de 240 px, corrige le sens et supprime toutes les métadonnées (GPS, appareil). Fichiers aux noms aléatoires dans `STOCKAGE_MEDIAS/personnes` (par défaut `stockage/medias` en local, exclu de Git), servis seulement aux membres acceptés. `experimental.proxyClientMaxBodySize` est réglé à 11 Mo : sinon `proxy.ts` tronque sans erreur les envois de plus de 10 Mo. Ne pas retirer ce réglage.
- 2026-11-22 : **dessin de l'arbre fait maison**, sans nouvelle bibliothèque (plan validé par Eric) : `lib/disposition-arbre.ts` calcule, sans base ni affichage, qui montrer, la position des tuiles et le tracé des traits ; `components/vue-arbre.tsx` affiche les tuiles et les traits en SVG. Une personne n'est dessinée qu'une fois. Les liens de l'arbre ont `prefetch={false}` pour ménager le quota de connexions MySQL.
- 2026-11-22 : **liens de famille** (`lib/liens.ts`) : chaque modification passe par `avecVerrou()`, une transaction « tout ou rien » qui fait passer les modifications une par une, fusionne les familles aux mêmes parents, retire les familles devenues inutiles, puis refuse toute incohérence (être son propre ancêtre, couple entre un parent et son descendant). Les messages de règle passent par `ErreurLien`. Retirer un parent garde l'autre parent ; un couple avec enfants ne se retire pas directement ; **supprimer une personne est réservé aux administrateurs** (`exigerAdministrateur()`).
- 2026-11-22 : la recherche d'une personne se fait en JavaScript (sans accents ni majuscules) : le filtre `contains` / `endsWith` de Prisma provoque ici une erreur de collation MySQL (`Illegal mix of collations`).
- 2026-11-22 : **pour vérifier une mise en ligne, regarder l'adresse** : une fiche créée dans l'aperçu `localhost` va dans la base de développement, pas sur le site réel. Pour tester sans toucher à la session d'Eric dans l'aperçu, utiliser une copie de production (`next start`) sur `127.0.0.1` et un autre port : en mode `next dev`, l'adresse `127.0.0.1` ne charge pas le JavaScript des formulaires.
