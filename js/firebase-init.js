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

// Cache local (IndexedDB) do Firestore: dados já lidos ficam salvos no
// navegador e são reaproveitados em visitas futuras — reduz leitura
// no servidor sem precisar de nenhuma mudança nas páginas. Se falhar
// (ex: várias abas do site abertas ao mesmo tempo em navegadores mais
// antigos, ou navegador sem suporte), o site continua funcionando
// normalmente, só sem esse cache extra.
try {
    db.enablePersistence({ synchronizeTabs: true }).catch(erro => {
        if (erro.code === "failed-precondition") {
            console.warn("Cache offline do Firestore não pôde ser ativado (múltiplas abas).");
        } else if (erro.code === "unimplemented") {
            console.warn("Cache offline do Firestore: navegador sem suporte.");
        }
    });
} catch (erro) {
    console.warn("Cache offline do Firestore indisponível:", erro);
}
