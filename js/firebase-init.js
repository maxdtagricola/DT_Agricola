/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    INICIALIZAÇÃO DO FIREBASE
    Antes esse bloco vinha copiado (inline) em toda página HTML.
    Centralizado aqui: um único lugar para manter/alterar a
    configuração do projeto Firebase.
=========================================================*/

"use strict";

const firebaseConfig = {
    apiKey: "AIzaSyC23KJZEqvrsvhZBiMmIPPDj3lmi1bcW3E",
    authDomain: "daniel-tratores.firebaseapp.com",
    projectId: "daniel-tratores",
    storageBucket: "daniel-tratores.firebasestorage.app",
    messagingSenderId: "827204727665",
    appId: "1:827204727665:web:4e95eb451cbb66fd243cd0"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
