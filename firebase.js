const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json'); // match your filename

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
