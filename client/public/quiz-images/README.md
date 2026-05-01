# Images du Quiz

Place ici tes images pour les questions visuelles (animaux, monuments, drapeaux, etc.).

## Comment ajouter une image à une question

1. Ajoute le fichier dans ce dossier, ex : `lion.jpg`
2. Ouvre `server/src/games/quiz/questions.js`
3. Dans la section `IMAGES_DEMO` (ou la catégorie de ton choix), ajoute :

```js
{
  q: 'Quel est cet animal ?',
  image: '/quiz-images/lion.jpg',
  a: ['Tigre', 'Lion', 'Léopard', 'Guépard'],
  c: 1,
  d: 1
}
```

Tu peux aussi mettre des URL externes (Wikimedia Commons recommandé pour le libre de droits) :
```js
image: 'https://upload.wikimedia.org/wikipedia/commons/.../photo.jpg'
```

## Recommandations

- **Format** : JPG ou PNG, max 500 ko par image
- **Dimensions** : 800x600 max, idéalement carré ou paysage
- **Sources libres** :
  - Wikimedia Commons : https://commons.wikimedia.org
  - Unsplash : https://unsplash.com (licence libre)
  - Pexels : https://pexels.com
- **Évite** les images Google Images sans vérifier la licence (souvent payant ou copyright)

## Exemples de catégories à enrichir

- 🦁 Animaux : lion, éléphant, kangourou, panda…
- 🏛️ Monuments : Tour Eiffel, Big Ben, Christ Rédempteur, Taj Mahal…
- 🇫🇷 Drapeaux : pays du monde
- 🍕 Plats : pizza, sushi, couscous…
- 🎨 Tableaux célèbres : Joconde, Cri de Munch…
