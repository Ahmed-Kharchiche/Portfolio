<?php
$titre_page = "Contact";
$page_css = "contact.css";

include 'includes/header.php';
?>

    <main class="contact">

        <section class="contact-intro">
            <h1>ME CONTACTER</h1>
            <div class="ligne-titre"></div>

            <p>
                Une question, une proposition de stage ou simplement envie
                d'échanger ? N'hésitez pas à me contacter.
            </p>
        </section>

        <section class="contact-contenu">

            <div class="contact-infos">

                <div class="contact-bloc">
                    <h2>Email</h2>
                    <a href="mailto:kharchiche.ahmed@gmail.com">
                        kharchiche.ahmed@gmail.com
                    </a>
                </div>

                <div class="contact-bloc">
                    <h2>GitHub</h2>
                    <a href="https://github.com/Ahmed-Kharchiche" target="_blank">
                        github.com/Ahmed-Kharchiche
                    </a>
                </div>

                <div class="contact-bloc">
                    <h2>LinkedIn</h2>
                    <a href="#" target="_blank">
                        Mon profil LinkedIn
                    </a>
                </div>

                <div class="contact-bloc">
                    <h2>Localisation</h2>
                    <p>Romans-sur-Isère / Valence</p>
                </div>

            </div>

            <div class="formulaire-contact">

                <h2>Envoyer un message</h2>

                <form action="mailto:kharchiche.ahmed@gmail.com" method="post" enctype="text/plain">

                    <div class="champ">
                        <label for="nom">Nom</label>
                        <input
                            type="text"
                            id="nom"
                            name="Nom"
                            placeholder="Votre nom"
                            required
                        >
                    </div>

                    <div class="champ">
                        <label for="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="Email"
                            placeholder="votre@email.com"
                            required
                        >
                    </div>

                    <div class="champ">
                        <label for="sujet">Sujet</label>
                        <input
                            type="text"
                            id="sujet"
                            name="Sujet"
                            placeholder="Sujet du message"
                            required
                        >
                    </div>

                    <div class="champ">
                        <label for="message">Message</label>
                        <textarea
                            id="message"
                            name="Message"
                            rows="6"
                            placeholder="Votre message..."
                            required
                        ></textarea>
                    </div>

                    <button type="submit">Envoyer le message</button>

                </form>

            </div>

        </section>

    </main>

<?php include 'includes/footer.php'; ?>