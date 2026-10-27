/**
 * Store & Data Layer - MF Clean Pressing Pro
 * Gère le stockage local persistant (localStorage), les calculs financiers,
 * et fournit les données initiales conformes au cahier des charges.
 */

const STORAGE_KEY = 'mfclean_pressing_data_v1';

const DEFAULT_TARIFS = [
  { id: 't_sec', nom: 'Nettoyage à sec', unite: 'kilo', prix: 600, icone: 'sparkles' },
  { id: 't_lav_rep', nom: 'Lavage et repassage', unite: 'kilo', prix: 800, icone: 'washing-machine' },
  { id: 't_couette', nom: 'Couette', unite: 'piece', prix: 2000, icone: 'bed' },
  { id: 't_costume', nom: 'Costume', unite: 'piece', prix: 2000, icone: 'briefcase' },
  { id: 't_rideaux', nom: 'Rideaux', unite: 'piece', prix: 2000, icone: 'layers' },
  { id: 't_madje', nom: 'Madje', unite: 'piece', prix: 2000, icone: 'shirt' },
  { id: 't_boubou', nom: 'Grand boubou', unite: 'piece', prix: 2500, icone: 'crown' },
  { id: 't_serviette', nom: 'Serviette blanche', unite: 'piece', prix: 500, icone: 'sun' },
  { id: 't_draps', nom: 'Draps', unite: 'piece', prix: 1000, icone: 'sheet' },
];

const DEFAULT_CLIENTS = [
  { id: 'c1', nom: 'Awa Diop', telephone: '+221 77 450 12 34', quartier: 'Mermoz', vip: true, totalDepense: 68500, nbCommandes: 9, derniereCommande: '2026-10-24' },
  { id: 'c2', nom: 'Modou Fall', telephone: '+221 78 120 45 67', quartier: 'Almadies', vip: true, totalDepense: 54000, nbCommandes: 6, derniereCommande: '2026-10-26' },
  { id: 'c3', nom: 'Fatou Seck', telephone: '+221 76 890 23 45', quartier: 'Plateau', vip: false, totalDepense: 22000, nbCommandes: 3, derniereCommande: '2026-09-18' }, // > 30 jours -> A relancer !
  { id: 'c4', nom: 'Ibrahima Ndiaye', telephone: '+221 70 334 55 66', quartier: 'Parcelles Assainies', vip: false, totalDepense: 18500, nbCommandes: 2, derniereCommande: '2026-10-20' },
  { id: 'c5', nom: 'Ousmane Sow', telephone: '+221 77 665 44 33', quartier: 'Médina', vip: false, totalDepense: 35000, nbCommandes: 4, derniereCommande: '2026-09-10' }, // > 30 jours -> A relancer !
  { id: 'c6', nom: 'Mariama Bâ', telephone: '+221 77 901 88 77', quartier: 'Sacré-Cœur', vip: true, totalDepense: 89000, nbCommandes: 12, derniereCommande: '2026-10-27' },
];

