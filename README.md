# Configuration
- Use "npm install" to insall node_modules
- Setup a .env file following the env.example model
- Launch the server with autoreload thanks to "nodemon app.js"

# API Endpoints
- [x] || Récupérer l'id d'une personne par son email
- [x] || Récupérer l'id d'une personne par son nom + prénom
- [x] || Récupérer le diplome le plus récent d’une personne selon son user_id (toutes les colonnes possibles)
- [x] || Récupérer tous les diplômes selon un user_id (toutes les colonnes possibles)
- [x] | Récupérer le diplôme en format pdf d'une personne par son id
- [x] ||| Récupérer l'id des diplômes d'une personne selon son user_id
- [x] | Récupérer les dates de validité du dernier diplôme de l'utilisateur avec un id
- [x] | Récupérer les statistiques sur un lot de personnes faisant parti d'un lot (statistiques non nominatives pour avoir le taux de réussite, le score moyen etc…)
- [x] | Pouvoir enregistrer un étudiant
- [x] | Pouvoir enregistrer un passage d’examen avec le score etc… (Pour les centres de test qui font passé l'examen et veulent enregistrer le résultat)

- [ ] Rediger la documentation et la designer
- [x] Améliorer certains endpoints en rajoutant la date de fin de validité
- [ ] Ajuster l'api endpoint recherche par nom/prénom pour retourner pas que un seul résultat mais tous
- [ ] Remplir la base de données de prod pour que ça ai l'air réel


# Ressources
- https://docs.google.com/document/d/1P7g4KkrWEUD1h3jQ-QTtkIfeyPnkA5b_hE68d3I6HnU/edit