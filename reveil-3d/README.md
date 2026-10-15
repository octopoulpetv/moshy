# 07:00 — La machine à réveil

Court-métrage 3D procédural de 24 secondes, exécuté dans le navigateur (Vite + TypeScript + Three.js).

Une machine à réactions en chaîne autour d'un réveil numérique : à 07:00, le réveil sonne et pousse le premier domino. La chute des dominos actionne une bascule qui lance une bille orange sur le bouton SNOOZE (07:09). La bille dévale une rampe et déclenche un pendule de Newton. Le pendule fait tourner une grande roue, dont la bille ambrée rejoint un rail. Ce rail actionne un bras orange qui appuie de nouveau sur SNOOZE (07:18). Le soleil se lève enfin derrière le réveil, qui affiche « BONJOUR ».

Tout est généré par le code : géométries, matériaux, textures (canvas), lumières, animation, caméra et son. Le projet n'utilise aucun modèle 3D, image ou fichier audio externe.

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vérifie les types et produit dist/
npm run preview    # sert le build
```

Il faut Node.js 20 ou plus récent et un navigateur avec WebGL 2 (Chrome, Edge, Firefox ou Safari récents).

### Commandes

| Action | Bouton | Clavier |
|---|---|---|
| Lecture / pause | ▶ | Espace |
| Recommencer | ↺ | R |
| Se déplacer dans le film | barre de progression | ← → (image par image), Maj + ← → (1 s) |
| Son / muet | 🔊 | M |
| Plein écran | ⛶ | F |
| Masquer les commandes | 👁 | H |
| Exporter (WebM) | Exporter | — |

Une fois les commandes masquées, le film reste seul à l'écran. La barre se masque aussi toute seule pendant la lecture quand la souris ne bouge plus.

## Exporter le film

### 1. WebM depuis le navigateur (bouton « Exporter »)

- **Format** : 1920 × 1080, 30 i/s, 24 s, vidéo VP9 et son Opus.
- **Rendu déterministe** : chaque image est calculée à t = i / 30, puis encodée par WebCodecs et multiplexée avec `webm-muxer`. La durée et la fluidité sont exactes, même si l'ordinateur ne rend pas en temps réel.
- **Navigateurs** : Chrome et Edge (WebCodecs requis). Sur un navigateur non compatible, le bouton l'indique clairement.

### 2. MP4 H.264 en ligne de commande

**Prérequis** :
- **FFmpeg** dans le PATH.
- **Chrome ou Chromium** installé. Le chemin est détecté automatiquement ; sinon, définissez `CHROMIUM_PATH`.

```bash
npm run build
npm run export:mp4                                   # → reveil-machine-1080p.mp4
node scripts/export-mp4.mjs --out film.mp4           # nom de sortie
node scripts/export-mp4.mjs --from 8 --to 12         # extrait
node scripts/export-mp4.mjs --png frames/            # séquence PNG + bande-son WAV
```

Le script ouvre le film dans Chromium sans interface, puis rend chaque image à l'instant exact. Les images sont envoyées à FFmpeg : H.264, `yuv420p`, CRF 16, AAC 192 kbit/s, `+faststart`.

Avec `--png`, le script écrit la séquence d'images et la bande-son, puis affiche la commande FFmpeg à lancer :

```bash
ffmpeg -framerate 30 -start_number 0 -i "frames/frame_%05d.png" -i "frames/bande-son.wav" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart film.mp4
```

Avec une carte graphique, une image se rend en une fraction de seconde. Sans accélération matérielle (serveur, machine virtuelle), compter environ 3 à 4 s par image.

### Captures de contrôle

```bash
node scripts/capture.mjs captures/ 0.3 5.6 9.4 23.9   # PNG 1920 × 1080 aux instants donnés
```

## Architecture

```
src/
  anim/
    layout.ts      Disposition spatiale de toute la machine (une seule source de vérité)
    math.ts        Interpolations, ressorts amortis, paraboles, splines Hermite
    path.ts        Chemins Catmull-Rom centripètes paramétrés en longueur (rampe, rail)
    timeline.ts    Chorégraphie : fonctions pures du temps + instants clés (T) en cascade
    apply.ts       updateScene(machine, t) : applique l'état calculé aux objets 3D
  objects/         Construction procédurale : réveil (sept segments), dominos, bascule,
                   pendule de Newton, roue, rails, bras, outils géométriques
  scene/
    materials.ts   Matériaux PBR, textures canvas (chiffres, SNOOZE, soleil, halos)
    environment.ts Sol miroir, brume, lumières, soleil, transition nuit → matin
  camera/shots.ts  Découpage en 6 plans, trajectoires lisses, suivi des billes, mise au point
  audio/           Bande-son procédurale (Web Audio) : lecture en direct et rendu hors ligne
  export/webm.ts   Export WebM (WebCodecs + webm-muxer)
  ui/controls.ts   Interface de lecture
  film.ts          Moteur de rendu, post-traitement (profondeur de champ, bloom, MSAA)
  main.ts          Lecture temps réel + API window.__film pour les scripts
