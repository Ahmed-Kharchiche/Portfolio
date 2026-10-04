<?php

/**
 * Représente un projet du portfolio.
 *
 * Important : cette classe ne touche jamais au fichier projets.json.
 * Elle ne connaît que ses propres données (titre, description...).
 * C'est le GestionnaireProjets qui s'occupera de charger/sauvegarder
 * les objets Projet dans le fichier.
 */
class Projet
{
    private ?string $id;
    private string $titre;
    private string $description;
    private array $technologies;
    private string $gitlab;
    private array $images;
    private ?string $dateCreation;

    public function __construct(
        ?string $id,
        string $titre,
        string $description,
        array $technologies = [],
        string $gitlab = "",
        array $images = [],
        ?string $dateCreation = null
    ) {
        $this->id = $id;
        $this->titre = $titre;
        $this->description = $description;
        $this->technologies = $technologies;
        $this->gitlab = $gitlab;
        $this->images = $images;
        $this->dateCreation = $dateCreation;
    }

    // ---- Getters ----

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getTitre(): string
    {
        return $this->titre;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getTechnologies(): array
    {
        return $this->technologies;
    }

    public function getGitlab(): string
    {
        return $this->gitlab;
    }

    public function getImages(): array
    {
        return $this->images;
    }

    public function getDateCreation(): ?string
    {
        return $this->dateCreation;
    }

    // ---- Setters ----

    // Utiles pour la modification d'un projet existant : on récupère l'objet,
    // on appelle les setters pour changer ce qui a changé, puis c'est le
    // GestionnaireProjets qui se charge de réécrire le fichier JSON.

    /**
     * Attribue un id au projet. Normalement utilisé une seule fois,
     * par le GestionnaireProjets, au moment de la création du projet.
     * L'id ne doit ensuite plus jamais changer.
     */
    public function setId(string $id): void
    {
        $this->id = $id;
    }

    public function setTitre(string $titre): void
    {
        $this->titre = $titre;
    }

    public function setDescription(string $description): void
    {
        $this->description = $description;
    }

    public function setTechnologies(array $technologies): void
    {
        $this->technologies = $technologies;
    }

    public function setGitlab(string $gitlab): void
    {
        $this->gitlab = $gitlab;
    }

    public function setImages(array $images): void
    {
        $this->images = $images;
    }

    public function setDateCreation(?string $dateCreation): void
    {
        $this->dateCreation = $dateCreation;
    }

    // ---- Quelques méthodes pratiques pour manipuler les images ----

    public function ajouterImage(string $cheminImage): void
    {
        $this->images[] = $cheminImage;
    }

    public function supprimerImage(string $cheminImage): void
    {
        // array_diff enlève l'image de la liste si elle y est présente
        // array_values réindexe le tableau proprement ensuite (0, 1, 2...)
        $this->images = array_values(array_diff($this->images, [$cheminImage]));
    }

    // ---- Informations pratiques ----

    public function getPremiereImage(): string
    {
        return $this->images[0] ?? "";
    }

    public function getNombreImages(): int
    {
        return count($this->images);
    }

    public function aPlusieursImages(): bool
    {
        return $this->getNombreImages() > 1;
    }

    public function aUnLienGitlab(): bool
    {
        return !empty($this->gitlab);
    }

    // ---- Conversion vers/depuis un tableau (pour lire/écrire dans projets.json) ----

    /**
     * Transforme le projet en tableau simple, prêt pour json_encode().
     * Utilisé par le GestionnaireProjets, jamais par Projet lui-même.
     */
    public function versTableau(): array
    {
        return [
            "id" => $this->id,
            "titre" => $this->titre,
            "description" => $this->description,
            "technologies" => $this->technologies,
            "gitlab" => $this->gitlab,
            "images" => $this->images,
            "dateCreation" => $this->dateCreation
        ];
    }

    /**
     * Crée un objet Projet à partir d'un tableau (typiquement une entrée
     * lue depuis projets.json avec json_decode).
     *
     * Gère aussi les anciens projets qui avaient juste "image" (singulier)
     * au lieu de "images" (tableau), et ceux qui n'ont pas encore d'id,
     * pour ne rien casser sur les projets déjà enregistrés.
     */
    public static function depuisTableau(array $donnees): Projet
    {
        $images = [];

        if (!empty($donnees["images"]) && is_array($donnees["images"])) {
            $images = $donnees["images"];
        } elseif (!empty($donnees["image"])) {
            $images = [$donnees["image"]];
        }

        return new Projet(
            $donnees["id"] ?? null,
            $donnees["titre"] ?? "",
            $donnees["description"] ?? "",
            $donnees["technologies"] ?? [],
            $donnees["gitlab"] ?? "",
            $images,
            $donnees["dateCreation"] ?? null
        );
    }

    // ---- Affichage texte du projet ----

    /**
     * Permet de faire echo $projet; ou de convertir le projet en chaîne.
     * Pratique surtout pour déboguer.
     */
    public function __toString(): string
    {
        $technologies = empty($this->technologies)
            ? "aucune"
            : implode(", ", $this->technologies);

        $gitlab = $this->aUnLienGitlab()
            ? $this->gitlab
            : "aucun";

        $images = empty($this->images)
            ? "aucune"
            : implode(", ", $this->images);

        return "Projet #" . ($this->id ?? "sans id") . "\n"
            . "Titre : " . $this->titre . "\n"
            . "Description : " . $this->description . "\n"
            . "Technologies : " . $technologies . "\n"
            . "GitLab : " . $gitlab . "\n"
            . "Images : " . $images . "\n"
            . "Date de création : " . ($this->dateCreation ?? "aucune");
    }
}