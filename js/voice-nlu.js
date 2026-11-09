/**
 * Voice & NLU Engine - MF Clean Pressing Pro
 * Reconnaissance vocale bilingue Français & Wolof
 * Analyse syntaxique & sémantique pour la création de factures et commandes
 */

class VoiceNLUEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusChangeCallback = null;
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'fr-FR'; // Langue de base, capture le français et wolof transcrit

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (this.onResultCallback) {
          this.onResultCallback(transcript, event.results[0].isFinal);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Erreur SpeechRecognition:', event.error);
        this.isListening = false;
        if (this.onErrorCallback) this.onErrorCallback(event.error);
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
      };
    } else {
      console.warn('Web Speech API non supporté sur ce navigateur.');
    }
  }

  startListening(onResult, onError, onStatusChange) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStatusChangeCallback = onStatusChange;

    if (!this.recognition) {
      if (onError) onError('API_NOT_SUPPORTED');
      return;
    }

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Impossible de redémarrer le micro:', e);
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 200);
      } catch (err) { }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Analyse sémantique avancée d'une phrase (Français ou Wolof)
   * Ex: "Facture pour Awa Diop, ñaari costumes ak 3 kilos de lavage et repassage express"
   */
  parseInvoiceSentence(text, tarifsList) {
    if (!text || typeof text !== 'string') return null;

    const lower = text.toLowerCase().trim();
    let recognizedClient = '';
    let isExpress = false;
    const recognizedItems = [];

    // 1. Détection express
    if (lower.includes('express') || lower.includes('urgent') || lower.includes('gaaw') || lower.includes('rapide')) {
      isExpress = true;
    }

    // 2. Détection du client
    // Patterns: "facture pour [nom]", "pour [nom]", "pur [nom]", "client [nom]"
    const clientMatch = lower.match(/(?:facture\s+pour|pour|pur|client)\s+([a-zA-ZÀ-ÿ\s'-]+?)(?:,|\s+avec|\s+ak|\s+\d|\s+ñaar|\s+ñett|\s+bénn|\s+juróom|\s+un|\s+deux|\s+trois|\s+quatre|\s+cinq|\s+kilo|$)/i);
    if (clientMatch && clientMatch[1]) {
      recognizedClient = clientMatch[1].trim();
      // Capitaliser les mots
      recognizedClient = recognizedClient
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // Si aucun pattern direct mais le nom d'un client existant est prononcé
    if (!recognizedClient && window.pressingStore) {
      const existingClients = window.pressingStore.data.clients || [];
      for (const c of existingClients) {
        if (lower.includes(c.nom.toLowerCase())) {
          recognizedClient = c.nom;
          break;
        }
      }
    }

    // 3. Dictionnaire de conversion Wolof / Français des quantités
    const numberWords = {
      // Wolof
      'bénn': 1, 'ben': 1, 'béne': 1, 'benn': 1,
      'ñaar': 2, 'ñaari': 2, 'gnar': 2, 'gnari': 2, 'nar': 2,
      'ñett': 3, 'ñetti': 3, 'gnett': 3, 'gnetti': 3, 'gnet': 3,
      'ñent': 4, 'ñenti': 4, 'nient': 4, 'nienti': 4,
      'juróom': 5, 'juróomi': 5, 'diourom': 5, 'djourom': 5,
      'juróom-bénn': 6, 'juróom benn': 6, 'diourom ben': 6,
      'juróom-ñaar': 7, 'juróom ñaar': 7, 'diourom gnar': 7,
      'juróom-ñett': 8, 'juróom ñett': 8, 'diourom gnett': 8,
      'juróom-ñent': 9, 'juróom ñent': 9, 'diourom nient': 9,
      'fukk': 10, 'fouk': 10,
      // Français
      'un': 1, 'une': 1,
      'deux': 2,
      'trois': 3,
      'quatre': 4,
      'cinq': 5,
      'six': 6,
      'sept': 7,
      'huit': 8,
      'neuf': 9,
      'dix': 10
    };

    // 4. Mots-clés des services avec synonymes wolof & français
    const serviceKeywords = [
      {
        nom: 'Grand boubou',
        patterns: ['grand boubou', 'grands boubous', 'grand bubu', 'boubou', 'boubous', 'mbubu', 'bubu', 'caftan', 'kaftan']
      },
      {
        nom: 'Costume',
        patterns: ['costume', 'costumes', 'kustim', 'costum', 'veste', 'pantalon', 'complet']
      },
      {
        nom: 'Couette',
        patterns: ['couette', 'couettes', 'kweet', 'drap lourd']
      },
      {
        nom: 'Rideaux',
        patterns: ['rideau', 'rideaux', 'rido', 'ridox']
      },
      {
        nom: 'Madje',
        patterns: ['madje', 'madjes', 'madié', 'madjé', 'kóor']
      },
      {
        nom: 'Serviette blanche',
        patterns: ['serviette blanche', 'serviettes blanches', 'serviette', 'serviettes', 'tawal', 'tawals']
      },
      {
        nom: 'Draps',
        patterns: ['drap', 'draps', 'ndap', 'dra']
      },
      {
        nom: 'Lavage et repassage',
        patterns: ['lavage et repassage', 'lavage repassage', 'fóot ak paase', 'foot ak paase', 'foot', 'paase', 'lavage', 'repassage']
      },
      {
        nom: 'Nettoyage à sec',
        patterns: ['nettoyage à sec', 'nettoyage a sec', 'nettoyage sec', 'à sec', 'a sec', 'raas', 'sec']
      }
    ];

    // Trouver le service dans les tarifs réels
    tarifsList.forEach(tarif => {
      // Trouver les patterns pour ce tarif
      const matchedKw = serviceKeywords.find(k => k.nom.toLowerCase() === tarif.nom.toLowerCase());
      const patterns = matchedKw ? matchedKw.patterns : [tarif.nom.toLowerCase()];

      for (const pat of patterns) {
        if (lower.includes(pat)) {
          // Extraire le contexte autour du mot clé pour trouver la quantité
          let qty = 1;

          // Chercher avant ou après le pattern
          // Regex 1 : nombre numérique avant "3 kilos de lavage", "2 costumes"
          const regexNumericBefore = new RegExp(`(?:(\\d+(?:[.,]\\d+)?)\\s*(?:kilos?|kg|pièces?|piece)?\\s*(?:de\\s+|d'\\s*)?)${pat}`, 'i');
          const m1 = lower.match(regexNumericBefore);
          if (m1 && m1[1]) {
            qty = parseFloat(m1[1].replace(',', '.'));
          } else {
            // Regex 2 : mot numérique wolof ou français avant : "ñaari costumes", "trois kilos"
            for (const [word, val] of Object.entries(numberWords)) {
              const regexWordBefore = new RegExp(`(?:\\b${word}\\b\\s*(?:kilos?|kg|pièces?|piece)?\\s*(?:de\\s+|d'\\s*)?)${pat}`, 'i');
              if (regexWordBefore.test(lower)) {
                qty = val;
                break;
              }
            }
          }

          // Regex 3 : nombre après : "lavage repassage 4 kilos", "costumes ñaar"
          const regexNumericAfter = new RegExp(`${pat}\\s*(?:de\\s+|d'\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(?:kilos?|kg)?`, 'i');
          const m3 = lower.match(regexNumericAfter);
          if (m3 && m3[1]) {
            qty = parseFloat(m3[1].replace(',', '.'));
          }

          // Vérifier si pas déjà ajouté
          if (!recognizedItems.some(i => i.serviceNom === tarif.nom)) {
            recognizedItems.push({
              serviceId: tarif.id,
              serviceNom: tarif.nom,
              unite: tarif.unite,
              quantite: qty,
              prixUnitaire: tarif.prix,
              totalLigne: qty * tarif.prix
            });
          }
          break;
        }
      }
    });

    // Calculs financiers
    const sousTotal = recognizedItems.reduce((sum, item) => sum + item.totalLigne, 0);
    const expressPct = window.pressingStore?.data?.pressing?.supplementExpressPct || 30;
    const supplementExpress = isExpress ? Math.round(sousTotal * (expressPct / 100)) : 0;
    const total = sousTotal + supplementExpress;

    return {
      rawText: text,
      clientNom: recognizedClient || 'Client Comptoir',
      express: isExpress,
      articles: recognizedItems,
      sousTotal,
      supplementExpress,
      total,
      detectedItemsCount: recognizedItems.length
    };
  }

  /**
   * Synthèse vocale de confirmation (Optionnelle, agréable pour l'atelier)
   */
  speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}

// Instance globale
window.voiceNLUEngine = new VoiceNLUEngine();
