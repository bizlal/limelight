// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyArLRFkBV2kcMoZG1l4fnnw0LPtcHM6qYg',
  authDomain: 'locartist-c2410.firebaseapp.com',
  databaseURL: 'https://locartist-c2410.firebaseio.com',
  projectId: 'locartist-c2410',
  storageBucket: 'locartist-c2410.appspot.com',
  messagingSenderId: '264476583185',
  appId: '1:264476583185:web:e334373ff822e57f',
  measurementId: 'G-RRDM0D4DET',
};

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);

export default firebase;
