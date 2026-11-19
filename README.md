   # Pattern Trading Sportif — Marché Pair / Impair (Bet360)

Application web **Local-First (SPA)** d'entraînement visuel et décisionnel destinée aux traders sportifs opérant sur le marché **Score Total Pair / Impair** au football à partir de l'observation des micro-variations de cotes **Bet360**.

---

## 🎯 Fonctionnalités Développées (Conformité PRD & TRD)

### 1. Ingestion & Empilement de Matchs (F1 — `MatchUploader` & `ImageCropperModal`)
* **Multi-sélection & Import simultané :** Déposez ou sélectionnez jusqu'à 4 photos à la fois en un seul clic. Assignation instantanée aux slots 1', 2', 22', 23'.
* **Outil de Rognage Interactif :** Rognez la zone des cotes au moment de l'ingestion (ou plus tard en modification) pour éliminer les barres d'état Android / navigateurs.
* **Rétablir la Forme Complète :** Rétablissez à tout moment la photo originale intégrale à 100% en un clic grâce à la conservation native de la source.
* **Repères temporels clés :** Slots `~1'`, `~2'`, `~22'`, `~23'` réordonnables.

### 2. Mode Entraînement & Plein Écran Haute Définition (F3 — `SnapshotViewer` & `DecisionPanel`)
* **Mode Plein Écran (Fullscreen) :** Agrandissez la capture sur tout l'écran avec bouton plein écran ou raccourci pour scruter les micro-variations de cotes avec un zoom jusqu'à 400% (molette PC ou pincement tactile).
* **Mise Libre et Non Préfixée :** Le pourcentage de mise est **100% décidé par vous** (champ libre en % de bankroll ou en unités exactes), avec calculs en temps réel de l'EV ($p \cdot C - 1$) et de la suggestion Kelly.
* **Mode Aveugle & Double Évaluation :** Audit strict de discipline + PnL répercuté sur la bankroll.

### 3. Synchronisation Directe Téléphone Android ⇆ PC Localhost
* **Localhost Partagé sur Wi-Fi :** Le PC fait office de serveur hôte (`http://localhost:5173/`) et expose le réseau local (`http://192.168.1.68:5173/`).
* **Bouton Direct « Synchro » :**
  - Sur smartphone : appuyez sur **« Synchro PC »** pour envoyer instantanément vos matchs et photos créés sur le téléphone vers le disque dur de votre PC hôte.
  - Sur PC : appuyez sur **« Synchro Tél »** pour récupérer les données créées sur le smartphone sans câble ni connexion Internet obligatoire.
* **QR Code de Connexion Mobile :** Icône smartphone dans le header pour scanner le lien et ouvrir l'application en 2 secondes sur Android.

### 4. Tableau de Bord de Calibration & Performance (F4 — `CalibrationDashboard`)
* **Courbe d'évolution de la bankroll :** Graphique vectoriel dynamique avec historique des gains et calcul du **Max Drawdown**.
* **Métriques clés :** Taux de réussite global, par issue (Pair vs Impair), ROI net (%), et Taux de respect de la discipline de trading.
* **Table de Calibration de Confiance :** Comparaison de la confiance déclarée (par tranches : 50-60%, 61-65%, 66-70%, 71-75%, 76-80%, >80%) avec le taux de succès réel pour détecter les biais d'overconfidence ou d'underconfidence.
* **Performance par Tag :** Taux de gain par configuration de cotes observée.

### 5. Hub de Données & Exportations 1-Clic (F5 — `DataExportHub`)
* **Bouton Direct "Tout Exporter" dans le Header :** Téléchargement instantané d'une archive `.zip` complète avec toutes les données et toutes les captures d'écran originales.
* **Section Dédiée "Données & Export" :**
  * Exportation d'archive `.zip` complète.
  * Exportation au format **CSV** compatible Excel / Google Sheets (colonnes : dates, cotes, confiance, EV, PnL, discipline).
  * Exportation des métadonnées brutes en **JSON**.
  * Restauration d'archive `.zip` en un clic.
  * Statistiques de stockage local (nombre de fiches, nombre de photos, taille totale en Mo).
* **Mode Nuit / Mode Jour (AiScore Dark / Light) :** Bascule en un clic avec icônes Soleil / Lune et persistance automatique.
* **Design "Minimaliste Complexe" inspiré d'AiScore :** Typographie haute densité, chiffres tabulaires monospaces, touches fluorescentes bleu électrique / cyan / vert / orange, bordures ultra-fines et micro-animations.

---

## ⌨️ Raccourcis Clavier Globaux (Zéro Latence)

| Raccourci | Action |
| :--- | :--- |
| `1`, `2`, `3`, `4` | Basculer instantanément sur les captures 1', 2', 22', 23' |
| `←` / `→` (Flèches) | Capture précédente / suivante dans le match |
| `P` | Sélectionner **PAIR** |
| `I` | Sélectionner **IMPAIR** |
| `N` | Sélectionner **PASSER (NO-BET)** |
| `Entrée` | Valider la décision / Passer au match suivant |

---

## 🚀 Démarrage Rapide en Localhost

### Option 1 : Double-clic direct (Windows)
Double-cliquez simplement sur le fichier :
👉 **`lancer-application.bat`** (ouvre votre navigateur sur `http://localhost:5173/`).

### Option 2 : En ligne de commande
```powershell
$env:PATH = "C:\Users\admin\nodejs;$env:PATH"
npm run dev
```
L'application s'ouvre sur : **http://localhost:5173/**

### Publication en ligne avec GitHub Pages

1. Créez un dépôt GitHub public nommé `pattern-trading-sportif` et ajoutez-y les fichiers du projet (sans `data/`, `dist/` ni `node_modules/`).
2. Dans le dépôt, ouvrez **Settings → Pages** et sélectionnez **GitHub Actions** comme source de publication.
3. Envoyez les fichiers sur la branche `main`. Le workflow `.github/workflows/deploy.yml` construit et publie automatiquement l’application.
4. L’adresse sera `https://mohamednourroudine07-sketch.github.io/pattern-trading-sportif/`.

Les données restent enregistrées séparément dans le navigateur de chaque appareil. Pour installer l’application, ouvrez cette adresse sur Android avec Chrome, puis choisissez **⋮ → Installer l’application**. Sur Windows, utilisez l’icône d’installation dans la barre d’adresse de Chrome ou Edge.

### Compilation de production
```powershell
$env:PATH = "C:\Users\admin\nodejs;$env:PATH"
npm run build
```
Les fichiers statiques prêts pour le déploiement sont générés dans le dossier `dist/`.
