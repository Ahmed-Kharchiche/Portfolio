// #region BOUTON VOIR PLUS
document.querySelectorAll('.bouton-voir-plus').forEach(bouton => {
    bouton.onclick = function () {
        const container = this.parentElement;
        const description = container.querySelector('.description-projet');

        description.classList.toggle('ouverte');

        if (description.classList.contains('ouverte')) {
            this.textContent = 'Voir moins';
        } else {
            this.textContent = 'Voir plus';
        }
    };
});
// #endregion