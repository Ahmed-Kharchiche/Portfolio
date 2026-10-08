<?php
declare(strict_types=1);

/**
 * Un avis laissé par un visiteur sur le portfolio.
 */
final class Avis
{
    public const NOTE_MIN = 1;
    public const NOTE_MAX = 5;

    public function __construct(
        private string $id,
        private string $nom,
        private int $note,
        private string $message,
        private string $date,
        private bool $publie = false,
    ) {
        // La note reste toujours entre 1 et 5, même si le JSON a été modifié à la main
        $this->note = max(self::NOTE_MIN, min(self::NOTE_MAX, $note));
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getNom(): string
    {
        return $this->nom;
    }

    public function getNote(): int
    {
        return $this->note;
    }

    public function getMessage(): string
    {
        return $this->message;
    }

    public function getDate(): string
    {
        return $this->date;
    }

    public function estPublie(): bool
    {
        return $this->publie;
    }

    /** L'id est attribué par le gestionnaire au moment de l'ajout. */
    public function setId(string $id): void
    {
        $this->id = $id;
    }

    public function setPublie(bool $publie): void
    {
        $this->publie = $publie;
    }

    /**
     * @return array{id: string, nom: string, note: int, message: string, date: string, publie: bool}
     */
    public function versTableau(): array
    {
        return [
            'id'      => $this->id,
            'nom'     => $this->nom,
            'note'    => $this->note,
            'message' => $this->message,
            'date'    => $this->date,
            'publie'  => $this->publie,
        ];
    }

    /**
     * Construit un Avis à partir d'une ligne du fichier JSON.
     * Les champs manquants reçoivent une valeur par défaut au lieu de provoquer une erreur.
     */
    public static function depuisTableau(array $donnees): self
    {
        return new self(
            (string) ($donnees['id'] ?? ''),
            (string) ($donnees['nom'] ?? ''),
            (int) ($donnees['note'] ?? self::NOTE_MIN),
            (string) ($donnees['message'] ?? ''),
            (string) ($donnees['date'] ?? date('Y-m-d')),
            (bool) ($donnees['publie'] ?? false),
        );
    }
}