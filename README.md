# Portfolio — Ahmed Kharchiche

Portfolio personnel réalisé en PHP, HTML, CSS et JavaScript. Il présente les projets, les compétences et le parcours d'Ahmed Kharchiche, avec un espace d'administration pour gérer les projets et modérer les avis.

Les données sont conservées dans des fichiers JSON : aucune base de données n'est nécessaire. Composer installe PHPMailer, utilisé pour les notifications par e-mail. Les animations utilisent notamment Three.js, chargé depuis un CDN.

## Fonctionnalités

- Accueil avec projets et avis favoris sélectionnés dans l'administration.
- Catalogue de projets avec tri, filtres par technologie et carrousels d'images.
- Présentation immersive des projets et présentations dédiées `standard` / `emotion-ai`.
- Dépôt d'avis, notation et publication après validation dans l'administration.
- Administration des projets, des images, des favoris et des avis.
- Connexion administrateur par mot de passe, avec limitation des tentatives par adresse IP.
- Thème clair/sombre et animations JavaScript.
- Page de contact utilisant un formulaire `mailto:` : l'envoi passe par le logiciel de messagerie du visiteur.

## Prérequis

- **PHP 8.0 minimum**, notamment pour les propriétés promues et l'opérateur `?->` employés dans le code.
- Extensions PHP **mbstring**, **session**, **json**, **ctype**, **filter** et **hash**. `mbstring` est nécessaire pour l'affichage des descriptions de projets.
- Extension **openssl** pour les notifications SMTP avec STARTTLS.
- **Composer** pour installer les dépendances à partir de `composer.lock`.
- Navigateur récent avec prise en charge des modules JavaScript ; WebGL pour les scènes 3D. Un accès Internet est nécessaire au chargement des bibliothèques servies par CDN.

Il n'y a pas d'installation npm ni de compilation des ressources à effectuer.

## Installation locale

Depuis la racine du projet :

```sh
composer install
```

Créer ensuite `config/secrets.php` avec les quatre clés attendues :

```php
<?php

return [
    'mot_de_passe_hash' => 'REMPLACER_PAR_UN_HASH_PASSWORD_HASH',
    'smtp_email' => 'adresse-du-compte-smtp@example.com',
    'smtp_mot_de_passe' => 'REMPLACER_PAR_LE_MOT_DE_PASSE_SMTP',
    'email_notification' => 'destinataire@example.com',
];
```

Le mot de passe administrateur est stocké sous forme de hash. Pour en générer un, remplacer la valeur d'exemple dans cette commande puis reporter le résultat dans `mot_de_passe_hash` :

```sh
php -r "echo password_hash('REMPLACER_PAR_VOTRE_MOT_DE_PASSE', PASSWORD_DEFAULT), PHP_EOL;"
```

Les notifications de connexion et de nouvel avis utilisent actuellement le serveur **`smtp.ionos.fr`**, le port **587** et **STARTTLS**, définis dans `login.php` et `avis.php`. Les identifiants SMTP doivent correspondre à ce service. Une erreur de notification est journalisée par PHP et ne bloque pas la connexion ou l'enregistrement de l'avis.

`config/secrets.php` est ignoré par Git et ne doit pas être ajouté au dépôt. Le fichier `config/.htaccess` en interdit l'accès HTTP sous Apache lorsque les règles `.htaccess` sont activées.

Lancer le serveur de développement depuis la racine :

```sh
php -S 127.0.0.1:8000 -t .
```

