# Product Requirements Document (PRD)
## Application d'Entraînement à la Reconnaissance de Patterns — Marché Pair/Impair (Bet360)

---

### 1. Vision & Objectifs Produit
* **Résumé :** Application spécialisée d'entraînement visuel et décisionnel destinée à un trader sportif expérimenté opérant sur le marché **Score Total Pair / Impair** au football, à partir de l'observation des variations de cotes **Bet360**.
* **Problème résolu :** La reconnaissance des micro-variations de cotes autour des fenêtres clés nécessite une mémorisation visuelle rapide et une discipline de mise stricte. L'application permet d'empiler des séquences de captures d'écran de matchs passés pour s'entraîner en conditions réelles (à l'aveugle) et calibrer ses décisions de mise.
* **Cible utilisateur :** Praticien aguerri maîtrisant déjà la lecture des cotes Bet360. L'interface privilégie la **rapidité d'exécution**, la **densité d'information utile** et l'absence de friction.

---

### 2. Méthodologie Métier & Règles Fondamentales
1. **Unité d'analyse (Le Match) :**
   * Chaque entrée représente un match préalablement analysé et labellisé avec son issue réelle : **Pair** ou **Impair**.
   * Chaque match contient **1 à 4 captures d'écran / photos** maximum.
2. **Fenêtres Temporelles Cibles :**
   * Les captures s'articulent prioritairement autour de **4 repères clés** : **Minute 1'**, **Minute 2'**, **Minute 22'** et **Minute 23'** (avec flexibilité pour ajuster la minute exacte ou l'ordre d'empilement).
3. **Empilement (Stacking) :**
   * *Empilement intra-match :* Superposition/navigation rapide entre les 1 à 4 captures d'un même match pour percevoir la dynamique de variation entre le début de match (1'–2') et la fin du premier quart de match (22'–23').
   * *Empilement inter-matchs :* Constitution d'une pile ordonnée et filtrable de fiches de matchs formant la base d'entraînement.
4. **Règles de Rentabilité & Gestion de Mise (Bankroll Management) :**
   * **Seuil de cote :** $C \ge 1,60$ (probabilité implicite $p_{\text{imp}} = \frac{1}{C} \le 62,5\,$%).
   * **Seuil de confiance :** $p > 65\,$%.
   * **Espérance mathématique (EV) :** $\text{EV} = (p \times C) - 1$. Une prise de position n'est validée stratégiquement que si $\text{EV} > 0$, $C \ge 1,60$ et $p > 65\,$%.
   * **Discipline de mise :** Mise de base calibrée (ex. $1\,$% à $2\,$% de la bankroll), option Kelly fractionné plafonné (ex. $0,25\times$ avec plafond strict), et interdiction des stratégies de rattrapage (*martingale / tilt*).

---

### 3. Périmètre Fonctionnel (Features)

#### F1 — Ingestion & Empilement de Matchs
* **Création rapide de fiche :** Import par glisser-déposer ou sélection de **1 à 4 images** maximum.
* **Attribution des repères temporels :** Assignation rapide des tags `~1'`, `~2'`, `~22'`, `~23'` (ou saisie libre) et réordonnancement des slots.
* **Labellisation :** Sélection obligatoire de l'issue réelle (**Pair** ou **Impair**), saisie optionnelle de la cote de référence observée, des tags de configuration de cotes et d'une note analytique.

#### F2 — Explorateur de la Base & Gestion des Piles
* **Vue en pile / grille :** Navigation fluide dans l'ensemble des matchs enregistrés.
* **Filtrage & Tri :** Filtrer par issue (*Pair* / *Impair*), par complétude (ex. matchs complets à 4 photos), par tags de pattern ou par plage de cotes.
* **Revue Comparative :** Mode écran scindé permettant d'afficher côte à côte les séquences (1', 2', 22', 23') de deux matchs distincts (ex. un *Pair* vs un *Impair*) pour affiner la discrimination visuelle.

#### F3 — Mode Entraînement (Pattern Recognition & Décision)
* **Tirage & Masquage :** Présentation d'un match de la base (aléatoire, filtré ou par répétition espacée sur les erreurs passées) en masquant l'issue réelle et les notes.
* **Navigation dans la pile du match :** Défilement rapide entre les captures disponibles (`1'` $\rightarrow$ `2'` $\rightarrow$ `22'` $\rightarrow$ `23'`) au clavier ou à la souris, avec zoom haute netteté sur les cotes.
* **Saisie de la décision du trader :**
  1. Pronostic : **Pair** ou **Impair** (ou *Passer / No-Bet*).
  2. Cote observée / simulée ($C$) et niveau de confiance estimé ($p$ en %).
  3. Action de mise : *No-Bet*, *Mise Standard*, *Mise Renforcée Plafonnée*, ou *Mise Réduite*.
* **Révélation & Feedback immédiat :**
  * Affichage de l'issue réelle et des notes du pattern.
  * **Double évaluation :**
    * *Qualité de la décision (Processus) :* L'EV était-elle positive ? Les seuils ($C \ge 1,60$ et $p > 65\,$%) et le plafond de mise ont-ils été respectés ?
    * *Résultat (Outcome) :* Gain ou perte simulé sur la bankroll d'entraînement.

#### F4 — Tableau de Bord de Calibration & Performance
* **Suivi de la précision :** Taux de réussite global, par issue (*Pair* vs *Impair*), et par tag de pattern.
* **Calibration de confiance :** Comparaison entre la confiance annoncée (ex. tranche $65\,$%–$70\,$%, $> 70\,$%) et le taux de réussite réel constaté.
* **Suivi financier simulé :** Courbe de bankroll, ROI ($\frac{\text{Profit net}}{\text{Total misé}}$), drawdown maximal, et taux de respect de la discipline de mise (nombre de paris pris hors critères $C < 1,60$ ou $p \le 65\,$%).

---

### 4. Parcours Utilisateur Clé (Session Type)
1. **Alimentation :** Le trader importe les 4 captures (`1'`, `2'`, `22'`, `23'`) de ses matchs analysés de la journée, coche *Pair* ou *Impair*, ajoute un tag rapide et sauvegarde.
2. **Entraînement :** Il lance une session de 20 matchs. Pour chaque match, il parcourt les 4 photos avec les flèches du clavier, évalue le pattern, vérifie si la cote est $\ge 1,60$ et sa confiance $> 65\,$%, valide sa mise, et reçoit immédiatement son feedback technique et stratégique.
3. **Ajustement :** En fin de session, il consulte les matchs où sa décision était sous-optimale ou son intuition erronée, et les compare côte à côte via la vue comparative.

---

### 5. Exigences Non-Fonctionnelles
* **Réactivité :** Transition instantanée (< 50 ms) entre les 4 captures d'un match pour préserver la mémoire visuelle immédiate.
* **Confidentialité & Autonomie :** Fonctionnement 100 % local-first (aucune dépendance serveur obligatoire, données et images stockées localement avec export/import de sauvegarde).
* **Ergonomie Clavier :** Raccourcis dédiés pour naviguer entre les 4 captures (`1`–`4` ou flèches), choisir `Pair` / `Impair` / `Passer`, et valider.