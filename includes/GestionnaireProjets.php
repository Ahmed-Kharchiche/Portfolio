<?php

require_once 'Projet.php';

/**
 * S'occupe de tout ce qui touche au fichier projets.json :
 * le charger, le sauvegarder, ajouter/modifier/supprimer un projet.
 *
 * C'est la SEULE classe qui a le droit de lire ou écrire ce fichier.
 * Projet, lui, ne sait manipuler que ses propres données en mémoire.
 */
class GestionnaireProjets
{
    // #region PROPRIÉTÉS ET CONSTRUCTEUR

    public static array $projetsFavoris = [];
    private string $cheminFichierFavoris;

    private string $cheminFichier;
    private array $projets = []; // tableau d'objets Projet

    public function __construct(string $cheminFichier)
    {
        $this->cheminFichier = $cheminFichier;
        $this->cheminFichierFavoris = "data/projets_favoris.json";

        $this->charger();
        $this->chargerFavoris();
    }
    // #endregion

    // #region CHARGEMENT ET SAUVEGARDE
    /**
     * Lit projets.json et reconstruit un objet Projet par entrée.
     * Appelé automatiquement par le constructeur.
     */
    public function charger(): void
    {
        $this->projets = [];

        if (!file_exists($this->cheminFichier)) {
            return; // pas encore de fichier = pas encore de projets, rien à faire
        }

        $contenu = file_get_contents($this->cheminFichier);
        $donnees = json_decode($contenu, true) ?? [];

        foreach ($donnees as $donneesProjet) {
            $this->projets[] = Projet::depuisTableau($donneesProjet);
        }
    }

    /**
     * Réécrit tout le fichier projets.json à partir des objets Projet actuellement en mémoire.
     */
    public function sauvegarder(): void
    {
        $donnees = array_map(fn(Projet $projet) => $projet->versTableau(), $this->projets);
        file_put_contents($this->cheminFichier, json_encode($donnees, JSON_PRETTY_PRINT));
    }
    // #endregion



    // #region LECTURE
    /**
     * Retourne tous les projets (utile pour les boucles d'affichage).
     */
    public function getTous(): array
    {
        return $this->projets;
    }

    /**
     * Cherche un projet par son id. Retourne null si introuvable.
     */
    public function trouverParId(string $id): ?Projet
    {
        foreach ($this->projets as $projet) {
            if ($projet->getId() === $id) {
                return $projet;
            }
        }
        return null;
    }
    // #endregion

    // #region MODIFICATION
    /**
     * Ajoute un nouveau projet : lui attribue un id unique, l'ajoute à la liste,
     * puis sauvegarde tout de suite dans le fichier.
     */
    public function ajouter(Projet $projet): void
    {
        $projet->setId(uniqid("projet_"));
        $this->projets[] = $projet;
        $this->sauvegarder();
    }

    /**
     * Supprime un projet par son id, puis sauvegarde.
     */

    public function supprimer(string $id): void
    {
        $projet = $this->trouverParId($id);

        if ($projet === null) {
            return;
        }

        // Retirer le projet de la liste des projets
        $this->projets = array_values(array_filter(
            $this->projets,
            fn(Projet $p) => $p->getId() !== $id
        ));

        $this->retirerFavori($projet->getTitre());

        $this->sauvegarder();
    }

    // #endregion

    // #region FAVORIS

    public function chargerFavoris(): void
    {
        if (!file_exists($this->cheminFichierFavoris)) {
            self::$projetsFavoris = [];
            return;
        }

        $contenu = file_get_contents($this->cheminFichierFavoris);
        self::$projetsFavoris = json_decode($contenu, true) ?? [];
    }

    public function sauvegarderFavoris(): void
    {
        file_put_contents(
            $this->cheminFichierFavoris,
            json_encode(self::$projetsFavoris, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );
    }

    public function estFavori(string $titre): bool
    {
        return in_array($titre, self::$projetsFavoris, true);
    }

    public function ajouterFavori(string $titre): void
    {
        if (!$this->estFavori($titre)) {
            self::$projetsFavoris[] = $titre;
            $this->sauvegarderFavoris();
        }
    }

    public function retirerFavori(string $titre): void
    {
        self::$projetsFavoris = array_values(
            array_filter(
                self::$projetsFavoris,
                fn(string $favori) => $favori !== $titre
            )
        );

        $this->sauvegarderFavoris();
    }


    public function getTitresFavoris(): array
    {
        return self::$projetsFavoris;
    }

    public function getProjetsFavoris(): array
    {
        return array_values(array_filter(
            $this->projets,
            fn(Projet $projet) => $this->estFavori($projet->getTitre())
        ));
    }

// #endregion
}