Ouvrir ensuite [le portfolio local](http://127.0.0.1:8000/) ou [la connexion administrateur](http://127.0.0.1:8000/login.php).

Le serveur PHP intégré est destiné au développement local et ne lit pas les fichiers `.htaccess`.

## Organisation des fichiers

```text
.
├── index.php                    # Accueil
├── projets.php                  # Catalogue des projets
├── detail-projet.php            # Présentation immersive d'un projet
├── standard.php                 # Présentation standard d'un projet
├── emotion-ai.php               # Présentation dédiée à Emotion AI
├── core.php                     # Autre scène de présentation des projets
├── apropos.php                  # Parcours et compétences
├── contact.php                  # Coordonnées et formulaire mailto
├── avis.php                     # Consultation et dépôt d'avis
├── login.php / logout.php       # Connexion et déconnexion
├── admin.php                    # Gestion des projets et des avis
├── confidentialite.php          # Politique de confidentialité
├── src/
│   ├── modeles/                 # Classes Avis et Projet
│   └── gestionnaires/           # Lecture/écriture JSON et gestion des favoris
├── templates/
│   ├── layout/                 # En-tête et pied de page
│   ├── composants/             # Cartes, confirmation et bouton de retour en haut
│   └── projets/                # Vue immersive partagée
├── assets/
│   ├── css/
│   │   ├── base/               # Styles communs
│   │   ├── layout/             # En-tête et pied de page
│   │   ├── composants/         # Cartes, carrousels, thème et confirmation
│   │   ├── pages/              # Styles propres aux pages
│   │   └── projets/            # Styles des présentations de projets
│   ├── js/
│   │   ├── commun/             # Comportements partagés
│   │   ├── composants/         # Interactions des composants
│   │   ├── pages/              # Scripts propres aux pages
│   │   └── projets/            # Scripts des présentations de projets
│   ├── images/
│   │   ├── interface/          # Images de l'interface
│   │   └── projets/            # Images des projets et fichiers téléversés
│   ├── sons/                   # Ressources audio
│   └── cv/                     # CV à fournir
├── config/                     # Configuration privée et règle Apache
├── data/                       # Données JSON
├── demos/                      # Démonstrations autonomes, dont reseau.html
├── vendor/                     # Dépendances gérées par Composer
├── composer.json / composer.lock
└── sitemap.xml
```

Les pages accessibles au visiteur restent à la racine pour conserver leurs URL et les liens existants. `src/` contient les classes PHP, `templates/` les éléments d'affichage partagés et `assets/` les ressources chargées par le navigateur. Les fichiers de `vendor/` se gèrent avec Composer.

### Repères après le rangement

| Ancien emplacement | Nouvel emplacement |
| --- | --- |
| `includes/Projet.php`, `includes/Avis.php` | `src/modeles/` |
| `includes/Gestionnaire*.php` | `src/gestionnaires/` |
| `includes/header.php`, `includes/footer.php` | `templates/layout/` |
| `includes/affichage_*.php`, `includes/bouton_haut.php`, `includes/confirm/confirmation.php` | `templates/composants/` (noms avec tirets) |
| `includes/templates/immersif.php` | `templates/projets/immersif.php` |
| `css/` | `assets/css/`, réparti par rôle |
| `js/` | `assets/js/`, réparti par rôle |
| `includes/confirm/confirmation.css` et `.js` | `assets/css/composants/` et `assets/js/composants/` |
| `images/` | `assets/images/`, réparti entre interface et projets |
| `images/reseau.html` | `demos/reseau.html` |
| `sons/`, `cv/` | `assets/sons/`, `assets/cv/` |

Les noms des scripts JavaScript utilisent des minuscules et des tirets, par exemple `accueil.js`, `projets-tri.js` et `liste-deroulante.js`.

## Données et fichiers locaux

| Fichier | Rôle |
| --- | --- |
| `data/projets.json` | Projets, technologies, descriptions, images et choix de présentation |
| `data/projets_favoris.json` | Projets mis en avant sur l'accueil |
| `data/avis.json` | Avis déposés et état de publication |
| `data/avis_favoris.json` | Avis mis en avant sur l'accueil |
| `data/emotion-ai.json` | Contenu et résultats de la présentation Emotion AI |
| `data/tentatives_login.json` | Suivi local des tentatives de connexion ; présent dans `.gitignore`, mais déjà suivi dans ce dépôt |

Le processus PHP doit pouvoir écrire dans `data/` et dans `assets/images/projets/` pour enregistrer les modifications, les avis, les tentatives de connexion et les images envoyées depuis l'administration. Sur un hébergement, conserver ces données et les images téléversées lors des mises à jour du site.

Les chemins d'images enregistrés dans `data/projets.json` sont relatifs à la racine du site et commencent par `assets/images/projets/`. Un déplacement d'image doit aussi être reporté dans les données qui la référencent.

Le bouton de téléchargement de l'accueil attend **`assets/cv/CV_Ahmed_Kharchiche.pdf`**. Ce fichier n'est pas fourni actuellement : l'ajouter à cet emplacement pour activer le téléchargement.

La page de confidentialité référence `assets/css/pages/confidentialite.css`, une feuille déjà absente avant le rangement. Elle utilise les styles communs, mais sa feuille dédiée reste à fournir.

## Faire évoluer le portfolio

### Ajouter ou modifier un projet

Se connecter via `login.php`, puis ouvrir `admin.php`. L'administration permet de renseigner le titre, la description, les technologies, le lien du dépôt, les images et le choix de présentation. Les avis reçus se publient également depuis cette page. Les boutons de favoris choisissent les éléments mis en avant sur l'accueil.

Les présentations existantes sont accessibles avec l'identifiant d'un projet :

```text
detail-projet.php?id=IDENTIFIANT
standard.php?id=IDENTIFIANT
emotion-ai.php?id=IDENTIFIANT
```

La liste des présentations autorisées est définie dans `src/modeles/Projet.php` (`Projet::TEMPLATES`). Ajouter une présentation implique de prévoir sa page PHP, ses ressources dans `assets/css/projets/` et `assets/js/projets/`, puis son entrée dans cette liste. Le changement de présentation s'appuie sur le nom de cette page PHP.

### Ajouter une page ou un composant

Créer la page PHP à la racine et réutiliser les fichiers de `templates/layout/`. Placer son CSS dans `assets/css/pages/` et ses scripts dans `assets/js/pages/`. La variable `$page_css` contient le chemin relatif à `assets/css/`, par exemple `pages/ma-page.css`.

Un élément d'affichage réutilisable va dans `templates/composants/`, avec ses styles et scripts dans les dossiers `composants/` correspondants. Les classes de données restent dans `src/modeles/` ; les accès aux fichiers JSON restent dans `src/gestionnaires/`.

Pour les inclusions PHP, utiliser `__DIR__` afin de construire un chemin depuis le fichier qui effectue l'inclusion. Les liens HTML se résolvent depuis l'URL de la page affichée ; les imports de modules JavaScript et les URL CSS se résolvent depuis le fichier de ressource concerné.

### Vérifier une modification

Contrôler la syntaxe des fichiers PHP modifiés avec `php -l chemin/du/fichier.php`, puis lancer le serveur local. Vérifier les pages concernées ainsi que les onglets Console et Réseau du navigateur, en particulier après un déplacement de CSS, de script ou d'image. Pour une modification de l'administration, contrôler aussi la sauvegarde des données et les fichiers téléversés sur une copie locale des données.
