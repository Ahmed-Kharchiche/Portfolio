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
    private string $cheminFichier;
    private array $projets = []; // tableau d'objets Projet

    public function __construct(string $cheminFichier)
    {
        $this->cheminFichier = $cheminFichier;
        $this->charger();
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
        $this->projets = array_values(array_filter(
            $this->projets,
            fn(Projet $projet) => $projet->getId() !== $id
        ));
        $this->sauvegarder();
    }
    // #endregion
}