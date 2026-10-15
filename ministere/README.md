# Le Ministère

Système de promotion autonome du serveur FiveM **THE EMPIRE**. Le Ministère est la cellule
de communication de l'État du Sud : chaque jour, il décide quoi publier, écrit les contenus,
fabrique les visuels et les vidéos, puis mesure ce qui ramène vraiment des joueurs sur le Discord.

```
 Bible du lore (lore/*.md)
        │
        ▼
 ┌─────────────┐   statistiques   ┌──────────────┐
 │  STRATÈGE   │◄─────────────────│   ANALYSTE   │◄── clics /go/… + arrivées Discord
 │ (Claude)    │                  └──────────────┘    + vues saisies à la main
 └─────┬───────┘
       │ briefs (format, angle, accroche, plateformes)
       ▼
 ┌─────────────┐   ┌─────────────────────────────────────────┐
 │ RÉDACTEUR   │──►│ STUDIO : gabarits HTML → PNG (Chromium)  │
 │ (Claude)    │   │          scènes + voix off → MP4 (ffmpeg)│
 └─────────────┘   └───────────────────┬─────────────────────┘
                                       ▼
                      DASHBOARD : tu valides, tu copies, tu publies
```

## Comment ça marche, en bref

1. **Chaque matin à 6 h** (heure de Bruxelles), le **stratège** lit la phase de campagne, les
   statistiques et les contenus récents, puis décide de N contenus (par défaut 3, dont au moins un Short).
2. Le **rédacteur** écrit chaque contenu dans le ton de l'État du Sud : textes du visuel, scènes
   de la vidéo, voix off et une légende adaptée à chaque plateforme.
3. Le **studio** fabrique les médias : une image 4:5 (fil Instagram, X, Facebook), une image 9:16
   (stories) et, pour les Shorts, une vidéo verticale avec un lent zoom, des fondus, la voix off,
   la musique et une carte de fin.
4. Dans le **dashboard**, tu enregistres la voix du Gouverneur pour les Shorts, puis tu valides ou tu corriges. Ensuite, tu copies la légende, tu télécharges
   le média et tu publies toi-même. Sur Discord, un clic suffit : le bot publie à ta place.
5. L'**analyste** mesure :
   - les **clics** sur les liens courts `/go/…` (un lien par post et par plateforme, plus un lien « en bio » par plateforme) ;
   - les **arrivées sur le Discord** par plateforme : le bot crée une invitation par plateforme et
     regarde laquelle a été utilisée à chaque arrivée ;
   - les **vues et likes**, que tu saisis à la main 24-48 h après publication.

   Le stratège s'en sert le lendemain : environ 70 % des contenus suivent ce qui marche, 30 % explorent.

### Les gabarits visuels

