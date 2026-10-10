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

    public static array $avisFavoris = [];

    private string $cheminFichierFavoris;

    public function __construct(private string $cheminFichier)
    {
        $this->cheminFichierFavoris = __DIR__ . '/../data/avis_favoris.json';

        $this->charger();
        $this->chargerFavoris();
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

        // Fichier vide ou JSON invalide : on repart d'une liste vide.
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
            json_encode(
                $donnees,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
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
        $avis = $this->trouverParId($id);

        if ($avis === null) {
            return;
        }

        $this->avis = array_values(array_filter(
            $this->avis,
            fn(Avis $avis): bool => $avis->getId() !== $id
        ));

        // Retirer également l'avis des favoris.
        $this->retirerFavori($id);

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

    // #region FAVORIS

    /**
     * Charge les identifiants des avis favoris depuis le fichier JSON.
     */
    public function chargerFavoris(): void
    {
        if (!is_file($this->cheminFichierFavoris)) {
            self::$avisFavoris = [];
            return;
        }

        $contenu = file_get_contents($this->cheminFichierFavoris);
        $donnees = json_decode($contenu === false ? '' : $contenu, true);

        self::$avisFavoris = is_array($donnees)
            ? array_values(array_filter($donnees, 'is_string'))
            : [];
    }

    /**
     * Sauvegarde les identifiants des avis favoris.
     */
    public function sauvegarderFavoris(): void
    {
        file_put_contents(
            $this->cheminFichierFavoris,
            json_encode(
                self::$avisFavoris,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            LOCK_EX
        );
    }

    /**
     * Vérifie si un avis est dans les favoris.
     */
    public function estFavori(string $id): bool
    {
        return in_array($id, self::$avisFavoris, true);
    }

    /**
     * Ajoute un avis aux favoris s'il existe et n'y figure pas déjà.
     */
    public function ajouterFavori(string $id): void
    {
        if ($this->trouverParId($id) !== null && !$this->estFavori($id)) {
            self::$avisFavoris[] = $id;
            $this->sauvegarderFavoris();
        }
    }

    /**
     * Retire un avis des favoris.
     */
    public function retirerFavori(string $id): void
    {
        self::$avisFavoris = array_values(array_filter(
            self::$avisFavoris,
            fn(string $favori): bool => $favori !== $id
        ));

        $this->sauvegarderFavoris();
    }

    /**
     * Retourne les identifiants des avis favoris.
     *
     * @return string[]
     */
    public function getIdsFavoris(): array
    {
        return self::$avisFavoris;
    }

    /**
     * Retourne les objets Avis correspondant aux favoris.
     *
     * @return Avis[]
     */
    public function getAvisFavoris(): array
    {
        return array_values(array_filter(
            $this->avis,
            fn(Avis $avis): bool => $this->estFavori($avis->getId())
        ));
    }

    // #endregion
}
