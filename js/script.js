/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    Versão 2.0 (corrigida sem redução estrutural)
=========================================================*/

/*=========================================================
CONFIGURAÇÕES
=========================================================*/

"use strict";

const MODO_ADMIN =
    window.location.search.includes("admin") ||
    window.location.hash === "#admin";

const CONFIG = {

    whatsapp: "5569996031753",

    moeda: "pt-BR",

    moedaFormato: "BRL"

};

/*=========================================================
ESTADO DA APLICAÇÃO
    transform:
=========================================================*/

const App = {

    produtos: [],

    implementos: [],

    usuario: null,

    editando: null

};

let usuarioLogado = null;

/*=========================================================
ATALHOS
=========================================================*/

const $ = (id) => document.getElementById(id);

const $$ = (selector) => document.querySelectorAll(selector);

/*=========================================================
UTILITÁRIOS
=========================================================*/

function formatarMoeda(valor) {

    return Number(valor).toLocaleString(

        CONFIG.moeda,

        {

            style: "currency",

            currency: CONFIG.moedaFormato

        }

    );

}

function limparTexto(texto) {

    return String(texto)

        .toLowerCase()

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g, "")

        .trim();

}

function mostrarMensagem(texto) {

    alert(texto);

}
/*=========================================================
NAVEGAÇÃO (CORRIGIDA)
=========================================================*/

