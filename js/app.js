/**
 * Application Controller & UI Logic - MF Clean Pressing Pro
 * Orchestre les vues, les interactions tactiles, le canvas graphique,
 * l'assistant vocal bilingue et les règles métier du cahier des charges.
 */

// Fonction utilitaire d'échappement XSS pour toutes les interpolations DOM
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

class PressingAppUI {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentSubTab = 'tarifs';
    this.currentFilter = 'all';
    this.activePeriod = '7j';

    // État du panier de création de commande
    this.cart = {
      clientNom: '',
      clientTelephone: '',
      dateRetraitOffset: 2, // 'Dans 2 jours' par défaut
      express: false,
      statutPaiement: 'payee', // 'payee' ou 'impayee'
      items: {} // serviceId -> { service, quantite }
    };

    this.audioContext = null;
    this.init();
  }

  init() {
    // Écouter les changements dans le store
    window.pressingStore.subscribe(() => {
      this.refreshAll();
    });

    // Initialiser les écouteurs vocaux
    this.setupVoiceListeners();

    // Rendu initial
    this.refreshAll();
  }

  // --- AUDIO SYNTHETIZER (Web Audio API) ---
  playSound(type) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      if (type === 'success') {
        // Carillon doux de validation
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'alert') {
        // Double bip d'urgence
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Audio non disponible:', e);
    }
  }

  // --- REFRESH GLOBAL DE L'INTERFACE ---
  refreshAll() {
    this.updateHeaderAndAlerts();
    this.renderDashboard();
    this.renderCaisse();
    this.renderOrders();
    this.renderClients();
    this.renderTechniciens();
    this.renderSubViews();
    this.updateRoleDisplay();

    // Recharger les icônes Lucide
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // --- GESTION DU HEADER & BANNIÈRE D'ALERTE (Section 4.5) ---
  updateHeaderAndAlerts() {
    const alerts = window.pressingStore.getAlertCounts();
    const alertBanner = document.getElementById('top-alert-banner');
    const alertText = document.getElementById('top-alert-text');
    const alertBadge = document.getElementById('header-alert-badge');
    const navDot = document.getElementById('nav-alert-dot');
    const urgencesFilterCount = document.getElementById('count-filter-urgences');

    if (urgencesFilterCount) {
      urgencesFilterCount.textContent = alerts.totalCritique;
    }

    if (alerts.totalCritique > 0) {
      if (alertBanner) {
        alertBanner.classList.remove('hidden');
        let details = [];
        if (alerts.enRetard > 0) details.push(`🚨 ${alerts.enRetard} commande(s) EN RETARD`);
        if (alerts.aujourdhui > 0) details.push(`⏰ ${alerts.aujourdhui} commande(s) à rendre AUJOURD'HUI`);
        if (alerts.stockBas > 0) details.push(`📦 ${alerts.stockBas} produit(s) en stock bas`);
        alertText.textContent = details.join(' | ');
      }
      if (alertBadge) {
        alertBadge.classList.remove('hidden');
        alertBadge.textContent = alerts.totalCritique;
      }
      if (navDot) navDot.classList.remove('hidden');
    } else {
      if (alertBanner) alertBanner.classList.add('hidden');
      if (alertBadge) alertBadge.classList.add('hidden');
      if (navDot) navDot.classList.add('hidden');
    }
  }

  // --- NAVIGATION ENTRE ONGLETS ---
  switchTab(tabId, filter = null) {
    this.currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    // Mise à jour de la barre inférieure mobile
    document.querySelectorAll('nav button').forEach(b => {
      b.classList.remove('text-blue-400');
      b.classList.add('text-slate-400');
    });
    const activeNav = document.getElementById(`nav-btn-${tabId}`);
    if (activeNav) {
      activeNav.classList.remove('text-slate-400');
      activeNav.classList.add('text-blue-400');
    }

    if (tabId === 'commandes' && filter) {
      this.filterOrders(filter);
    }

    if (tabId === 'dashboard') {
      this.renderFinancialChart();
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  switchPlusSubTab(subTabId) {
    this.currentSubTab = subTabId;
    ['tarifs', 'depenses', 'stock', 'annonces', 'abonnement'].forEach(id => {
      const el = document.getElementById(`subview-${id}`);
      const btn = document.getElementById(`subtab-btn-${id}`);
      if (el) el.classList.toggle('hidden', id !== subTabId);
      if (btn) {
        if (id === subTabId) {
          btn.className = 'px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shrink-0';
        } else {
          btn.className = 'px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white shrink-0';
        }
      }
    });
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // --- RÔLES & DROITS D'ACCÈS (Section 2, 5 & 6) ---
  openRoleModal() {
    document.getElementById('modal-role').classList.remove('hidden');
  }

  closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  selectRole(role) {
    // Si l'utilisateur bascule vers un rôle sensible (Propriétaire ou Super Admin), demander le code PIN
    const current = window.pressingStore.getRole();
    if ((role === 'owner' || role === 'admin') && current !== role) {
      this.pendingRole = role;
      this.closeModal('modal-role');
      const pinInput = document.getElementById('input-security-pin');
      if (pinInput) pinInput.value = '';
      const pinErr = document.getElementById('pin-error-msg');
      if (pinErr) pinErr.classList.add('hidden');
      document.getElementById('modal-pin').classList.remove('hidden');
      if (pinInput) pinInput.focus();
      return;
    }

    window.pressingStore.setRole(role);
    this.closeModal('modal-role');
  }

  async confirmPINVerification() {
    const pinInput = document.getElementById('input-security-pin');
    const pin = pinInput ? pinInput.value.trim() : '';
    const pinErr = document.getElementById('pin-error-msg');

    const isValid = await window.pressingStore.verifyPIN(pin);
    if (isValid) {
      if (pinErr) pinErr.classList.add('hidden');
      this.closeModal('modal-pin');
      window.pressingStore.setRole(this.pendingRole || 'owner');
      this.pendingRole = null;
      this.playSound('success');
    } else {
      if (pinErr) pinErr.classList.remove('hidden');
      this.playSound('alert');
    }
  }

  async changeSecurityPIN() {
    const curPinInput = document.getElementById('input-pin-current');
    const newPinInput = document.getElementById('input-pin-new');
    const curPin = curPinInput ? curPinInput.value.trim() : '';
    const newPin = newPinInput ? newPinInput.value.trim() : '';

    if (!curPin || !newPin) {
      alert('Veuillez renseigner le code PIN actuel et le nouveau code PIN.');
      return;
    }
    if (newPin.length < 4) {
      alert('Le nouveau code PIN doit comporter au moins 4 caractères.');
      return;
    }

    const success = await window.pressingStore.setPIN(curPin, newPin);
    if (success) {
      alert('Code PIN de sécurité mis à jour avec succès !');
      if (curPinInput) curPinInput.value = '';
      if (newPinInput) newPinInput.value = '';
    } else {
      alert('Code PIN actuel incorrect.');
    }
  }

  updateRoleDisplay() {
    const role = window.pressingStore.getRole();
    const label = document.getElementById('header-role-label');
    const ownerContent = document.getElementById('owner-dashboard-content');
    const employeeLock = document.getElementById('employee-dashboard-lock');

    const roleNames = {
      owner: '👑 Propriétaire',
      employee: '👩‍💼 Employé (Atelier)',
      tech: '🔧 Technicien',
      admin: '⚡ Fondateur (Admin)'
    };

    if (label) label.textContent = roleNames[role] || 'Propriétaire';

    // Règle 5 & 6: Un employé ne voit pas les revenus, les dépenses ni le bénéfice
    const isEmp = role === 'employee';
    if (ownerContent && employeeLock) {
      if (isEmp) {
        ownerContent.classList.add('hidden');
        employeeLock.classList.remove('hidden');
      } else {
        ownerContent.classList.remove('hidden');
        employeeLock.classList.add('hidden');
      }
    }
  }

  // --- RENDU TABLEAU DE BORD (Section 4.1) ---
  setPeriod(period) {
    this.activePeriod = period;
    ['today', '7j', '28j', 'all'].forEach(p => {
      const btn = document.getElementById(`btn-period-${p}`);
      if (btn) {
        if (p === period) {
          btn.className = 'px-3 py-1.5 rounded-lg transition bg-blue-600 text-white font-bold shadow';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg transition text-slate-400 hover:text-white';
        }
      }
    });
    this.renderDashboard();
  }

  renderDashboard() {
    if (window.pressingStore.isEmployee()) return;

    const stats = window.pressingStore.getDashboardStats(this.activePeriod);

    // Bénéfice en grand avec la marge
    const beneficeEl = document.getElementById('dash-benefice-net');
    const margeEl = document.getElementById('dash-marge-badge');
    if (beneficeEl) {
      beneficeEl.textContent = `${stats.beneficeNet.toLocaleString('fr-FR')} FCFA`;
      beneficeEl.className = stats.beneficeNet >= 0
        ? 'text-3xl sm:text-4xl font-black text-white'
        : 'text-3xl sm:text-4xl font-black text-rose-400';
    }
    if (margeEl) {
      margeEl.textContent = `Marge : ${stats.margePct}%`;
      margeEl.className = stats.margePct >= 0
        ? 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        : 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
    }

    // KPI Cards
    const revEl = document.getElementById('dash-revenus');
    const depEl = document.getElementById('dash-depenses');
    const cmdEl = document.getElementById('dash-nb-commandes');
    const panEl = document.getElementById('dash-panier-moyen');

    if (revEl) revEl.textContent = `${stats.totalRevenus.toLocaleString('fr-FR')} FCFA`;
    if (depEl) depEl.textContent = `${stats.totalDepenses.toLocaleString('fr-FR')} FCFA`;
    if (cmdEl) cmdEl.textContent = stats.nbCommandes;
    if (panEl) panEl.textContent = `${stats.panierMoyen.toLocaleString('fr-FR')} FCFA`;

    // Compteurs atelier
    const encoursEl = document.getElementById('dash-count-en-cours');
    const pretesEl = document.getElementById('dash-count-pretes');
    const impayeesEl = document.getElementById('dash-count-impayees');
    const totalImpayesEl = document.getElementById('dash-total-impayes');

    if (encoursEl) encoursEl.textContent = stats.enCours;
    if (pretesEl) pretesEl.textContent = stats.pretes;
    if (impayeesEl) impayeesEl.textContent = stats.impayees;
    if (totalImpayesEl) totalImpayesEl.textContent = `Reste : ${stats.totalImpayes.toLocaleString('fr-FR')} FCFA`;

    this.renderFinancialChart();
  }

  // Graphique des Revenus et Dépenses (Canvas 2D fluide)
  renderFinancialChart() {
    const canvas = document.getElementById('financialChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stats = window.pressingStore.getDashboardStats('7j');
    const data = stats.chartDays || [];

    // Ajuster la résolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length === 0) return;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxVal = Math.max(
      ...data.map(d => Math.max(d.revenus, d.depenses)),
      20000
    ) * 1.15;

    // Lignes horizontales de repère
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const yVal = Math.round((maxVal / 3) * i);
      const y = padding.top + chartH - (yVal / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${(yVal / 1000).toFixed(0)}k`, padding.left - 6, y + 3);
    }

    const stepX = chartW / (data.length - 1 || 1);

    // Dessin Courbe Revenus (Émeraude)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, idx) => {
      const x = padding.left + idx * stepX;
      const y = padding.top + chartH - (d.revenus / maxVal) * chartH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dessin Courbe Dépenses (Rose)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, idx) => {
      const x = padding.left + idx * stepX;
      const y = padding.top + chartH - (d.depenses / maxVal) * chartH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points & Libellés Jours
    ctx.textAlign = 'center';
    data.forEach((d, idx) => {
      const x = padding.left + idx * stepX;
      const yRev = padding.top + chartH - (d.revenus / maxVal) * chartH;
      const yDep = padding.top + chartH - (d.depenses / maxVal) * chartH;

      // Point Vert
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x, yRev, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Point Rose
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(x, yDep, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Label X
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(d.label, x, h - 8);
    });
  }

  // --- RENDU CAISSE & SAISIE RAPIDE (Section 4.2 & 4.4) ---
  renderCaisse() {
    const tarifs = window.pressingStore.data.tarifs || [];
    const grid = document.getElementById('services-touch-grid');
    if (!grid) return;

    // Remplir datalist clients pour autocomplétion
    const dl = document.getElementById('clients-datalist');
    if (dl) {
      dl.innerHTML = (window.pressingStore.data.clients || [])
        .map(c => `<option value="${escapeHTML(c.nom)}">${escapeHTML(c.telephone || '')} - ${escapeHTML(c.quartier || '')}</option>`)
        .join('');
    }

    // Grille de gros boutons tactiles + / -
    grid.innerHTML = tarifs.map(t => {
      const curQty = this.cart.items[t.id]?.quantite || 0;
      const unitLabel = t.unite === 'kilo' ? 'au kilo' : 'à la pièce';

      return `
        <div class="bg-slate-950 border ${curQty > 0 ? 'border-blue-500 bg-blue-950/20' : 'border-slate-800'} p-3 rounded-xl flex items-center justify-between transition">
          <div class="flex-1 pr-2">
            <span class="text-xs font-bold text-white block">${escapeHTML(t.nom)}</span>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-xs font-black text-cyan-400">${t.prix.toLocaleString('fr-FR')} FCFA</span>
              <span class="text-[10px] text-slate-400">/ ${escapeHTML(unitLabel)}</span>
            </div>
          </div>

          <!-- Boutons Tactiles + et - Géants -->
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="appUI.adjustCartItem('${t.id}', -1)" class="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center font-bold text-lg border border-slate-700 transition">
              −
            </button>
            <span class="w-8 text-center font-black text-sm text-white">${curQty}</span>
            <button type="button" onclick="appUI.adjustCartItem('${t.id}', 1)" class="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow transition">
              +
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.updateCartSummary();
  }

  adjustCartItem(tarifId, delta) {
    const tarif = window.pressingStore.data.tarifs.find(t => t.id === tarifId);
    if (!tarif) return;

    if (!this.cart.items[tarifId]) {
      this.cart.items[tarifId] = {
        tarif,
        quantite: 0
      };
    }

    this.cart.items[tarifId].quantite = Math.max(0, this.cart.items[tarifId].quantite + delta);
    if (this.cart.items[tarifId].quantite === 0) {
      delete this.cart.items[tarifId];
    }

    this.renderCaisse();
  }

  setRetraitOffset(offset) {
    this.cart.dateRetraitOffset = offset;
    const labels = {
      0: "Aujourd'hui",
      1: "Demain",
      2: "Dans 2 jours",
      3: "Dans 3 jours",
      5: "Dans 5 jours"
    };

    const disp = document.getElementById('selected-retrait-date-display');
    if (disp) disp.textContent = labels[offset] || `Dans ${offset} jours`;

    document.querySelectorAll('.btn-retrait-option').forEach(btn => {
      const btnOff = Number(btn.getAttribute('data-offset'));
      if (btnOff === offset) {
        btn.className = 'btn-retrait-option px-2.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white border border-blue-500 transition shadow';
      } else {
        btn.className = 'btn-retrait-option px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition';
      }
    });
  }

  toggleExpress() {
    const toggle = document.getElementById('order-express-toggle');
    this.cart.express = toggle ? toggle.checked : !this.cart.express;
    this.updateCartSummary();
  }

  setPaymentStatus(status) {
    this.cart.statutPaiement = status;
    const btnNow = document.getElementById('btn-pay-now');
    const btnLater = document.getElementById('btn-pay-later');

    if (status === 'payee') {
      if (btnNow) btnNow.className = 'py-2.5 rounded-xl font-bold bg-emerald-600 text-white border border-emerald-500 transition shadow';
      if (btnLater) btnLater.className = 'py-2.5 rounded-xl font-bold bg-slate-800 text-slate-300 border border-slate-700 transition';
    } else {
      if (btnNow) btnNow.className = 'py-2.5 rounded-xl font-bold bg-slate-800 text-slate-300 border border-slate-700 transition';
      if (btnLater) btnLater.className = 'py-2.5 rounded-xl font-bold bg-amber-600 text-white border border-amber-500 transition shadow';
    }
  }

  updateCartSummary() {
    const itemsList = Object.values(this.cart.items);
    const summaryContainer = document.getElementById('order-summary-list');
    const badgeCount = document.getElementById('order-items-count-badge');
    const subtotalEl = document.getElementById('order-subtotal');
    const expressRow = document.getElementById('order-express-row');
    const expressAmountEl = document.getElementById('order-express-amount');
    const totalEl = document.getElementById('order-total');

    let sousTotal = 0;
    let totalItems = 0;

    itemsList.forEach(item => {
      sousTotal += item.quantite * item.tarif.prix;
      totalItems += item.quantite;
    });

    const expressPct = window.pressingStore.data.pressing.supplementExpressPct || 30;
    const supplementExpress = this.cart.express ? Math.round(sousTotal * (expressPct / 100)) : 0;
    const total = sousTotal + supplementExpress;

    if (badgeCount) badgeCount.textContent = `${totalItems} article${totalItems > 1 ? 's' : ''}`;

    if (itemsList.length === 0) {
      if (summaryContainer) {
        summaryContainer.innerHTML = '<p class="text-slate-500 italic text-center py-6">Aucun article sélectionné. Touchez un service ou utilisez l\'assistant vocal.</p>';
      }
    } else {
      if (summaryContainer) {
        summaryContainer.innerHTML = itemsList.map(i => `
          <div class="flex items-center justify-between py-1 border-b border-slate-800/60">
            <div class="truncate pr-2">
              <span class="font-bold text-white">${i.quantite} ×</span> ${escapeHTML(i.tarif.nom)}
              <span class="text-[10px] text-slate-500">(${i.tarif.prix} FCFA/${i.tarif.unite === 'kilo' ? 'kg' : 'pc'})</span>
            </div>
            <span class="font-semibold text-slate-200 shrink-0">${(i.quantite * i.tarif.prix).toLocaleString('fr-FR')} FCFA</span>
          </div>
        `).join('');
      }
    }

    if (subtotalEl) subtotalEl.textContent = `${sousTotal.toLocaleString('fr-FR')} FCFA`;

    if (this.cart.express && supplementExpress > 0) {
      if (expressRow) expressRow.classList.remove('hidden');
      if (expressAmountEl) expressAmountEl.textContent = `+${supplementExpress.toLocaleString('fr-FR')} FCFA`;
    } else {
      if (expressRow) expressRow.classList.add('hidden');
    }

    if (totalEl) totalEl.textContent = `${total.toLocaleString('fr-FR')} FCFA`;
  }

  // --- ASSISTANT VOCAL BILINGUE (Section 4.4) ---
  setupVoiceListeners() {
    const input = document.getElementById('voice-input-text');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.processVoiceText();
      });
    }
  }

  toggleVoiceRecognition() {
    const micRing = document.getElementById('mic-pulse-ring');
    const label = document.getElementById('voice-btn-label');
    const status = document.getElementById('voice-status-indicator');

    if (window.voiceNLUEngine.isListening) {
      window.voiceNLUEngine.stopListening();
      if (micRing) micRing.classList.add('hidden');
      if (label) label.textContent = 'Parler';
      if (status) status.textContent = 'Prêt à écouter';
    } else {
      if (micRing) micRing.classList.remove('hidden');
      if (label) label.textContent = 'Écoute...';
      if (status) status.textContent = '🎙️ Parlez en français ou en wolof...';

      window.voiceNLUEngine.startListening(
        (transcript, isFinal) => {
          const input = document.getElementById('voice-input-text');
          if (input) input.value = transcript;
          if (isFinal) {
            this.processVoiceText(transcript);
          }
        },
        (error) => {
          if (status) status.textContent = 'Micro non disponible. Vous pouvez taper le texte ci-dessous.';
          if (micRing) micRing.classList.add('hidden');
          if (label) label.textContent = 'Parler';
        },
        (isActive) => {
          if (!isActive) {
            if (micRing) micRing.classList.add('hidden');
            if (label) label.textContent = 'Parler';
            if (status) status.textContent = 'Prêt';
          }
        }
      );
    }
  }

  setVoiceDemo(text) {
    const input = document.getElementById('voice-input-text');
    if (input) input.value = text;
    this.processVoiceText(text);
  }

  processVoiceText(providedText = null) {
    const input = document.getElementById('voice-input-text');
    const text = providedText || (input ? input.value : '');
    if (!text || !text.trim()) return;

    const tarifs = window.pressingStore.data.tarifs;
    const parsed = window.voiceNLUEngine.parseInvoiceSentence(text, tarifs);

    if (parsed) {
      // 1. Affecter le client
      const clientInput = document.getElementById('order-client-name');
      if (clientInput && parsed.clientNom) {
        clientInput.value = parsed.clientNom;
        // Trouver son numéro de téléphone s'il existe
        const existing = window.pressingStore.data.clients.find(c => c.nom.toLowerCase() === parsed.clientNom.toLowerCase());
        const phoneInput = document.getElementById('order-client-phone');
        if (phoneInput && existing) {
          phoneInput.value = existing.telephone || '';
        }
      }

      // 2. Affecter l'express
      const expressToggle = document.getElementById('order-express-toggle');
      if (expressToggle) {
        expressToggle.checked = parsed.express;
        this.cart.express = parsed.express;
      }

      // 3. Affecter les articles reconnus
      this.cart.items = {};
      parsed.articles.forEach(art => {
        const t = tarifs.find(item => item.id === art.serviceId || item.nom.toLowerCase() === art.serviceNom.toLowerCase());
        if (t) {
          this.cart.items[t.id] = {
            tarif: t,
            quantite: art.quantite
          };
        }
      });

      this.renderCaisse();
      this.playSound('success');

      const status = document.getElementById('voice-status-indicator');
      if (status) {
        status.textContent = `✅ Commande comprise : ${parsed.detectedItemsCount} prestation(s) détectée(s) pour ${parsed.total.toLocaleString('fr-FR')} FCFA`;
      }
    }
  }

  // --- SOUMISSION DE COMMANDE (Section 4.2) ---
  submitOrder(sendWhatsApp = false) {
    const clientNameInput = document.getElementById('order-client-name');
    const clientPhoneInput = document.getElementById('order-client-phone');

    const clientNom = clientNameInput ? clientNameInput.value.trim() : '';
    const clientPhone = clientPhoneInput ? clientPhoneInput.value.trim() : '';

    const itemsList = Object.values(this.cart.items);

    if (itemsList.length === 0) {
      alert('Veuillez ajouter au moins une prestation avant d\'enregistrer la commande.');
      return;
    }

    if (!clientNom) {
      alert('Veuillez préciser le nom du client.');
      if (clientNameInput) clientNameInput.focus();
      return;
    }

    // Calcul date de retrait
    const dRetrait = new Date();
    dRetrait.setDate(dRetrait.getDate() + this.cart.dateRetraitOffset);
    const dateRetraitPrevue = dRetrait.toISOString().split('T')[0];

    // Calculs financiers
    const articles = itemsList.map(i => ({
      serviceNom: i.tarif.nom,
      unite: i.tarif.unite,
      quantite: i.quantite,
      prixUnitaire: i.tarif.prix,
      totalLigne: i.quantite * i.tarif.prix
    }));

    const sousTotal = articles.reduce((sum, a) => sum + a.totalLigne, 0);
    const expressPct = window.pressingStore.data.pressing.supplementExpressPct || 30;
    const supplementExpress = this.cart.express ? Math.round(sousTotal * (expressPct / 100)) : 0;
    const total = sousTotal + supplementExpress;

    // Sauvegarder dans le store
    const createdCmd = window.pressingStore.addCommande({
      clientNom,
      clientTelephone: clientPhone,
      dateRetraitPrevue,
      statutPaiement: this.cart.statutPaiement,
      express: this.cart.express,
      articles,
      sousTotal,
      supplementExpress,
      total
    });

    this.playSound('success');

    // Réinitialiser le formulaire
    this.cart.items = {};
    if (clientNameInput) clientNameInput.value = '';
    if (clientPhoneInput) clientPhoneInput.value = '';
    const voiceInput = document.getElementById('voice-input-text');
    if (voiceInput) voiceInput.value = '';
    const expressToggle = document.getElementById('order-express-toggle');
    if (expressToggle) expressToggle.checked = false;
    this.cart.express = false;

    this.renderCaisse();

    // Option WhatsApp immédiate (Section 4.4)
    if (sendWhatsApp) {
      const msg = window.whatsappEngine.buildInvoiceMessage(createdCmd, window.pressingStore.data.pressing);
      window.whatsappEngine.openChat(createdCmd.clientTelephone, msg);
    }

    // Basculer vers l'onglet commandes pour visualiser
    this.switchTab('commandes');
  }

  // --- GESTION & RENDU DES COMMANDES (Section 4.2 & 4.5) ---
  filterOrders(filterCode) {
    this.currentFilter = filterCode;
    ['all', 'urgences', 'en_cours', 'prete', 'impayee', 'retiree'].forEach(code => {
      const btn = document.getElementById(`filter-cmd-${code}`);
      if (btn) {
        if (code === filterCode) {
          btn.className = 'px-3.5 py-1.5 rounded-xl font-bold bg-blue-600 text-white transition shrink-0';
        } else {
          btn.className = 'px-3.5 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition shrink-0';
        }
      }
    });
    this.renderOrders();
  }

  renderOrders() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    let orders = [...(window.pressingStore.data.commandes || [])];

    // Filtrage
    if (this.currentFilter === 'urgences') {
      orders = orders.filter(c => {
        if (c.statut === 'retiree') return false;
        const info = window.pressingStore.getOrderAlertInfo(c);
        return info.isLate || info.isToday;
      });
    } else if (this.currentFilter === 'en_cours') {
      orders = orders.filter(c => c.statut === 'en_cours');
    } else if (this.currentFilter === 'prete') {
      orders = orders.filter(c => c.statut === 'prete');
    } else if (this.currentFilter === 'impayee') {
      orders = orders.filter(c => c.statutPaiement === 'impayee');
    } else if (this.currentFilter === 'retiree') {
      orders = orders.filter(c => c.statut === 'retiree');
    }

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <i data-lucide="check-circle" class="w-10 h-10 mx-auto text-slate-600 mb-2"></i>
          <p class="font-medium text-sm">Aucune commande dans cette vue.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(cmd => {
      const alertInfo = window.pressingStore.getOrderAlertInfo(cmd);
      const isPaid = cmd.statutPaiement === 'payee';

      return `
        <div class="bg-slate-900 border ${alertInfo.isLate ? 'border-rose-500/50 bg-rose-950/10' : alertInfo.isToday ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'} rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 transition">
          
          <!-- En-tête Carte Commande -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="text-sm font-black text-white">${escapeHTML(cmd.id)}</span>
              <!-- Libellé d'alerte échéance (Section 4.5) -->
              <span class="px-2.5 py-0.5 rounded-full text-[11px] ${escapeHTML(alertInfo.badgeClass)}">
                ${escapeHTML(alertInfo.label)}
              </span>
              ${cmd.express ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">⚡ Express</span>' : ''}
            </div>

            <div class="flex items-center gap-1.5">
              <!-- Statut Commande -->
              <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold ${cmd.statut === 'prete' ? 'bg-emerald-500/20 text-emerald-400' : cmd.statut === 'retiree' ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/20 text-blue-400'}">
                ${cmd.statut === 'en_cours' ? 'À l\'atelier' : cmd.statut === 'prete' ? 'Prête au comptoir' : 'Retirée'}
              </span>

              <!-- Statut Paiement (Section 4.2) -->
              <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                ${isPaid ? 'Payée' : 'Impayée'}
              </span>
            </div>
          </div>

          <!-- Informations Client & Articles -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div class="font-bold text-white text-sm flex items-center gap-1.5">
                <i data-lucide="user" class="w-3.5 h-3.5 text-blue-400"></i>
                ${escapeHTML(cmd.clientNom)}
              </div>
              <div class="text-slate-400 text-[11px] mt-0.5 flex items-center gap-3">
                <span>📞 ${escapeHTML(cmd.clientTelephone || 'Non renseigné')}</span>
                <span>📅 Dépôt : ${escapeHTML(cmd.dateDepot)}</span>
                <span>⏰ Retrait : <strong class="text-white">${escapeHTML(cmd.dateRetraitPrevue)}</strong></span>
              </div>
            </div>

            <!-- Total -->
            <div class="sm:text-right">
              <span class="text-slate-400 text-[10px] uppercase">Montant Total</span>
              <div class="text-lg font-black text-emerald-400">${cmd.total.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>

          <!-- Détail des articles -->
          <div class="bg-slate-950/60 p-2.5 rounded-xl text-[11px] text-slate-300 space-y-1">
            ${cmd.articles.map(a => `
              <div class="flex justify-between">
                <span>▪️ ${a.quantite} ${a.unite === 'kilo' ? 'kg' : 'pc'} × ${escapeHTML(a.serviceNom)}</span>
                <span class="text-slate-400 font-medium">${a.totalLigne.toLocaleString('fr-FR')} FCFA</span>
              </div>
            `).join('')}
          </div>

          <!-- Actions Rapides Tactiles (Statuts, Encaissement, WhatsApp, Ticket) -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${cmd.statut === 'en_cours' ? `
                <button onclick="appUI.changeOrderStatus('${escapeHTML(cmd.id)}', 'prete')" class="btn-touch px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i>
                  Marquer Prête
                </button>
              ` : ''}

              ${cmd.statut === 'prete' ? `
                <button onclick="appUI.changeOrderStatus('${escapeHTML(cmd.id)}', 'retiree')" class="btn-touch px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-700">
                  <i data-lucide="package-check" class="w-3.5 h-3.5 text-emerald-400"></i>
                  Marquer Retirée
                </button>
              ` : ''}

              <!-- BOUTON ENCAISSER SI IMPAYÉE (Section 4.2) -->
              ${!isPaid ? `
                <button onclick="appUI.encaisser('${escapeHTML(cmd.id)}')" class="btn-touch px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 transition flex items-center gap-1">
                  <i data-lucide="banknote" class="w-4 h-4"></i>
                  Encaisser (${cmd.total.toLocaleString('fr-FR')} F)
                </button>
              ` : ''}
            </div>

            <div class="flex items-center gap-1.5">
              <!-- WhatsApp -->
              <button onclick="appUI.sendOrderWhatsApp('${escapeHTML(cmd.id)}')" class="p-2 rounded-xl bg-slate-800 hover:bg-emerald-950/40 text-emerald-400 border border-slate-700 hover:border-emerald-500 transition" title="Partager par WhatsApp">
                <i data-lucide="send" class="w-4 h-4"></i>
              </button>

              <!-- Imprimer Reçu -->
              <button onclick="appUI.openReceiptModal('${escapeHTML(cmd.id)}')" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition" title="Imprimer Ticket">
                <i data-lucide="printer" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

        </div>
      `;
    }).join('');
  }

  changeOrderStatus(cmdId, nouveauStatut) {
    window.pressingStore.updateCommandeStatut(cmdId, nouveauStatut);
    this.playSound('success');

    // Si marquée prête, proposer notification client
    if (nouveauStatut === 'prete') {
      const cmd = window.pressingStore.data.commandes.find(c => c.id === cmdId);
      if (cmd && confirm(`La commande ${cmd.id} est prête ! Voulez-vous envoyer un message WhatsApp à ${cmd.clientNom} pour le prévenir ?`)) {
        const msg = window.whatsappEngine.buildReadyMessage(cmd, window.pressingStore.data.pressing);
        window.whatsappEngine.openChat(cmd.clientTelephone, msg);
      }
    }
  }

  encaisser(cmdId) {
    window.pressingStore.encaisserCommande(cmdId);
    this.playSound('success');
  }

  sendOrderWhatsApp(cmdId) {
    const cmd = window.pressingStore.data.commandes.find(c => c.id === cmdId);
    if (!cmd) return;
    const msg = window.whatsappEngine.buildInvoiceMessage(cmd, window.pressingStore.data.pressing);
    window.whatsappEngine.openChat(cmd.clientTelephone, msg);
  }

  openReceiptModal(cmdId) {
    const cmd = window.pressingStore.data.commandes.find(c => c.id === cmdId);
    if (!cmd) return;
    const p = window.pressingStore.data.pressing;

    const receiptDiv = document.getElementById('printable-receipt');
    if (receiptDiv) {
      receiptDiv.innerHTML = `
        <div class="text-center pb-2 border-b border-black">
          <div class="font-bold text-sm tracking-widest">${escapeHTML(p.nom.toUpperCase())}</div>
          <div class="text-[10px]">${escapeHTML(p.slogan || 'Pressing Professionnel')}</div>
          <div class="text-[10px]">${escapeHTML(p.adresse)}</div>
          <div class="text-[10px]">Tél : ${escapeHTML(p.telephone)}</div>
        </div>

        <div class="py-2 border-b border-black text-[11px] space-y-0.5">
          <div><strong>TICKET N° ${escapeHTML(cmd.id)}</strong></div>
          <div>Client : ${escapeHTML(cmd.clientNom)}</div>
          <div>Dépôt : ${escapeHTML(cmd.dateDepot)}</div>
          <div><strong>Retrait prévu : ${escapeHTML(cmd.dateRetraitPrevue)}</strong></div>
          ${cmd.express ? '<div>*** PRIORITE EXPRESS ***</div>' : ''}
        </div>

        <div class="py-2 border-b border-black text-[11px] space-y-1">
          ${cmd.articles.map(a => `
            <div class="flex justify-between">
              <span>${a.quantite} ${a.unite === 'kilo' ? 'kg' : 'pc'} × ${escapeHTML(a.serviceNom)}</span>
              <span>${a.totalLigne} F</span>
            </div>
          `).join('')}
        </div>

        <div class="py-2 border-b border-black text-[11px] space-y-0.5">
          ${cmd.express ? `<div class="flex justify-between"><span>Supplément express :</span><span>+${cmd.supplementExpress} F</span></div>` : ''}
          <div class="flex justify-between font-bold text-sm">
            <span>TOTAL NET :</span>
            <span>${cmd.total.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div class="text-center font-bold pt-1">
            ${cmd.statutPaiement === 'payee' ? '*** REÇU PAYÉ ***' : '*** À RÉGLER AU RETRAIT ***'}
          </div>
        </div>

        <div class="text-center pt-2 text-[10px] space-y-0.5">
          <div>Merci de votre confiance !</div>
          <div>Ticket obligatoire pour le retrait.</div>
        </div>
      `;
    }

    const shareBtn = document.getElementById('btn-share-receipt-wa');
    if (shareBtn) {
      shareBtn.onclick = () => {
        const msg = window.whatsappEngine.buildInvoiceMessage(cmd, p);
        window.whatsappEngine.openChat(cmd.clientTelephone, msg);
      };
    }

    document.getElementById('modal-receipt').classList.remove('hidden');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // --- RENDU CLIENTS & RELANCES (Section 4.6) ---
  renderClients() {
    const container = document.getElementById('clients-list-container');
    if (!container) return;

    const searchInput = document.getElementById('clients-search-input');
    const query = (searchInput ? searchInput.value.toLowerCase() : '').trim();

    let clients = [...(window.pressingStore.data.clients || [])];

    // Tri par montant dépensé décroissant (Section 4.6: Classement des meilleurs clients)
    clients.sort((a, b) => (b.totalDepense || 0) - (a.totalDepense || 0));

    if (query) {
      clients = clients.filter(c =>
        c.nom.toLowerCase().includes(query) ||
        (c.telephone && c.telephone.includes(query)) ||
        (c.quartier && c.quartier.toLowerCase().includes(query))
      );
    }

    container.innerHTML = clients.map((c, index) => {
      const status = window.pressingStore.getClientStatus(c);
      const isRelance = status === 'a_relancer';

      return `
        <div class="bg-slate-900 border ${isRelance ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'} rounded-2xl p-4 space-y-3 shadow-md">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center justify-center font-bold">#${index + 1}</span>
                <h4 class="font-bold text-white text-sm">${escapeHTML(c.nom)}</h4>
                ${c.vip ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">VIP ⭐</span>' : ''}
              </div>
              <p class="text-[11px] text-slate-400 mt-1">📞 ${escapeHTML(c.telephone)} • 📍 ${escapeHTML(c.quartier || 'Dakar')}</p>
            </div>

            <!-- Repère "À relancer" (Section 4.6) -->
            ${isRelance ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                À relancer
              </span>
            ` : '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">Actif</span>'}
          </div>

          <div class="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl text-xs">
            <div>
              <span class="text-slate-400 text-[10px] block">Total Dépensé</span>
              <span class="font-black text-emerald-400">${(c.totalDepense || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 text-[10px] block">Commandes</span>
              <span class="font-bold text-white">${c.nbCommandes || 0}</span>
            </div>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <span>Dernière commande : ${escapeHTML(c.derniereCommande || 'N/A')}</span>
            <!-- Bouton Relance WhatsApp -->
            <button onclick="appUI.relancerClient('${escapeHTML(c.id)}')" class="px-3 py-1.5 rounded-xl ${isRelance ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} transition flex items-center gap-1.5">
              <i data-lucide="send" class="w-3.5 h-3.5 text-emerald-400"></i>
              ${isRelance ? 'Relancer WhatsApp' : 'Message'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  relancerClient(clientId) {
    const client = window.pressingStore.data.clients.find(c => c.id === clientId);
    if (!client) return;
    const msg = window.whatsappEngine.buildRelanceMessage(client, window.pressingStore.data.pressing);
    window.whatsappEngine.openChat(client.telephone, msg);
  }

  openNewClientModal() {
    const nom = prompt('Nom complet du nouveau client :');
    if (!nom || !nom.trim()) return;
    const telephone = prompt('Numéro de téléphone (+221) :') || '+221 77 000 00 00';
    const quartier = prompt('Quartier (Dakar) :') || 'Dakar';

    window.pressingStore.data.clients.push({
      id: 'c_' + Date.now(),
      nom: nom.trim().slice(0, 100),
      telephone: telephone.trim().slice(0, 30),
      quartier: quartier.trim().slice(0, 100),
      vip: false,
      totalDepense: 0,
      nbCommandes: 0,
      derniereCommande: null
    });
    window.pressingStore.save();
    this.renderClients();
    this.playSound('success');
  }

  // --- RENDU MODULE TECHNICIENS (Section 4.10) ---
  renderTechniciens() {
    const container = document.getElementById('techniciens-list-container');
    const demandesContainer = document.getElementById('demandes-depannage-container');
    if (!container) return;

    const techs = window.pressingStore.data.techniciens || [];
    const demandes = window.pressingStore.data.demandesDepannage || [];

    // Demandes en cours
    if (demandesContainer) {
      if (demandes.length === 0) {
        demandesContainer.innerHTML = '';
      } else {
        demandesContainer.innerHTML = `
          <div class="space-y-2">
            <h4 class="text-xs uppercase font-bold text-rose-400">🚨 Pannes Signalées en cours :</h4>
            ${demandes.map(d => `
              <div class="bg-rose-950/20 border border-rose-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div class="font-bold text-white flex items-center gap-2">
                    <span>${escapeHTML(d.machine)}</span>
                    ${d.urgence ? '<span class="px-2 py-0.2 rounded bg-rose-500 text-white text-[10px] font-black">Urgence Pressing</span>' : ''}
                  </div>
                  <p class="text-slate-300 text-[11px] mt-0.5">${escapeHTML(d.description)} • 📍 ${escapeHTML(d.quartier)}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-amber-400 font-semibold">Attente technicien</span>
                  <button onclick="appUI.contactTechPourPanne('${escapeHTML(d.id)}')" class="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs flex items-center gap-1">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i>
                    Alerter Réparateur
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // Annuaire techniciens
    container.innerHTML = techs.map(t => `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md flex flex-col justify-between">
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-11 h-11 rounded-xl bg-slate-800 text-2xl flex items-center justify-center overflow-hidden">
                👨‍🔧
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <h4 class="font-bold text-white text-sm">${escapeHTML(t.nom)}</h4>
                  ${t.verifie ? '<i data-lucide="badge-check" class="w-4 h-4 text-emerald-400" title="Vérifié par la plateforme"></i>' : ''}
                </div>
                <p class="text-[11px] text-slate-400">${escapeHTML(t.entreprise)}</p>
              </div>
            </div>
            
            <div class="text-right">
              <span class="text-amber-400 font-bold text-xs">⭐ ${t.note}</span>
              <span class="text-[10px] text-slate-500 block">(${t.avisCount} avis)</span>
            </div>
          </div>

          <p class="text-xs text-slate-300">${escapeHTML(t.description)}</p>

          <div class="space-y-1 text-[11px]">
            <div class="text-slate-400"><strong>Marques :</strong> ${escapeHTML(t.marques.join(', '))}</div>
            <div class="text-slate-400"><strong>Zones :</strong> ${escapeHTML(t.zones.join(', '))}</div>
            <div class="text-cyan-400 font-semibold"><strong>Tarif indicatif :</strong> ${escapeHTML(t.tarifIndicatif)}</div>
          </div>
        </div>

        <div class="flex gap-2 pt-2 border-t border-slate-800">
          <a href="tel:${escapeHTML(t.telephone)}" class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition">
            <i data-lucide="phone" class="w-3.5 h-3.5 text-blue-400"></i>
            Appeler
          </a>
          <button onclick="appUI.contactTechWA('${escapeHTML(t.id)}')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition">
            <i data-lucide="send" class="w-3.5 h-3.5"></i>
            WhatsApp
          </button>
        </div>
      </div>
    `).join('');
  }

  contactTechWA(techId) {
    const tech = window.pressingStore.data.techniciens.find(t => t.id === techId);
    if (!tech) return;
    const msg = `Bonjour ${tech.nom}, je vous contacte depuis la plateforme MF Clean pour un besoin d'entretien / dépannage de machine à laver. Êtes-vous disponible ?`;
    window.whatsappEngine.openChat(tech.telephone, msg);
  }

  contactTechPourPanne(demandeId) {
    const d = window.pressingStore.data.demandesDepannage.find(item => item.id === demandeId);
    const tech = window.pressingStore.data.techniciens[0];
    if (d && tech) {
      const msg = window.whatsappEngine.buildTechUrgenceMessage(d, window.pressingStore.data.pressing);
      window.whatsappEngine.openChat(tech.telephone, msg);
    }
  }

  openDemandeDepannageModal() {
    document.getElementById('modal-demande-depannage').classList.remove('hidden');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  submitPanneMachine() {
    const machine = document.getElementById('panne-machine-input').value.trim();
    const quartier = document.getElementById('panne-quartier-input').value.trim();
    const desc = document.getElementById('panne-desc-input').value.trim();
    const urgence = document.getElementById('panne-urgence-input').checked;

    if (!machine || !desc) {
      alert('Veuillez préciser la machine et le problème constaté.');
      return;
    }

    const newDemande = window.pressingStore.addDemandeDepannage({
      machine,
      quartier,
      description: desc,
      urgence
    });

    this.closeModal('modal-demande-depannage');
    this.renderTechniciens();
    this.playSound('alert');

    // Alerter le premier réparateur de garde par WhatsApp
    if (confirm('Panne enregistrée ! Souhaitez-vous envoyer immédiatement l\'alerte d\'urgence au réparateur le plus proche par WhatsApp ?')) {
      this.contactTechPourPanne(newDemande.id);
    }
  }

  // --- RENDU DES SOUS-VUES (TARIFS, DÉPENSES, STOCK, ANNONCES, ADMIN) ---
  renderSubViews() {
    this.renderTarifsTable();
    this.renderDepensesList();
    this.renderStockList();
    this.renderAdminPressingsTable();
  }

  // TARIFS (Section 4.3)
  renderTarifsTable() {
    const container = document.getElementById('tarifs-table-container');
    if (!container) return;

    const tarifs = window.pressingStore.data.tarifs || [];
    container.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th class="p-3">Service / Prestation</th>
              <th class="p-3">Unité</th>
              <th class="p-3">Prix (FCFA)</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            ${tarifs.map(t => `
              <tr class="hover:bg-slate-850">
                <td class="p-3 font-bold text-white">${escapeHTML(t.nom)}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${t.unite === 'kilo' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'}">
                    ${t.unite === 'kilo' ? 'au kilo' : 'à la pièce'}
                  </span>
                </td>
                <td class="p-3 font-black text-emerald-400">${t.prix.toLocaleString('fr-FR')} F</td>
                <td class="p-3 text-right space-x-1">
                  <button onclick="appUI.editTarif('${escapeHTML(t.id)}')" class="p-1 hover:text-blue-400"><i data-lucide="edit-3" class="w-3.5 h-3.5 inline"></i></button>
                  <button onclick="appUI.deleteTarif('${escapeHTML(t.id)}')" class="p-1 hover:text-rose-400"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  openNewTarifModal() {
    const nom = prompt('Nom du service (ex: Veste cuir, Rideaux occultants) :');
    if (!nom || !nom.trim()) return;
    const unite = confirm('Le prix est-il calculé AU KILO ?\n(OK = au kilo, Annuler = à la pièce)') ? 'kilo' : 'piece';
    const prix = prompt('Prix en FCFA (ex: 1500) :');
    if (!prix || isNaN(prix)) return;

    window.pressingStore.addTarif({ nom: nom.trim(), unite, prix: Number(prix) });
    this.refreshAll();
  }

  editTarif(id) {
    const t = window.pressingStore.data.tarifs.find(item => item.id === id);
    if (!t) return;
    const nouveauPrix = prompt(`Nouveau prix pour "${t.nom}" (actuel: ${t.prix} FCFA) :`, t.prix);
    if (nouveauPrix && !isNaN(nouveauPrix)) {
      window.pressingStore.updateTarif(id, { nom: t.nom, unite: t.unite, prix: Number(nouveauPrix) });
      this.refreshAll();
    }
  }

  deleteTarif(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) {
      window.pressingStore.deleteTarif(id);
      this.refreshAll();
    }
  }

  saveExpressPct() {
    const input = document.getElementById('input-express-pct');
    if (input && !isNaN(input.value)) {
      window.pressingStore.updateSupplementExpress(Number(input.value));
      alert(`Supplément express mis à jour : ${input.value}%`);
      this.refreshAll();
    }
  }

  // DÉPENSES (Section 4.7)
  renderDepensesList() {
    const container = document.getElementById('depenses-list-container');
    if (!container) return;

    const depenses = window.pressingStore.data.depenses || [];
    container.innerHTML = depenses.map(d => `
      <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">${escapeHTML(d.label)}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 uppercase">${escapeHTML(d.categorie)}</span>
          </div>
          <span class="text-[11px] text-slate-500">${escapeHTML(d.date)} • ${escapeHTML(d.note || 'Sans note')}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-black text-rose-400">-${d.montant.toLocaleString('fr-FR')} FCFA</span>
          <button onclick="appUI.deleteDepense('${escapeHTML(d.id)}')" class="p-1 hover:text-rose-400 text-slate-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </div>
    `).join('');
  }

  openNewDepenseModal() {
    const label = prompt('Description de la dépense (ex: Facture Senelec, Lessive grossiste) :');
    if (!label || !label.trim()) return;
    const cat = prompt('Catégorie (produits, electricite, eau, salaires, loyer, reparation, autre) :', 'produits') || 'autre';
    const montant = prompt('Montant en FCFA :');
    if (!montant || isNaN(montant)) return;

    window.pressingStore.addDepense({
      categorie: cat.toLowerCase(),
      label: label.trim(),
      montant: Number(montant)
    });
    this.refreshAll();
  }

  deleteDepense(id) {
    if (confirm('Supprimer cette dépense ?')) {
      window.pressingStore.deleteDepense(id);
      this.refreshAll();
    }
  }

  // STOCK (Section 4.8)
  renderStockList() {
    const container = document.getElementById('stock-list-container');
    if (!container) return;

    const stocks = window.pressingStore.data.stocks || [];
    container.innerHTML = stocks.map(s => `
      <div class="bg-slate-900 border ${s.alerte ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'} p-3.5 rounded-2xl space-y-2">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-xs">${escapeHTML(s.nom)}</h4>
            <span class="text-[10px] text-slate-400">${escapeHTML(s.unite)}</span>
          </div>
          ${s.alerte ? '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">Stock bas !</span>' : ''}
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-xl font-black text-white">${s.quantite}</span>

          <div class="flex items-center gap-1">
            <button onclick="appUI.adjustStock('${escapeHTML(s.id)}', -1)" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center">−1</button>
            <button onclick="appUI.adjustStock('${escapeHTML(s.id)}', 1)" class="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center">+1</button>
            <button onclick="appUI.adjustStock('${escapeHTML(s.id)}', 5)" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">+5</button>
          </div>
        </div>

        <div class="text-[10px] text-slate-500">Seuil d'alerte : ${s.seuilAlerte} ${escapeHTML(s.unite)}</div>
      </div>
    `).join('');
  }

  adjustStock(id, delta) {
    window.pressingStore.updateStockQuantity(id, delta);
    this.refreshAll();
  }

  openNewStockModal() {
    const nom = prompt('Nom du produit (ex: Cintre fer, Sacs plastiques) :');
    if (!nom || !nom.trim()) return;
    const unite = prompt('Unité (ex: Pièces, Litres, Rouleaux) :', 'Pièces') || 'Pièces';
    const quantite = prompt('Quantité actuelle :', '10') || '10';
    const seuil = prompt('Seuil d\'alerte minimale :', '3') || '3';

    window.pressingStore.addStockItem({
      nom: nom.trim(),
      unite,
      quantite: Number(quantite),
      seuilAlerte: Number(seuil)
    });
    this.refreshAll();
  }

  // ANNONCES & PROMOS (Section 4.9)
  setPromoTemplate(type) {
    const textarea = document.getElementById('promo-message-text');
    if (!textarea) return;

    if (type === 'korite') {
      textarea.value = "Chers clients de MF Clean ✨ ! À l'occasion des fêtes, bénéficiez de -20% sur le nettoyage de vos Grands Boubous et Costumes pour un éclat parfait. Déposez votre linge dès aujourd'hui à notre atelier de Mermoz !";
    } else if (type === 'couette') {
      textarea.value = "Offre Spéciale Saison chez MF Clean 🛏️ : Nettoyage et désinfection de vos couettes et rideaux à tarif préférentiel cette semaine. Retrait rapide garanti !";
    }
  }

  broadcastPromo() {
    const textarea = document.getElementById('promo-message-text');
    const msg = textarea ? textarea.value.trim() : '';
    if (!msg) {
      alert('Veuillez saisir le texte de l\'annonce avant d\'envoyer.');
      return;
    }

    const clients = window.pressingStore.data.clients || [];
    if (clients.length === 0) {
      alert('Aucun client enregistré.');
      return;
    }

    // Ouvrir WhatsApp pour le premier client et copier le message pour diffusion
    if (confirm(`Diffuser ce message promotionnel à vos ${clients.length} clients via WhatsApp ?`)) {
      window.whatsappEngine.openChat(clients[0].telephone, msg);
      alert(`Message prêt ! Le texte est également copié dans votre presse-papier pour envoi direct.`);
    }
  }

  // ESPACE ADMIN FONDATEUR (Section 4.11)
  renderAdminPressingsTable() {
    const container = document.getElementById('admin-pressings-table-container');
    if (!container) return;

    const list = window.pressingStore.data.pressingsAdmin || [];
    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th class="p-3">Pressing</th>
              <th class="p-3">Formule</th>
              <th class="p-3">Statut</th>
              <th class="p-3">Échéance</th>
              <th class="p-3 text-right">Actions Fondateur</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            ${list.map(p => `
              <tr class="hover:bg-slate-850">
                <td class="p-3">
                  <strong class="text-white block">${escapeHTML(p.nom)}</strong>
                  <span class="text-[10px] text-slate-400">${escapeHTML(p.proprietaire)} • ${escapeHTML(p.telephone)}</span>
                </td>
                <td class="p-3 uppercase font-semibold text-cyan-400">${escapeHTML(p.formule)}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-black ${p.statutAbonnement === 'actif' ? 'bg-emerald-500/20 text-emerald-400' : p.statutAbonnement === 'essai' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}">
                    ${escapeHTML(p.statutAbonnement.toUpperCase())}
                  </span>
                </td>
                <td class="p-3">${escapeHTML(p.dateEcheance)}</td>
                <td class="p-3 text-right space-x-1.5">
                  <button onclick="appUI.validerPaiementWave('${escapeHTML(p.id)}')" class="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold">
                    Valider Wave (+30j)
                  </button>
                  <button onclick="appUI.toggleSuspension('${escapeHTML(p.id)}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px]">
                    ${p.statutAbonnement === 'suspendu' ? 'Réactiver' : 'Suspendre'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  validerPaiementWave(id) {
    const press = window.pressingStore.data.pressingsAdmin.find(p => p.id === id);
    if (!press) return;
    const refWave = prompt(`Valider le paiement Wave pour ${press.nom}.\nMontant attendu : ${press.montantMensuel || 16000} FCFA.\nNuméro de transaction Wave :`, 'WAVE-SN-' + Math.floor(100000 + Math.random() * 900000));
    if (refWave) {
      window.pressingStore.updatePressingAbonnement(id, { statut: 'actif', prolongerJours: 30 });
      alert(`Abonnement de ${press.nom} validé avec succès pour 30 jours supplémentaires ! Réf Wave : ${refWave}`);
      this.refreshAll();
    }
  }

  toggleSuspension(id) {
    const press = window.pressingStore.data.pressingsAdmin.find(p => p.id === id);
    if (!press) return;
    const nouveauStatut = press.statutAbonnement === 'suspendu' ? 'actif' : 'suspendu';
    window.pressingStore.updatePressingAbonnement(id, { statut: nouveauStatut });
    this.refreshAll();
  }

  // --- PARAMÈTRES & BACKUP ---
  openSettingsModal() {
    document.getElementById('modal-settings').classList.remove('hidden');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(window.pressingStore.exportJSON());
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `mfclean_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  }

  importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (maximum 5 Mo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const ok = window.pressingStore.importJSON(e.target.result);
      if (ok) {
        alert('Sauvegarde restaurée et vérifiée avec succès !');
        this.closeModal('modal-settings');
        this.refreshAll();
      } else {
        alert('Fichier de sauvegarde invalide ou corrompu.');
      }
    };
    reader.readAsText(file);
  }

  resetDemoData() {
    if (confirm('Voulez-vous réinitialiser toutes les données aux valeurs de démo de MF Clean ?')) {
      window.pressingStore.resetToDefault();
      this.closeModal('modal-settings');
      this.refreshAll();
    }
  }
}

// Initialisation globale
window.addEventListener('DOMContentLoaded', () => {
  window.appUI = new PressingAppUI();
});
