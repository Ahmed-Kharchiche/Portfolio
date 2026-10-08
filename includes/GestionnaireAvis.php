<?php
declare(strict_types=1);

require_once __DIR__ . '/Avis.php';

/**
 * Charge, sauvegarde et manipule les avis stockés dans un fichier JSON.
 * Toutes les méthodes renvoient / attendent des objets Avis (jamais des tableaux).
 */
class GestionnaireAvis
{
    // #region PROPRIÉTÉS ET CONSTRUCTEUR
    /** @var Avis[] */
    private array $avis = [];

    public function __construct(private string $cheminFichier)
    {
        $this->charger();
    }
    // #endregion

    // #region CHARGEMENT ET SAUVEGARDE
    public function charger(): void
    {
        $this->avis = [];

        if (!is_file($this->cheminFichier)) {
            return;
        }

        $contenu = file_get_contents($this->cheminFichier);
        $donnees = json_decode($contenu === false ? '' : $contenu, true);

        // Fichier vide ou JSON invalide : on repart d'une liste vide
        if (!is_array($donnees)) {
            return;
        }

        foreach ($donnees as $ligne) {
            if (is_array($ligne)) {
                $this->avis[] = Avis::depuisTableau($ligne);
            }
        }
    }

    public function sauvegarder(): void
    {
        $donnees = array_map(
            fn(Avis $avis): array => $avis->versTableau(),
            $this->avis
        );

        file_put_contents(
            $this->cheminFichier,
            json_encode($donnees, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            LOCK_EX
        );
    }
    // #endregion

    // #region LECTURE
    /** @return Avis[] */
    public function getTous(): array
    {
        return $this->avis;
    }

    /** @return Avis[] Avis visibles sur le portfolio. */
    public function getPublies(): array
    {
        return array_values(array_filter(
            $this->avis,
            fn(Avis $avis): bool => $avis->estPublie()
        ));
    }

    /** @return Avis[] Avis en attente de validation. */
    public function getNonPublies(): array
    {
        return array_values(array_filter(
            $this->avis,
            fn(Avis $avis): bool => !$avis->estPublie()
        ));
    }

    public function trouverParId(string $id): ?Avis
    {
        foreach ($this->avis as $avis) {
            if ($avis->getId() === $id) {
                return $avis;
            }
        }

        return null;
    }
    // #endregion

    // #region MODIFICATION
    public function ajouter(Avis $avis): void
    {
        $avis->setId('avis_' . bin2hex(random_bytes(6)));
        $this->avis[] = $avis;
        $this->sauvegarder();
    }

    public function supprimer(string $id): void
    {
        $this->avis = array_values(array_filter(
            $this->avis,
            fn(Avis $avis): bool => $avis->getId() !== $id
        ));

        $this->sauvegarder();
    }

    public function publier(string $id): void
    {
        $avis = $this->trouverParId($id);

        if ($avis !== null) {
            $avis->setPublie(true);
            $this->sauvegarder();
        }
    }
    // #endregion
}