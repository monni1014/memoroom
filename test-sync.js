const { syncEmails } = require('./src/lib/email-sync');
syncEmails().then(console.log).catch(console.error);
