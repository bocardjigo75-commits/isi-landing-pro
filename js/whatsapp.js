/**
 * WhatsApp & Notification Engine - MF Clean Pressing Pro
 * Génère des messages professionnels prêts pour WhatsApp (liens directs wa.me)
 * et gère les modèles de facturation, relances clients, alertes retrait et annonces.
 */

class WhatsAppEngine {
  /**
   * Nettoie et formate le numéro de téléphone sénégalais (+221)
   */
  formatPhone(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    // Si format local 77XXXXXXX ou 78XXXXXXX ou 76XXXXXXX ou 70XXXXXXX (9 chiffres)
    if (cleaned.length === 9 && (cleaned.startsWith('77') || cleaned.startsWith('78') || cleaned.startsWith('76') || cleaned.startsWith('70') || cleaned.startsWith('75') || cleaned.startsWith('33'))) {
      cleaned = '221' + cleaned;
    }
    return cleaned;
  }

  /**
   * Ouvre la discussion WhatsApp avec le message pré-rempli
   */
  openChat(phone, message) {
    const formattedPhone = this.formatPhone(phone);
    const encodedMsg = encodeURIComponent(message);
    const url = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    // Copier aussi dans le presse-papier pour confort
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).catch(() => {});
    }

    window.open(url, '_blank');
  }

  /**
   * Génère le texte complet de la facture de pressing
   */
  buildInvoiceMessage(cmd, pressing) {
    const pNom = pressing?.nom || 'MF CLEAN';
    const pTel = pressing?.telephone || '+221 77 123 45 67';
    const pAdresse = pressing?.adresse || 'Mermoz, Dakar';

    let msg = `✨ *${pNom.toUpperCase()}* ✨\n`;
    msg += `🧺 _Le soin d'excellence pour votre linge_\n`;
    msg += `📍 ${pAdresse} | 📞 ${pTel}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📄 *FACTURE / REÇU N° ${cmd.id}*\n`;
    msg += `👤 *Client :* ${cmd.clientNom}\n`;
    msg += `📅 *Date dépôt :* ${cmd.dateDepot}\n`;
    msg += `⏰ *Retrait prévu :* ${cmd.dateRetraitPrevue}\n`;
    if (cmd.express) {
      msg += `⚡ *PRIORITÉ EXPRESS ACCORDÉE*\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*DÉTAIL DES ARTICLES :*\n`;

    cmd.articles.forEach((art, index) => {
      const unit = art.unite === 'kilo' ? 'kg' : 'pc';
      msg += `▪️ ${art.quantite} ${unit} × ${art.serviceNom} = *${art.totalLigne.toLocaleString('fr-FR')} FCFA*\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (cmd.express && cmd.supplementExpress > 0) {
      msg += `Sous-total : ${cmd.sousTotal.toLocaleString('fr-FR')} FCFA\n`;
      msg += `Supplément Express (${pressing.supplementExpressPct || 30}%) : +${cmd.supplementExpress.toLocaleString('fr-FR')} FCFA\n`;
    }
    msg += `💰 *TOTAL : ${cmd.total.toLocaleString('fr-FR')} FCFA*\n`;
    
    if (cmd.statutPaiement === 'payee') {
      msg += `✅ *Statut : PAYÉ EN TOTALITÉ*\n`;
    } else {
      msg += `⏳ *Statut : À RÉGLER AU RETRAIT*\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🙏 *Merci de votre fidélité !*\n`;
    msg += `_Conservez ce message pour le retrait de votre linge._`;

    return msg;
  }

  /**
   * Message de notification : Linge prêt au pressing
   */
  buildReadyMessage(cmd, pressing) {
    const pNom = pressing?.nom || 'MF CLEAN';
    let msg = `🧺 *${pNom} : Votre linge est prêt !*\n\n`;
    msg += `Bonjour *${cmd.clientNom}*,\n`;
    msg += `Nous vous informons que votre commande *${cmd.id}* est soigneusement lavée, repassée et disponible au comptoir.\n\n`;
    msg += `💰 Montant : *${cmd.total.toLocaleString('fr-FR')} FCFA* (${cmd.statutPaiement === 'payee' ? '✅ Déjà payé' : '⏳ À régler au retrait'})\n`;
    msg += `📍 Vous pouvez passer dès maintenant le retirer à ${pressing.adresse || 'notre pressing'}.\n\n`;
    msg += `À très vite chez ${pNom} ! ✨`;
    return msg;
  }

  /**
   * Message de relance pour client inactif (> 30 jours)
   */
  buildRelanceMessage(client, pressing) {
    const pNom = pressing?.nom || 'MF CLEAN';
    let msg = `Bonjour *${client.nom}* ! 👋\n\n`;
    msg += `Toute l'équipe de *${pNom}* espère que vous allez très bien.\n`;
    msg += `Cela fait plus d'un mois que nous n'avons pas eu le plaisir de prendre soin de votre linge !\n\n`;
    msg += `👔 Vos costumes, boubous, couettes et vêtements du quotidien méritent le meilleur traitement.\n`;
    msg += `🎁 Passez nous voir cette semaine, nous serons ravis de vous accueillir avec un service toujours impeccable.\n\n`;
    msg += `📍 ${pressing.adresse || 'Dakar'} | 📞 ${pressing.telephone || '+221 77 123 45 67'}`;
    return msg;
  }

  /**
   * Message pour urgence technicien / dépannage machine
   */
  buildTechUrgenceMessage(demande, pressing) {
    let msg = `🚨 *URGENCE DÉPANNAGE PRESSING* 🚨\n\n`;
    msg += `Pressing : *${demande.pressingNom || pressing.nom}*\n`;
    msg += `📍 Quartier : *${demande.quartier}*\n`;
    msg += `📞 Contact : ${demande.clientTelephone || pressing.telephone}\n`;
    msg += `🔧 Machine en panne : *${demande.machine}*\n`;
    msg += `📝 Problème constaté : _${demande.description}_\n\n`;
    msg += `⚠️ Cette panne bloque notre activité ! Pouvez-vous intervenir au plus vite ? Merci.`;
    return msg;
  }
}

// Instance globale
window.whatsappEngine = new WhatsAppEngine();