function mostrarAba(id) {


    const abas = document.querySelectorAll('.aba');
    const botoes = document.querySelectorAll('.menu button');

    if (!abas.length) return;

    let existe = false;

    abas.forEach(secao => {

        if (secao.id === id) {
            secao.classList.add('ativa');
            existe = true;
        } else {
            secao.classList.remove('ativa');
        }

    });

    if (!existe) {
        console.warn("Aba não encontrada:", id);
        return;
    }

    botoes.forEach(botao => {

        botao.classList.remove('ativo');

        const onclick = botao.getAttribute("onclick") || "";

        if (onclick.includes(id)) {
            botao.classList.add('ativo');
        }

    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Atualiza hash para permitir navegação via botões/link.
    // Observação: em páginas que não usam o hash para alternar abas
    // isso não precisa ser aplicado.
    try {
        if (typeof window !== "undefined") window.location.hash = id;
    } catch (e) {
        // ignora
    }
}

// Sincroniza novamente a aba com base no hash quando ele mudar
// (evita casos onde hash muda, mas aba não é re-ativada).
window.addEventListener('hashchange', () => {
    try {
        const h = (window.location.hash || '').replace('#', '');
        if (h && typeof mostrarAba === 'function') mostrarAba(h);
    } catch (e) {
        // ignora
    }
});




/*=========================================================
LOGIN
=========================================================*/

firebase.auth().onAuthStateChanged(usuario => {

    App.usuario = usuario;

    if (MODO_ADMIN) {
        atualizarPainel();
    }

});

function atualizarPainel() {

    const painel = $("painelAdmin");
    const login = $("loginModal");

    if (!painel || !login) return;

    if (!MODO_ADMIN) {
        painel.style.display = "none";
        login.style.display = "none";
        return;
    }

    if (App.usuario) {
        painel.style.display = "block";
        login.style.display = "none";
    } else {
        painel.style.display = "flex";
        login.style.display = "flex";
    }
}

function fecharLogin() {
    $("loginModal").style.display = "none";
}

async function fazerLogin() {

    const email = $("emailLogin").value.trim();
    const senha = $("senhaLogin").value;
    const erro = $("erroLogin");

    erro.textContent = "";

    try {

        await firebase.auth().signInWithEmailAndPassword(email, senha);

    } catch (e) {

        erro.textContent = "Login inválido.";

    }

}

function sair() {

    firebase.auth().signOut();

}
/*=========================================================
PRODUTOS
=========================================================*/

function criarCardProduto(produto) {

    const card = document.createElement("div");

    card.className = "produto-card";

    const adminPodeEditar = !!(typeof App !== "undefined" && App.usuario);


    const imagem = document.createElement("img");

    imagem.src = produto.imagem || "sem-imagem.png";

    imagem.alt = produto.nome;

    const info = document.createElement("div");

    info.className = "produto-info";

    const titulo = document.createElement("h3");

    titulo.textContent = produto.nome;

    const marca = document.createElement("p");

    marca.innerHTML = `<strong>MARCA:</strong> ${produto.marca}`;

    const referencia = document.createElement("p");

    referencia.innerHTML = `<strong>REFERÊNCIA:</strong> ${produto.referencia}`;

    const descricao = document.createElement("p");

    descricao.textContent = produto.descricao || "";

    const estoque = document.createElement("p");

    estoque.innerHTML = `<strong>DISPONIBILIDADE:</strong> ${produto.disponibilidade}`;

    const botao = document.createElement("button");

    botao.className = "btn-orcamento";

    botao.textContent = "Solicitar Orçamento";

    botao.onclick = () => enviarWhatsapp(produto);

    info.append(

        titulo,
        marca,
        referencia,
        descricao,
        estoque,
        botao

    );

    // Botões admin (Editar / Excluir)
    // Só renderiza para admin logado.
    if (!adminPodeEditar) {
        card.append(imagem, info);
        return card;
    }

    const editar = document.createElement("button");

    editar.className = "btn-cinza";

    editar.textContent = "Editar";

    editar.onclick = () => {
        if (typeof App === "undefined" || !App.usuario) {
            alert("Faça login no painel para editar.");
            return;
        }
        editarProduto(produto);
    };

    info.appendChild(editar);

    const excluir = document.createElement("button");

    excluir.className = "btn-cinza";

    excluir.textContent = "Excluir";

    excluir.onclick = () => {
        if (typeof App === "undefined" || !App.usuario) {
            alert("Faça login no painel para excluir.");
            return;
        }
        excluirProduto(produto.id);
    };

    info.appendChild(excluir);


    card.append(imagem, info);

    return card;

}

/*=========================================================
RENDERIZAÇÃO
=========================================================*/

function renderizarProdutos(lista = App.produtos) {

    const container = $("listaProdutos");

    if (!container) return;

    container.innerHTML = "";

    if (lista.length === 0) {

        container.innerHTML = `<h3 style="text-align:center">Nenhum produto encontrado.</h3>`;
        return;

    }

    lista.forEach(produto => {

        container.appendChild(criarCardProduto(produto));

    });

}

/*=========================================================
FILTROS
=========================================================*/

function aplicarFiltros() {

    const texto = limparTexto($("busca")?.value || "");
    const marca = $("filtroMarca")?.value || "";
    const disponibilidade = $("filtroDisponibilidade")?.value || "";

    const resultado = App.produtos.filter(produto => {

        const pesquisa =
            limparTexto(produto.nome || "").includes(texto) ||
            limparTexto(produto.referencia || "").includes(texto) ||
            limparTexto(produto.marca || "").includes(texto);

        const marcaOk = !marca || produto.marca === marca;
        const estoqueOk = !disponibilidade || produto.disponibilidade === disponibilidade;

        return pesquisa && marcaOk && estoqueOk;

    });

    renderizarProdutos(resultado);

}

/*=========================================================
FIRESTORE PRODUTOS (CORRIGIDO)
=========================================================*/

function iniciarFirestore() {

    db.collection("produtos")
        .orderBy("nome")
        .onSnapshot(snapshot => {

            App.produtos = [];

            snapshot.forEach(doc => {

                App.produtos.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            aplicarFiltros();

        }, erro => {

            console.error("Erro Firestore:", erro);

        });
}

/*=========================================================
FORMULÁRIO
=========================================================*/

const formulario = $("formProduto");

if (formulario) {

    formulario.addEventListener("submit", enviarFormulario);

}

async function enviarFormulario(event) {

    event.preventDefault();

    if (!App.usuario) {
        alert("Faça login no painel para cadastrar/editar produtos.");
        return;
    }

    const dados = obterDadosFormulario();


    if (!validarProduto(dados)) return;

    try {

        if (App.editando) {

            await atualizarProduto(App.editando, dados);

        } else {

            await salvarProduto(dados);

        }

        limparFormulario();

    } catch (erro) {

        console.error(erro);

    }

}

function obterDadosFormulario() {

    return {

        nome: $("nome")?.value.trim(),
        marca: $("marca")?.value.trim(),
        referencia: $("referencia")?.value.trim(),
        categoria: $("categoria")?.value.trim(),
        medidas: $("medidas")?.value.trim(),
        valor: Number($("valor")?.value),
        disponibilidade: $("disponibilidade")?.value,
        imagem: $("imagem")?.value.trim(),
        descricao: $("descricao")?.value.trim()

    };

}

function validarProduto(produto) {

    if (!produto.nome) {
        alert("Informe o nome.");
        return false;
    }

    if (produto.valor < 0) {
        alert("Valor inválido.");
        return false;
    }

    return true;

}

function limparFormulario() {

    formulario.reset();
    App.editando = null;

}
/*=========================================================
WHATSAPP
=========================================================*/

function enviarWhatsapp(produto) {

    const mensagem =
        `Olá!

Tenho interesse no produto:

${produto.nome}

Marca: ${produto.marca}

Referência: ${produto.referencia}

Gostaria de receber um orçamento.`;

    window.open(
        `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`,
        "_blank"
    );

}

/*=========================================================
FIRESTORE CRUD
=========================================================*/

async function salvarProduto(dados) {

    try {

        await db.collection("produtos").add(dados);

        mostrarMensagem("Produto cadastrado!");

    } catch (e) {

        console.error(e);
        mostrarMensagem("Erro ao salvar.");

    }

}

async function atualizarProduto(id, dados) {

    try {

        await db.collection("produtos").doc(id).update(dados);

        mostrarMensagem("Produto atualizado.");

    } catch (e) {

        console.error(e);

    }

}

async function excluirProduto(id) {

    if (!confirm("Excluir produto?")) return;

    try {

        await db.collection("produtos").doc(id).delete();

    } catch (e) {

        console.error(e);

    }

}
/*=========================================================
EDITAR PRODUTO
=========================================================*/

function editarProduto(produto) {

    $("nome").value = produto.nome || "";
    $("marca").value = produto.marca || "";
    $("referencia").value = produto.referencia || "";
    $("categoria").value = produto.categoria || "";
    $("medidas").value = produto.medidas || "";
    $("valor").value = produto.valor || "";
    $("disponibilidade").value = produto.disponibilidade || "";
    $("imagem").value = produto.imagem || "";
    $("descricao").value = produto.descricao || "";

    App.editando = produto.id;

    mostrarAba("produtos");

    window.scrollTo({ top: 0, behavior: "smooth" });

}
/*=========================================================
INICIALIZAÇÃO (SEM DUPLICAÇÃO)
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    console.clear();

    console.log("Daniel Tratores Agrícola");

    // Se estamos em uma página externa (produtos/implementos) e o usuário veio de index.html#posvendas/#contatos,
    // o hash pode ser sobrescrito pelo inicial mostrarAba('home').
    // Para não redirecionar/forçar Home, só inicializamos para 'home' quando não há hash já definido.
    const hashAtual = (window.location.hash || '').replace('#', '');

    console.log("Sistema iniciado");

    iniciarFirestore();

    // Se hash já vier da index.html (ex: #posvendas ou #contatos), não forçamos home.
    if (!hashAtual) mostrarAba("home");

    // admin check
    verificarRotaAdmin();

});
/*=========================================================
ROTA ADMIN
=========================================================*/

function verificarRotaAdmin() {

    const isAdminRoute =
        window.location.search.includes("admin") ||
        window.location.hash === "#admin";

    const login = $("loginModal");
    const painel = $("painelAdmin");

    if (!isAdminRoute) {

        if (login) login.style.display = "none";
        if (painel) painel.style.display = "none";

        return;

    }

    if (login) login.style.display = "flex";

}