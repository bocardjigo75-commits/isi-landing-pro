# MF Clean - Pressing Pro (Sénégal) 🧺🇸🇳

Application professionnelle de gestion de pressing conçue sur mesure pour les réalités du marché sénégalais (Dakar et régions).
Conforme à 100% au **Cahier des charges version 1.0** rédigé par Mouhamed (fondateur de MF Clean).

---

## 🚀 Fonctionnalités Implémentées selon le Cahier des charges

### 1. Tableau de bord du Propriétaire (Section 4.1 & 5)
- **Bénéfice Net de la période en grand**, calculé selon la **Règle 5** : *Revenus encaissés − Dépenses réelles*.
- **Taux de marge (%)** calculé et affiché en direct.
- **Filtres de période temporelle** : *Aujourd'hui*, *7 derniers jours*, *28 derniers jours*, *Tout*.
- **Indicateurs clés (KPI)** : Revenus encaissés, Dépenses totales, Nombre de commandes, Panier moyen.
- **Compteurs d'activité atelier** : Commandes En cours, Prêtes au comptoir, Impayées (avec montant des impayés).
- **Graphique interactif** fluide comparant les Revenus vs Dépenses sur les 7 derniers jours (Canvas 2D léger).

### 2. Gestion des Commandes & Statuts (Section 4.2 & 5)
- **Création rapide (< 1 minute)** avec sélection tactile géante ou dictée vocale.
- **Date de retrait convenue** : Boutons rapides *Aujourd'hui*, *Demain*, *Dans 2 jours*, *Dans 3 jours*, *Dans 5 jours*.
- **Cycle de statuts atelier** : `En cours` ➔ `Prête` ➔ `Retirée`.
- **Règlement financier** : Payée ou Impayée, avec **bouton d'encaissement direct** au comptoir (met à jour le chiffre d'affaires du jour selon la règle 5).
- **Option Express** : Supplément automatique en pourcentage (+30% paramétrable).

### 3. Tarifs Configurables de MF Clean (Section 4.3 & Annexe)
- Services préconfigurés selon l'annexe du cahier des charges :
  1. *Nettoyage à sec* : 600 FCFA / kilo
  2. *Lavage et repassage* : 800 FCFA / kilo
  3. *Couette* : 2 000 FCFA / pièce
  4. *Costume* : 2 000 FCFA / pièce
  5. *Rideaux* : 2 000 FCFA / pièce
  6. *Madje* : 2 000 FCFA / pièce
  7. *Grand boubou* : 2 500 FCFA / pièce
  8. *Serviette blanche* : 500 FCFA / pièce
  9. *Draps* : 1 000 FCFA / pièce
- Modification, ajout et suppression des tarifs sans altérer les factures déjà émises.

### 4. Assistant Vocal Bilingue Wolof & Français (Section 4.4)
- **Web Speech API** intégrée avec écoute continue ou par impulsion.
- **Moteur NLU spécialisé** comprenant le français, le wolof et le mélange franco-wolof :
  - Nombres wolof : *bénn* (1), *ñaar* (2), *ñett* (3), *ñent* (4), *juróom* (5), *fukk* (10)...
  - Prestations wolof : *fóot ak paase*, *raas*, *kustim*, *mbubu / boubou*, *kóor / madje*, *kilo*, *express / gaaw*...
  - Extraction automatique du nom client, des quantités, calcul du total et pré-remplissage du bon de commande.

### 5. Alertes Retraits & Priorités (Section 4.5)
- **Bannière d'alerte visible en haut de l'écran** dès qu'une commande est à rendre aujourd'hui ou en retard.
- **Libellés clairs** : `En retard` (rouge clignotant), `Aujourd'hui` (orange), `Demain`, `Dans X jours`.
- **Badges de priorité** : `⚡ Express`, `⭐ VIP`.
- **Synthétiseur audio** pour notifier les employés de l'atelier lors des échéances.

### 6. Clients & Relances Automatiques (Section 4.6)
- Classement des meilleurs clients par montant dépensé et nombre de commandes.
- **Détection des clients inactifs (> 30 jours)** avec le badge **"À relancer"**.
- Bouton WhatsApp direct pour envoyer un message personnalisé de reprise de contact.

### 7. Dépenses d'Exploitation (Section 4.7)
- Catégories réelles : Produits / Lessive, Senelec (électricité), SénEau (eau), Salaires, Loyer, Réparation machines.
- Déduction immédiate sur le bénéfice net du pressing.

### 8. Gestion des Stocks (Section 4.8)
- Lessive liquide, adoucissant, cintres métalliques, housses plastiques, étiquettes thermocollantes.
- Boutons tactiles rapides `+1`, `−1`, `+5`.
- Alerte visuelle **Stock bas** dès que la quantité passe sous le seuil critique.

### 9. Annonces & Promotions (Section 4.9)
- Modèles prêts à l'emploi : *Promo Korité / Tabaski*, *Offre de saison Couettes & Rideaux*.
- Envoi groupé aux clients par WhatsApp en 1 clic.

### 10. Module Techniciens : Réparation des Machines à Laver (Section 4.10)
- **Annuaire vérifié** des réparateurs à Dakar (spécialités marques LG, Samsung, machines industrielles Primus, calandres...).
- **Signalement de panne** avec **Mode Urgence Pressing** (alerte immédiate WhatsApp au dépanneur).
- Coordonnées directes par appel ou WhatsApp.

### 11. Abonnements & Espace Fondateur Super Admin (Section 4.11 & 8)
- Formules : *Essai (14 jours)*, *Départ (9 000 FCFA)*, *Pro (16 000 FCFA)*, *Multi-boutique (25 000 FCFA)*.
- Tableau de bord Super Admin pour le fondateur :
  - Liste de tous les pressings inscrits.
  - Validation manuelle des paiements **Wave / Orange Money**.
  - Prolongation (+30 jours) ou suspension d'un pressing.

### 12. Gestion des Rôles & Sécurité (Section 2, 5 & 6)
- **Propriétaire (Mouhamed)** : Contrôle absolu sur l'ensemble des données et finances.
- **Employé (Aminata / Moussa)** : **Masquage strict** des chiffres financiers (revenus, dépenses, bénéfice). Accès rapide au comptoir et à l'atelier.
- **Technicien** : Consultation des interventions et profil.
- **Fondateur** : Administration globale de la plateforme SaaS.

---

## 📱 Utilisation Locale et Installation PWA

L'application est 100% autonome et ne nécessite aucun serveur lourd.

1. **Ouvrir simplement `index.html`** dans n'importe quel navigateur moderne (Google Chrome, Microsoft Edge, Safari, Firefox).
2. **Sur Téléphone (Android / iPhone)** :
   - Ouvrez l'application dans Chrome ou Safari.
   - Touchez le menu du navigateur et sélectionnez **"Ajouter à l'écran d'accueil"** (ou "Installer l'application").
   - L'application s'ouvre comme une vraie application native sans barre d'adresse, en plein écran, avec fonctionnement hors-ligne (Offline-first via Service Worker).
3. **Sur Ordinateur** :
   - Cliquez sur l'icône d'installation dans la barre d'adresse pour l'installer comme logiciel de bureau.

