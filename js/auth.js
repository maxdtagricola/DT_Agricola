/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    AUTENTICAÇÃO
    Substitui o antigo "modo admin" (?admin na URL + modal).
    Login de verdade, em página própria (pages/login.html).
    Quem estiver autenticado no Firebase Auth vê os painéis de
    cadastro em Produtos e Implementos, em qualquer página.
=========================================================*/

"use strict";

const App = window.App || {};
App.usuario = App.usuario || null;
window.App = App;

function atualizarUiAutenticacao(usuario) {

    App.usuario = usuario;

    // Link "Login" / "Sair" no menu (presente em todas as páginas).
    const linkAuth = $("navAuth");
    if (linkAuth) {
        if (usuario) {
            linkAuth.textContent = "Sair";
            linkAuth.setAttribute("href", "#");
            linkAuth.onclick = (evento) => {
                evento.preventDefault();
                sair();
            };
        } else {
            linkAuth.textContent = "Login";
            linkAuth.onclick = null;
            linkAuth.setAttribute("href", linkAuth.dataset.loginHref || "./login.html");
        }
    }

    // Painéis administrativos — só existem nas páginas de Produtos
    // e Implementos.
    const painelProdutos = $("painelAdmin");
    if (painelProdutos) painelProdutos.style.display = usuario ? "block" : "none";

    const painelImplementos = $("painelImplementos");
    if (painelImplementos) painelImplementos.style.display = usuario ? "block" : "none";

    // Página de login: alterna entre o formulário e o aviso de
    // "já conectado".
    const areaLogin = $("areaLogin");
    const areaLogado = $("areaLogado");
    if (areaLogin && areaLogado) {
        areaLogin.style.display = usuario ? "none" : "block";
        areaLogado.style.display = usuario ? "block" : "none";
    }

    // Re-renderiza as listas para mostrar/ocultar os botões de
    // Editar/Excluir de cada card.
    if (typeof aplicarFiltros === "function") aplicarFiltros();
    if (typeof renderizarImplementos === "function" && typeof Implementos !== "undefined") {
        renderizarImplementos();
    }
}

firebase.auth().onAuthStateChanged(atualizarUiAutenticacao);

async function fazerLogin() {

    const campoEmail = $("emailLogin");
    const campoSenha = $("senhaLogin");
    const erro = $("erroLogin");

    if (!campoEmail || !campoSenha) return;

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    if (erro) erro.textContent = "";

    if (!email || !senha) {
        if (erro) erro.textContent = "Preencha e-mail e senha.";
        return;
    }

    try {
        await firebase.auth().signInWithEmailAndPassword(email, senha);
        window.location.href = "../index.html";
    } catch (e) {
        if (erro) erro.textContent = "Login inválido. Verifique e-mail e senha.";
    }
}

function sair() {
    firebase.auth().signOut();
}

document.addEventListener("DOMContentLoaded", () => {
    const formulario = $("formLogin");
    if (formulario) {
        formulario.addEventListener("submit", (evento) => {
            evento.preventDefault();
            fazerLogin();
        });
    }
});
