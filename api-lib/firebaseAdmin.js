import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    apiKey: 'AIzaSyArLRFkBV2kcMoZG1l4fnnw0LPtcHM6qYg',
    authDomain: 'locartist-c2410.firebaseapp.com',
    databaseURL: 'https://locartist-c2410.firebaseio.com',
    projectId: 'locartist-c2410',
    storageBucket: 'locartist-c2410.appspot.com',
    messagingSenderId: '264476583185',
    appId: '1:264476583185:web:e334373ff822e57f',
    measurementId: 'G-RRDM0D4DET',
  });
}

export default admin;