| Gabarit | Usage |
|---|---|
| `affiche` | Affiche de propagande (rayons, sceau, slogan en capitales) |
| `communique` | Décret ou avis officiel sur papier administratif, avec tampon |
| `corpo` | Fausse publicité de Kronos, Aethernet ou Helix |
| `fiche` | Relevé de crédit civique d'un citoyen |
| `countdown` | Compte à rebours ; le « J-n » est calculé automatiquement |
| `endcard` | Carte de fin des vidéos (lien et date d'ouverture) |

Les gabarits sont dans `src/studio/templates.js` : c'est du HTML/CSS classique, modifiable comme une page web.

## Installation sur le VPS (Ubuntu / Debian)

### 1. Dépendances système

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg chromium fonts-dejavu git nginx
# Sur Ubuntu, si « chromium » n'existe pas en paquet apt :
#   sudo npx playwright install --with-deps chromium   puis CHROMIUM_PATH=chemin affiché
```

### 2. Le code

```bash
sudo useradd -r -m -d /opt/ministere ministere
sudo -u ministere git clone <url-du-repo> /opt/ministere
cd /opt/ministere/ministere
sudo -u ministere npm ci
sudo -u ministere cp .env.example .env
sudo -u ministere nano .env        # remplir les clés (voir plus bas)
```

### 3. Tester avant de brancher quoi que ce soit

```bash
sudo -u ministere node src/cli.js demo     # 3 contenus d'exemple (dont 1 vidéo), sans clé API
sudo -u ministere node src/cli.js state    # phase de campagne et J-n
```

### 4. Lancer en service permanent

```bash
sudo cp deploy/ministere.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ministere
journalctl -u ministere -f                 # suivre les logs
```

### 5. Nom de domaine + HTTPS (fortement recommandé)

Les liens trackés `/go/xxx` sont publics. Un lien du type `http://51.xx.xx.xx:3000/go/x12` fait
spam et sera filtré par les plateformes. Un petit domaine (environ 10 €/an) change tout.

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ministere   # remplacer exemple.fr
sudo ln -s /etc/nginx/sites-available/ministere /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d exemple.fr
```

Puis, dans `.env` : `PUBLIC_URL=https://exemple.fr`.

## Configuration du bot Discord

1. Va sur https://discord.com/developers/applications, puis **New Application**, puis l'onglet **Bot**.
2. Active **Server Members Intent** : c'est indispensable pour détecter les arrivées.
3. Copie le **token** dans `DISCORD_BOT_TOKEN`.
4. Dans **OAuth2, URL Generator**, coche le scope `bot` et les permissions **Gérer le serveur**
   (nécessaire pour lire l'utilisation des invitations), **Créer une invitation**,
   **Envoyer des messages** et **Joindre des fichiers**. Ouvre l'URL générée et ajoute le bot à ton serveur.
5. Active le mode développeur de Discord (Paramètres, Avancés), puis fais un clic droit pour copier :
   - l'ID du serveur dans `DISCORD_GUILD_ID` ;
   - l'ID du salon d'accueil dans `DISCORD_INVITE_CHANNEL_ID` (c'est là que pointeront les invitations) ;
   - l'ID du salon d'annonces dans `DISCORD_ANNOUNCE_CHANNEL_ID`.

Au démarrage, le bot crée une invitation permanente par plateforme. Tu les retrouves dans
l'onglet **Liens & invitations** du dashboard.

## Les liens à mettre en bio

TikTok, Instagram et YouTube Shorts n'ont pas de liens cliquables dans les légendes. Mets dans la
bio de chaque compte son lien dédié (`https://ton-domaine/go/tiktok`, `/go/instagram`,
`/go/youtube`), affiché dans l'onglet **Liens & invitations**. Sur X, Facebook, Reddit et Discord,
chaque légende contient déjà son propre lien tracké.

## La bible du lore

Tous les fichiers `.md` du dossier `lore/` sont lus dans l'ordre alphabétique et donnés à Claude
comme source de vérité. Plus la bible est riche, meilleurs et plus cohérents sont les contenus.
Ajoute tes textes fondateurs sous la forme `lore/10-lois.md`, `lore/20-personnages.md`, etc.

## Commandes utiles

```bash
node src/cli.js run 3        # génère 3 contenus tout de suite (stratégie + rédaction + rendu)
node src/cli.js plan 3       # seulement les briefs
node src/cli.js render 12    # refait le rendu du post 12
node src/cli.js stats        # statistiques consolidées
```

## Coûts

- **Claude** (`claude-opus-5-5`) : environ 0,03 à 0,06 $ par contenu. Avec 3 contenus par jour,
  compte quelques dollars par mois. Le coût cumulé s'affiche dans le dashboard.
- **Rendu** : local et gratuit (Chromium + ffmpeg). Prévois au moins 2 Go de RAM pour la vidéo.
- **Voix off** : gratuite, c'est ta voix (voir ci-dessous).

## La voix du Gouverneur

Les Shorts sont narrés par le gouverneur Leopold Van-Ranke. Claude écrit son texte à la première
personne (20 à 30 secondes), et c'est toi qui le dis.

1. Dans le dashboard, chaque Short affiche un bloc **🎙 Voix du Gouverneur** avec le texte à lire.
2. Tu as deux façons d'ajouter ta voix :
   - **Enregistrer**, directement dans le navigateur (ordinateur ou téléphone). Le micro du navigateur
     ne fonctionne qu'en **HTTPS**, d'où l'intérêt du nom de domaine ;
   - **Importer un fichier** (mp3, m4a, wav, ogg, webm), par exemple une prise faite sur Audacity avec
     un bon micro, ou un mémo vocal de téléphone.
3. Le Ministère nettoie la prise automatiquement : il coupe les silences du début et de la fin, retire
   les basses parasites, compresse légèrement et met le volume au standard des réseaux (-16 LUFS).
   Il remonte ensuite la vidéo : les scènes s'allongent pour suivre ta voix.
4. Tant qu'un Short n'a pas de voix, il porte l'étiquette « voix à faire », et le dashboard te demande
   confirmation si tu le valides quand même.

Conseils de prise : une pièce sans écho (une pièce avec des rideaux ou des vêtements absorbe le son),
le micro à une quinzaine de centimètres, et un ton posé et lent. Le Gouverneur ne se presse jamais.

En secours, `TTS_PROVIDER=piper` ou `elevenlabs` génère une voix de synthèse pour les Shorts que tu
n'as pas enregistrés. Ta prise reste toujours prioritaire.
