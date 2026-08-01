/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    NAVEGAÇÃO
    Compartilhado por todas as páginas. Cada página tem apenas
    uma <section class="aba">; esta função garante que ela fique
    visível e destaca o link correspondente no menu.
=========================================================*/

"use strict";

const $ = (id) => document.getElementById(id);
const $$ = (seletor) => document.querySelectorAll(seletor);

function mostrarAba(id) {

    const abas = document.querySelectorAll(".aba");
    const links = document.querySelectorAll(".menu a, .menu button");

    if (!abas.length) return;

    let existe = false;

    abas.forEach(secao => {
        if (secao.id === id) {
            secao.classList.add("ativa");
            existe = true;
        } else {
            secao.classList.remove("ativa");
        }
    });

    if (!existe) {
        console.warn("Aba não encontrada:", id);
        return;
    }

    links.forEach(link => {
        link.classList.toggle("ativo", link.dataset.aba === id);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Ativa automaticamente a (única) aba presente na página assim que o
// DOM estiver pronto — elimina os pequenos scripts inline duplicados
// que existiam em cada página só para chamar mostrarAba('produtos'),
// mostrarAba('implementos') etc.
document.addEventListener("DOMContentLoaded", () => {
    const idAtual = document.querySelector(".aba")?.id;
    if (idAtual) mostrarAba(idAtual);
});