// Helper pour générer des dates relatives
function getRelativeDateStr(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

const DEFAULT_COMMANDES = [
  {
    id: 'CMD-101',
    numero: 101,
    clientNom: 'Fatou Seck',
    clientTelephone: '+221 76 890 23 45',
    dateDepot: getRelativeDateStr(-3),
    dateRetraitPrevue: getRelativeDateStr(-1), // HIER -> EN RETARD !
    statut: 'en_cours', // en_cours, prete, retiree
    statutPaiement: 'impayee', // payee, impayee
    datePaiement: null,
    express: false,
    articles: [
      { serviceNom: 'Lavage et repassage', unite: 'kilo', quantite: 4, prixUnitaire: 800, totalLigne: 3200 },
      { serviceNom: 'Grand boubou', unite: 'piece', quantite: 1, prixUnitaire: 2500, totalLigne: 2500 }
    ],
    sousTotal: 5700,
    supplementExpress: 0,
    total: 5700,
    employe: 'Aminata'
  },
  {
    id: 'CMD-102',
    numero: 102,
    clientNom: 'Modou Fall',
    clientTelephone: '+221 78 120 45 67',
    dateDepot: getRelativeDateStr(-1),
    dateRetraitPrevue: getRelativeDateStr(0), // AUJOURD'HUI !
    statut: 'prete',
    statutPaiement: 'impayee', // Impayée -> bouton Encaisser
    datePaiement: null,
    express: true,
    articles: [
      { serviceNom: 'Costume', unite: 'piece', quantite: 2, prixUnitaire: 2000, totalLigne: 4000 },
      { serviceNom: 'Couette', unite: 'piece', quantite: 1, prixUnitaire: 2000, totalLigne: 2000 }
    ],
    sousTotal: 6000,
    supplementExpress: 1800, // +30%
    total: 7800,
    employe: 'Moussa'
  },
  {
    id: 'CMD-103',
    numero: 103,
    clientNom: 'Awa Diop',
    clientTelephone: '+221 77 450 12 34',
    dateDepot: getRelativeDateStr(-2),
    dateRetraitPrevue: getRelativeDateStr(1), // DEMAIN
    statut: 'en_cours',
    statutPaiement: 'payee',
    datePaiement: getRelativeDateStr(-2),
    express: false,
    articles: [
      { serviceNom: 'Lavage et repassage', unite: 'kilo', quantite: 5, prixUnitaire: 800, totalLigne: 4000 },
      { serviceNom: 'Draps', unite: 'piece', quantite: 3, prixUnitaire: 1000, totalLigne: 3000 }
    ],
    sousTotal: 7000,
    supplementExpress: 0,
    total: 7000,
    employe: 'Aminata'
  },
  {
    id: 'CMD-104',
    numero: 104,
    clientNom: 'Mariama Bâ',
    clientTelephone: '+221 77 901 88 77',
    dateDepot: getRelativeDateStr(-4),
    dateRetraitPrevue: getRelativeDateStr(-2),
    statut: 'retiree',
    statutPaiement: 'payee',
    datePaiement: getRelativeDateStr(-2),
    express: false,
    articles: [
      { serviceNom: 'Grand boubou', unite: 'piece', quantite: 2, prixUnitaire: 2500, totalLigne: 5000 },
      { serviceNom: 'Madje', unite: 'piece', quantite: 1, prixUnitaire: 2000, totalLigne: 2000 }
    ],
    sousTotal: 7000,
    supplementExpress: 0,
    total: 7000,
    employe: 'Moussa'
  },
  {
    id: 'CMD-105',
    numero: 105,
    clientNom: 'Ibrahima Ndiaye',
    clientTelephone: '+221 70 334 55 66',
    dateDepot: getRelativeDateStr(0),
    dateRetraitPrevue: getRelativeDateStr(3),
    statut: 'en_cours',
    statutPaiement: 'payee',
    datePaiement: getRelativeDateStr(0),
    express: false,
    articles: [
      { serviceNom: 'Nettoyage à sec', unite: 'kilo', quantite: 6, prixUnitaire: 600, totalLigne: 3600 },
      { serviceNom: 'Serviette blanche', unite: 'piece', quantite: 4, prixUnitaire: 500, totalLigne: 2000 }
    ],
    sousTotal: 5600,
    supplementExpress: 0,
    total: 5600,
    employe: 'Aminata'
  }
];

const DEFAULT_DEPENSES = [
  { id: 'd1', categorie: 'produits', label: 'Bidon lessive liquide & détachant', montant: 25000, date: getRelativeDateStr(-3), note: 'Achat grossiste Petersen' },
  { id: 'd2', categorie: 'electricite', label: 'Facture Senelec - Quinzaine', montant: 32000, date: getRelativeDateStr(-5), note: 'Compteur atelier Woyofal' },
  { id: 'd3', categorie: 'eau', label: 'Facture SénEau pressing', montant: 14500, date: getRelativeDateStr(-7), note: 'Consommation machines' },
  { id: 'd4', categorie: 'reparation', label: 'Entretien fer vapeur et détartrage', montant: 10000, date: getRelativeDateStr(-2), note: 'Intervention technicien Bâ' },
  { id: 'd5', categorie: 'salaires', label: 'Acompte quinzaine Aminata', montant: 20000, date: getRelativeDateStr(-6), note: 'Comptoir' },
];

const DEFAULT_STOCKS = [
  { id: 's1', nom: 'Lessive liquide pro', unite: 'Bidons 20L', quantite: 3, seuilAlerte: 2, alerte: false },
  { id: 's2', nom: 'Adoucissant vanille', unite: 'Bidons 10L', quantite: 1, seuilAlerte: 2, alerte: true }, // STOCK BAS !
  { id: 's3', nom: 'Cintres métalliques', unite: 'Unités', quantite: 210, seuilAlerte: 50, alerte: false },
  { id: 's4', nom: 'Housses plastique pressing', unite: 'Rouleaux', quantite: 2, seuilAlerte: 3, alerte: true }, // STOCK BAS !
  { id: 's5', nom: 'Étiquettes thermocollantes', unite: 'Rouleaux', quantite: 5, seuilAlerte: 2, alerte: false },
  { id: 's6', nom: 'Détachant col & poignet', unite: 'Bouteilles 1L', quantite: 4, seuilAlerte: 2, alerte: false },
];

const DEFAULT_TECHNICIENS = [
  {
    id: 'tech_1',
    nom: 'Cheikh Tidiane Bâ',
    entreprise: 'Électro Froid & Lavage Dakar',
    telephone: '+221 77 555 11 22',
    quartier: 'Almadies & Ngor, Dakar',
    zones: ['Almadies', 'Mermoz', 'Ouakam', 'Ngor', 'Yoff'],
    specialites: ['Machines industrielles pressing', 'Lave-linge frontal LG & Samsung', 'Calandres repasseuses'],
    marques: ['LG', 'Samsung', 'Primus', 'Girbau', 'Whirlpool'],
    note: 4.9,
    avisCount: 38,
    verifie: true,
    disponible: true,
    tarifIndicatif: '5 000 FCFA (Diagnostic)',
    description: 'Expert en maintenance mécanique et électronique de presses et machines à laver depuis 12 ans.',
    photo: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'tech_2',
    nom: 'Babacar Diagne',
    entreprise: 'Clinique des Machines & Moteurs',
    telephone: '+221 78 444 33 22',
    quartier: 'Parcelles Assainies, Dakar',
    zones: ['Parcelles Assainies', 'Grand Yoff', 'Pikine', 'Guédiawaye'],
    specialites: ['Lave-linge top & frontal', 'Pompes de vidange', 'Cartes électroniques'],
    marques: ['Bosch', 'Midea', 'Beko', 'Whirlpool', 'Hisense'],
    note: 4.8,
    avisCount: 52,
    verifie: true,
    disponible: true,
    tarifIndicatif: '4 000 FCFA (Déplacement + Diag)',
    description: 'Dépannage rapide à domicile et pressing. Pièces détachées d’origine garanties.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'tech_3',
    nom: 'Malick Sy',
    entreprise: 'Maintenance Express Pressing',
    telephone: '+221 70 888 99 00',
    quartier: 'Médina & Plateau, Dakar',
    zones: ['Plateau', 'Médina', 'Fann', 'Point E', 'Fann Résidence'],
    specialites: ['Séchoirs grande capacité', 'Chaudières vapeur', 'Moteurs essorage'],
    marques: ['Teka', 'Electrolux', 'Primus', 'LG Commercial'],
    note: 5.0,
    avisCount: 24,
    verifie: true,
    disponible: true,
    tarifIndicatif: '6 000 FCFA (Urgence Pressing)',
    description: 'Priorité accordée aux pannes urgentes bloquant l’activité des pressings.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  }
];

const DEFAULT_DEMANDES_DEPANNAGE = [
  {
    id: 'dep_1',
    pressingNom: 'MF Clean',
    clientTelephone: '+221 77 123 45 67',
    quartier: 'Mermoz',
    machine: 'Lave-linge frontal 18kg LG Pro',
    description: 'Erreur vidange OE au moment du rinçage. Tambour plein d’eau.',
    urgence: true,
    statut: 'en_cours',
    technicienAssigne: 'Cheikh Tidiane Bâ',
    date: getRelativeDateStr(0)
  }
];

const DEFAULT_PRESSINGS_ADMIN = [
  {
    id: 'press_1',
    nom: 'MF Clean (Pilote)',
    proprietaire: 'Mouhamed',
    telephone: '+221 77 123 45 67',
    ville: 'Dakar (Mermoz)',
    formule: 'pro', // depart, pro, multiboutique, essai
    statutAbonnement: 'actif', // actif, essai, en_retard, suspendu
    dateEcheance: getRelativeDateStr(22),
    montantMensuel: 16000,
    quotaSmsRestant: 350,
    dateInscription: '2026-10-01'
  },
  {
    id: 'press_2',
    nom: 'Pressing Teranga',
    proprietaire: 'Abdoulaye Diallo',
    telephone: '+221 77 222 33 44',
    ville: 'Dakar (Ouakam)',
    formule: 'depart',
    statutAbonnement: 'actif',
    dateEcheance: getRelativeDateStr(14),
    montantMensuel: 9000,
    quotaSmsRestant: 80,
    dateInscription: '2026-09-15'
  },
  {
    id: 'press_3',
    nom: 'Keur Ndoye Clean',
    proprietaire: 'Ndeye Ndoye',
    telephone: '+221 76 555 66 77',
    ville: 'Thiès',
    formule: 'essai',
    statutAbonnement: 'essai',
    dateEcheance: getRelativeDateStr(4), // Plus que 4 jours d'essai
    montantMensuel: 0,
    quotaSmsRestant: 30,
    dateInscription: '2026-10-18'
  },
  {
    id: 'press_4',
    nom: 'Étoile Pressing',
    proprietaire: 'Mansour Sène',
    telephone: '+221 78 999 11 22',
    ville: 'Saint-Louis',
    formule: 'multiboutique',
    statutAbonnement: 'suspendu', // En retard de paiement
    dateEcheance: getRelativeDateStr(-3),
    montantMensuel: 25000,
    quotaSmsRestant: 0,
    dateInscription: '2026-08-20'
  }
];

class PressingStore {
  constructor() {
    this.data = this.loadData();
    this.currentRole = 'owner'; // 'owner', 'employee', 'tech', 'admin'
    this.currentPeriod = '7j'; // 'today', '7j', '28j', 'all'
    this.listeners = [];
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erreur chargement localStorage:', e);
    }

    return {
      pressing: {
        nom: 'MF Clean',
        fondateur: 'Mouhamed',
        telephone: '+221 77 123 45 67',
        adresse: 'Mermoz Pyrotechnie, Dakar',
        slogan: 'Le spécialiste du soin de votre linge au Sénégal',
        supplementExpressPct: 30,
        formuleAbonnement: 'pro',
        statutAbonnement: 'actif',
        joursEssaiRestants: 14,
        dateEcheance: getRelativeDateStr(24),
        quotaMessagesInclus: 500,
        quotaMessagesUtilises: 42
      },
      tarifs: DEFAULT_TARIFS,
      clients: DEFAULT_CLIENTS,
      commandes: DEFAULT_COMMANDES,
      depenses: DEFAULT_DEPENSES,
      stocks: DEFAULT_STOCKS,
      techniciens: DEFAULT_TECHNICIENS,
      demandesDepannage: DEFAULT_DEMANDES_DEPANNAGE,
      pressingsAdmin: DEFAULT_PRESSINGS_ADMIN,
      annonces: [
        {
          id: 'ann_1',
          titre: 'Promo Korité / Tabaski',
          texte: 'Chers clients de MF Clean, profitez de -20% sur le nettoyage de vos Grands Boubous et Costumes cette semaine ! Déposez vite votre linge.',
          date: getRelativeDateStr(-2),
          cible: 'Tous les clients',
          envoyes: 38
        }
      ]
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Erreur sauvegarde localStorage:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.data); } catch (e) { console.error(e); }
    });
  }

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = this.loadData();
    this.notify();
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.tarifs && parsed.commandes) {
        this.data = parsed;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('JSON invalide:', e);
    }
    return false;
  }

  // --- GESTION DES RÔLES ---
  setRole(role) {
    this.currentRole = role;
    this.notify();
  }

  getRole() {
    return this.currentRole;
  }

  isEmployee() {
    return this.currentRole === 'employee';
  }

  isOwner() {
    return this.currentRole === 'owner';
  }

  isTech() {
    return this.currentRole === 'tech';
  }

  isAdmin() {
    return this.currentRole === 'admin';
  }

  // --- GESTION DES COMMANDES (Section 4.2 & 5) ---
  addCommande(commandeData) {
    // Règle 5: Les tarifs sont instanciés à la création de la commande
    const newNumero = this.data.commandes.length > 0 
      ? Math.max(...this.data.commandes.map(c => c.numero || 100)) + 1 
      : 101;

    const newCmd = {
      id: 'CMD-' + newNumero,
      numero: newNumero,
      clientNom: commandeData.clientNom || 'Client Anonyme',
      clientTelephone: commandeData.clientTelephone || '',
      dateDepot: getRelativeDateStr(0),
      dateRetraitPrevue: commandeData.dateRetraitPrevue || getRelativeDateStr(2),
      statut: 'en_cours',
      statutPaiement: commandeData.statutPaiement || 'impayee',
      datePaiement: commandeData.statutPaiement === 'payee' ? getRelativeDateStr(0) : null,
      express: !!commandeData.express,
      articles: commandeData.articles || [],
      sousTotal: commandeData.sousTotal || 0,
      supplementExpress: commandeData.supplementExpress || 0,
      total: commandeData.total || 0,
      employe: commandeData.employe || (this.isEmployee() ? 'Aminata' : 'Mouhamed')
    };

    this.data.commandes.unshift(newCmd);

    // Mettre à jour ou ajouter le client
    this.updateClientFromOrder(newCmd);

    this.save();
    return newCmd;
  }

  updateCommandeStatut(id, nouveauStatut) {
    const cmd = this.data.commandes.find(c => c.id === id);
    if (cmd) {
      cmd.statut = nouveauStatut;
      this.save();
    }
  }

  encaisserCommande(id) {
    const cmd = this.data.commandes.find(c => c.id === id);
    if (cmd) {
      cmd.statutPaiement = 'payee';
      // Règle 5 : un revenu est compté à la date où la commande est payée, pas à la date de dépôt
      cmd.datePaiement = getRelativeDateStr(0);

      // Mettre à jour les stats du client
      this.updateClientFromOrder(cmd, true);
      this.save();
    }
  }

  // --- GESTION DES CLIENTS (Section 4.6) ---
  updateClientFromOrder(cmd, wasPaidNow = false) {
    if (!cmd.clientNom) return;
    let client = this.data.clients.find(c => 
      c.nom.toLowerCase() === cmd.clientNom.toLowerCase() || 
      (cmd.clientTelephone && c.telephone === cmd.clientTelephone)
    );

    if (!client) {
      client = {
        id: 'c_' + Date.now(),
        nom: cmd.clientNom,
        telephone: cmd.clientTelephone || '+221 77 000 00 00',
        quartier: 'Dakar',
        vip: false,
        totalDepense: cmd.statutPaiement === 'payee' ? cmd.total : 0,
        nbCommandes: 1,
        derniereCommande: getRelativeDateStr(0)
      };
      this.data.clients.push(client);
    } else {
      client.derniereCommande = getRelativeDateStr(0);
      if (cmd.clientTelephone) client.telephone = cmd.clientTelephone;
      if (!wasPaidNow) client.nbCommandes = (client.nbCommandes || 0) + 1;
      if (cmd.statutPaiement === 'payee') {
        client.totalDepense = (client.totalDepense || 0) + (wasPaidNow ? cmd.total : cmd.total);
      }
      if (client.totalDepense > 50000 || client.nbCommandes >= 5) {
        client.vip = true;
      }
    }
  }

  getClientStatus(client) {
    if (!client.derniereCommande) return 'normal';
    const last = new Date(client.derniereCommande);
    const today = new Date();
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    return diffDays > 30 ? 'a_relancer' : 'actif';
  }

  // --- GESTION DES ALERTES & RETRAITS (Section 4.5) ---
  getOrderAlertInfo(cmd) {
    const todayStr = getRelativeDateStr(0);
    const prevue = cmd.dateRetraitPrevue;

    if (cmd.statut === 'retiree') {
      return { code: 'retiree', label: 'Retirée', badgeClass: 'bg-slate-700 text-slate-300' };
    }

    if (prevue < todayStr) {
      return { 
        code: 'en_retard', 
        label: 'En retard', 
        badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse font-bold',
        isLate: true
      };
    } else if (prevue === todayStr) {
      return { 
        code: 'aujourdhui', 
        label: 'Aujourd\'hui', 
        badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold',
        isToday: true 
      };
    } else {
      const d1 = new Date(todayStr);
      const d2 = new Date(prevue);
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        return { code: 'demain', label: 'Demain', badgeClass: 'bg-blue-500/20 text-blue-400' };
      } else {
        return { code: 'plus_tard', label: `Dans ${diffDays} jours`, badgeClass: 'bg-slate-800 text-slate-400' };
      }
    }
  }

  getAlertCounts() {
    let enRetard = 0;
    let aujourdhui = 0;
    let stockBas = 0;

    this.data.commandes.forEach(c => {
      if (c.statut !== 'retiree') {
        const info = this.getOrderAlertInfo(c);
        if (info.isLate) enRetard++;
        if (info.isToday) aujourdhui++;
      }
    });

    this.data.stocks.forEach(s => {
      if (s.quantite <= s.seuilAlerte) stockBas++;
    });

    return { enRetard, aujourdhui, stockBas, totalCritique: enRetard + aujourdhui };
  }

  // --- GESTION DES TARIFS (Section 4.3) ---
  updateTarif(id, { nom, unite, prix }) {
    const t = this.data.tarifs.find(item => item.id === id);
    if (t) {
      t.nom = nom;
      t.unite = unite;
      t.prix = Number(prix);
      this.save();
    }
  }

  addTarif({ nom, unite, prix }) {
    const newTarif = {
      id: 't_' + Date.now(),
      nom,
      unite,
      prix: Number(prix),
      icone: unite === 'kilo' ? 'washing-machine' : 'shirt'
    };
    this.data.tarifs.push(newTarif);
    this.save();
    return newTarif;
  }

  deleteTarif(id) {
    this.data.tarifs = this.data.tarifs.filter(t => t.id !== id);
    this.save();
  }

  updateSupplementExpress(pct) {
    this.data.pressing.supplementExpressPct = Number(pct);
    this.save();
  }

  // --- GESTION DES DÉPENSES (Section 4.7) ---
  addDepense({ categorie, label, montant, note, date }) {
    const dep = {
      id: 'd_' + Date.now(),
      categorie,
      label,
      montant: Number(montant),
      note: note || '',
      date: date || getRelativeDateStr(0)
    };
    this.data.depenses.unshift(dep);
    this.save();
    return dep;
  }

  deleteDepense(id) {
    this.data.depenses = this.data.depenses.filter(d => d.id !== id);
    this.save();
  }

  // --- GESTION DU STOCK (Section 4.8) ---
  updateStockQuantity(id, delta) {
    const item = this.data.stocks.find(s => s.id === id);
    if (item) {
      item.quantite = Math.max(0, item.quantite + delta);
      item.alerte = item.quantite <= item.seuilAlerte;
      this.save();
    }
  }

  addStockItem({ nom, unite, quantite, seuilAlerte }) {
    const q = Number(quantite);
    const s = Number(seuilAlerte);
    const newItem = {
      id: 's_' + Date.now(),
      nom,
      unite,
      quantite: q,
      seuilAlerte: s,
      alerte: q <= s
    };
    this.data.stocks.push(newItem);
    this.save();
    return newItem;
  }

  // --- GESTION TECHNICIENS & DEPANNAGE (Section 4.10) ---
  addDemandeDepannage({ pressingNom, machine, description, urgence, quartier, clientTelephone }) {
    const newDemande = {
      id: 'dep_' + Date.now(),
      pressingNom: pressingNom || this.data.pressing.nom,
      clientTelephone: clientTelephone || this.data.pressing.telephone,
      quartier: quartier || 'Dakar',
      machine,
      description,
      urgence: !!urgence,
      statut: 'en_attente',
      date: getRelativeDateStr(0)
    };
    this.data.demandesDepannage.unshift(newDemande);
    this.save();
    return newDemande;
  }

  addTechnicien(techData) {
    const newTech = {
      id: 'tech_' + Date.now(),
      nom: techData.nom,
      entreprise: techData.entreprise || 'Dépannage Pro',
      telephone: techData.telephone,
      quartier: techData.quartier || 'Dakar',
      zones: techData.zones || ['Dakar'],
      specialites: techData.specialites || ['Lave-linge frontal & top'],
      marques: techData.marques || ['Toutes marques'],
      note: 5.0,
      avisCount: 1,
      verifie: false, // Badge vérifié après validation fondateur
      disponible: true,
      tarifIndicatif: techData.tarifIndicatif || '5 000 FCFA',
      description: techData.description || 'Technicien réparateur certifié.'
    };
    this.data.techniciens.push(newTech);
    this.save();
    return newTech;
  }

  // --- ESPACE FONDATEUR & ABONNEMENTS (Section 4.11) ---
  updatePressingAbonnement(pressingId, { statut, formule, prolongerJours }) {
    const press = this.data.pressingsAdmin.find(p => p.id === pressingId);
    if (press) {
      if (statut) press.statutAbonnement = statut;
      if (formule) press.formule = formule;
      if (prolongerJours) {
        const curDate = new Date(press.dateEcheance || new Date());
        curDate.setDate(curDate.getDate() + Number(prolongerJours));
        press.dateEcheance = curDate.toISOString().split('T')[0];
        press.statutAbonnement = 'actif';
      }
      this.save();
    }
  }

  // --- CALCULS DU TABLEAU DE BORD (Section 4.1 & 5) ---
  getDashboardStats(period = '7j') {
    const now = new Date();
    let minDateStr = '';

    if (period === 'today') {
      minDateStr = getRelativeDateStr(0);
    } else if (period === '7j') {
      minDateStr = getRelativeDateStr(-7);
    } else if (period === '28j') {
      minDateStr = getRelativeDateStr(-28);
    } else {
      minDateStr = '2000-01-01'; // all
    }

    // Règle 5: Un revenu est compté à la date où la commande est payée !
    const commandesPayees = this.data.commandes.filter(c => 
      c.statutPaiement === 'payee' && 
      c.datePaiement && 
      c.datePaiement >= minDateStr
    );

    const totalRevenus = commandesPayees.reduce((sum, c) => sum + (c.total || 0), 0);

    // Dépenses de la période
    const depensesPeriode = this.data.depenses.filter(d => d.date >= minDateStr);
    const totalDepenses = depensesPeriode.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Règle 5: Le bénéfice est égal aux revenus moins les dépenses de la période
    const beneficeNet = totalRevenus - totalDepenses;
    const margePct = totalRevenus > 0 ? Math.round((beneficeNet / totalRevenus) * 100) : 0;

    // Commandes globales créées dans la période
    const commandesCreees = this.data.commandes.filter(c => c.dateDepot >= minDateStr);
    const nbCommandes = commandesCreees.length;
    const panierMoyen = nbCommandes > 0 ? Math.round(totalRevenus / (commandesPayees.length || 1)) : 0;

    // Statuts actuels de toutes les commandes
    const enCours = this.data.commandes.filter(c => c.statut === 'en_cours').length;
    const pretes = this.data.commandes.filter(c => c.statut === 'prete').length;
    const impayees = this.data.commandes.filter(c => c.statutPaiement === 'impayee' && c.statut !== 'retiree').length;
    const totalImpayes = this.data.commandes
      .filter(c => c.statutPaiement === 'impayee')
      .reduce((sum, c) => sum + (c.total || 0), 0);

    // Génération données graphique (7 derniers jours)
    const chartDays = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = getRelativeDateStr(-i);
      const dLabel = new Date(dStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      
      const revJour = this.data.commandes
        .filter(c => c.statutPaiement === 'payee' && c.datePaiement === dStr)
        .reduce((sum, c) => sum + (c.total || 0), 0);

      const depJour = this.data.depenses
        .filter(d => d.date === dStr)
        .reduce((sum, d) => sum + (d.montant || 0), 0);

      chartDays.push({
        date: dStr,
        label: dLabel,
        revenus: revJour,
        depenses: depJour,
        benefice: revJour - depJour
      });
    }

    return {
      totalRevenus,
      totalDepenses,
      beneficeNet,
      margePct,
      nbCommandes,
      panierMoyen,
      enCours,
      pretes,
      impayees,
      totalImpayes,
      chartDays
    };
  }
}

// Singleton global
window.pressingStore = new PressingStore();
