// List of disposable/temporary email domains to block
// Updated regularly - add more as needed
const disposableDomains = [
  // Popular temporary email services
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz', 'guerrillamail.de',
  'mailinator.com', 'mailinator.net', 'mailinator2.com',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'temp-mail.com',
  'throwaway.email', 'throwawaymail.com',
  'maildrop.cc', 'maildrop.com',
  'getnada.com', 'nada.email',
  'trashmail.com', 'trashmail.net',
  'yopmail.com', 'yopmail.net', 'yopmail.fr',
  'fakeinbox.com', 'fakemail.net',
  'mailnesia.com', 'mailnator.com',
  'sharklasers.com', 'guerrillamailblock.com',
  'dispostable.com', 'mailtemp.info',
  'mytemp.email', 'tempinbox.com',
  'mintemail.com', 'mohmal.com',
  'emailondeck.com', 'spamgourmet.com',
  'inbox.com', 'discard.email',
  'mvrht.com', 'spambog.com',
  'incognitomail.com', 'anonymbox.com',
  'tmpeml.info', 'emailtemporanea.com',
  'emkei.cf', 'emkei.ga', 'emkei.gq', 'emkei.ml', 'emkei.tk',
  'squizzy.de', 'mailcatch.com',
  'tempmail.net', 'tempmail.us',
  '20minutemail.com', '33mail.com',
  'spam4.me', 'spambox.us',
  'mailexpire.com', 'emailsensei.com',
  'anonymousemail.me', 'anonbox.net',
  'jetable.org', 'drdrb.com',
  'jourrapide.com', 'teleworm.us',
  'rhyta.com', 'dayrep.com',
  'armyspy.com', 'einrot.com',
  'fleckens.hu', 'gustr.com',
  'superrito.com', 'cuvox.de',
  
  // Less common but still blocked
  'mailforspam.com', 'spambox.info',
  'binkmail.com', 'bobmail.info',
  'dumpmail.de', 'kasmail.com',
  'trashmailer.com', 'wegwerfmail.de',
  'wegwerfmail.net', 'wegwerfmail.org',
  'zoemail.org', 'zetmail.com',
  'mytrashmail.com', 'jetable.fr.nf',
  'getairmail.com', 'filzmail.com',
  'dingbone.com', 'clipmail.eu',
  'bugmenot.com', 'slaskpost.se',
  'sofimail.com', 'trbvm.com',
  'bareed.ws', 'instant-mail.de',
  'smashmail.de', 'trashmail.ws',
  'gishpuppy.com', 'fastmail.com',
  'grr.la', 'get1mail.com',
  'selfdestructingmail.com', 'deadaddress.com',
  'mail-temporaire.fr', 'maileater.com',
  'owlpic.com', 'fudgerub.com',
  'lookugly.com', 'put2.net',
  'shortmail.net', 'uroid.com',
  'whatpaas.com', 'mfsa.ru',
  'spamthisplease.com', 'boun.cr',
  'spamfree24.org', 'spamfree24.de',
  'spamfree24.info', 'spamfree24.net',
  'willselfdestruct.com', 'sneakemail.com',
  'hidemail.de', 'nepwk.com',
  'mailzi.ru', 'meltmail.com',
  'pokemail.net', 'pookmail.com',
  'e4ward.com', 'emailias.com'
];

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}

function getDisposableDomainsList() {
  return disposableDomains;
}

module.exports = {
  isDisposableEmail,
  getDisposableDomainsList,
  disposableDomains
};