scripts/           Export MP4 et captures (Chromium sans interface)
```

### Principes

- **Temps absolu.** `updateScene(t)` recalcule tout à partir de `t` seul, sans aucun état accumulé d'une image à l'autre. Pause, retour en arrière, saut dans la timeline et export image par image donnent donc exactement la même image pour un même instant.
- **Causalité calculée.** Les instants clés s'enchaînent dans `timeline.ts` :
  - le départ de chaque domino est l'instant où le précédent le touche ;
  - la bascule part quand le dernier domino l'atteint ;
  - la roue tourne quand la sphère du pendule frappe le poussoir ;
  - et ainsi de suite.

  Changer un paramètre décale toute la suite, comme une vraie machine.
- **Pas d'interpénétration des dominos.** L'angle de chaque domino est limité par un calcul géométrique de contact avec le domino suivant (ou avec la bascule). Ils finissent donc appuyés les uns sur les autres.
- **Trajectoires crédibles** : paraboles à sommet imposé, roulement accéléré le long des rails, pendule en sinusoïde (quart de période ≈ 0,42 s) avec perte d'énergie à chaque choc, ressorts amortis pour les boutons et le bras.
- **Son synchronisé.** Les événements sonores sont dérivés des mêmes instants clés que l'animation.

### Découpage

| Temps | Plan |
|---|---|
| 0–6,4 s | Réveil 06:59 → 07:00, poussoir, chute des dominos, bascule, vol de la bille, premier SNOOZE → 07:09 |
| 6,4–9,9 s | Rampe, sphère soulevée puis relâchée, chocs du pendule (gros plan) |
| 9,9–15,2 s | Roue entraînée par le poussoir, bille portée par la jante puis sur le rail, plan large |
| 15,2–16,0 s | Gros plan : le bras orange s'abaisse et appuie sur SNOOZE |
| 16,0–17,0 s | Face au réveil : 07:09 → 07:18 |
| 17,0–24,0 s | Recul, lever du soleil (noir → orange → crème doré), retour sur le réveil, « BONJOUR » |

## Limites connues

- **Aucune vidéo de référence reçue.** Le film suit la description écrite, pas une analyse image par image d'un modèle. Le découpage est ajustable dans `camera/shots.ts` et les instants dans `anim/timeline.ts`.
- **Pas de physique simulée.** L'animation est chorégraphiée (déterministe et stable), pas simulée : les mouvements sont plausibles, pas physiquement exacts.
- **Coût du sol miroir.** Le sol réfléchissant (`Reflector`) rend la scène une seconde fois. Sur un ordinateur modeste, la lecture en direct peut sauter des images, mais elle reste synchronisée avec le son et l'export n'est pas affecté. Réglage de qualité : `QUALITY_PREVIEW` dans `src/film.ts`.
- **Bande-son originale.** Elle est générée par le code. Elle ne reproduit pas une bande-son existante.
