/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    MÓDULO DE IMPLEMENTOS
=========================================================*/

"use strict";

/*=========================================================
ESTADO
=========================================================*/

const Implementos = {

    lista: [],

    editando: null,

    formulario: null,

    container: null

};

/*=========================================================
INICIALIZAÇÃO
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    iniciarModuloImplementos();

});

function iniciarModuloImplementos() {

    Implementos.formulario = document.getElementById("formImplemento");

    Implementos.container = document.getElementById("listaImplementos");

    registrarEventosImplementos();

    iniciarFirestoreImplementos();

}

/*=========================================================
EVENTOS
=========================================================*/

function registrarEventosImplementos() {

    if (!Implementos.formulario) return;

    Implementos.formulario.addEventListener(

        "submit",

        salvarImplemento

    );

}

/*=========================================================
FIRESTORE
=========================================================*/

function iniciarFirestoreImplementos() {

    db.collection("implementos")

        .orderBy("nome")

        .onSnapshot(snapshot => {

            Implementos.lista = [];

            ordenarImplementos();

            snapshot.forEach(doc => {

                Implementos.lista.push({

                    id: doc.id,

                    ...doc.data()

                });

            });

            renderizarImplementos();

        });

}

/*=========================================================
RENDERIZAÇÃO
=========================================================*/

function renderizarImplementos() {

    if (!Implementos.container) return;

    Implementos.container.innerHTML = "";

    if (Implementos.lista.length === 0) {

        renderizarEstadoVazio();

        return;

    }
    Implementos.lista.forEach(item => {

        Implementos.container.appendChild(

            criarCardImplemento(item)

        );

    });

}

/*=========================================================
CARD
=========================================================*/

/*=========================================================
CARD IMPLEMENTO
=========================================================*/

function criarCardImplemento(item) {

    const card = document.createElement("div");

    card.className = "implemento-card";

    // Wrapper para efeito 3D (CSS usa .implemento-3d + variáveis CSS --mx/--my)
    card.innerHTML = `
        <div class="implemento-3d">

        <div class="implemento-detalhes">

            <div class="implemento-imagem">

                <img src="${normalizarImagemImplemento(item.imagem)}" alt="${item.nome}">

            </div>

            <div class="implemento-info">

                <h2>${item.nome}</h2>

                <p><strong>Marca:</strong> ${item.marca || "-"}</p>

                <p><strong>Categoria:</strong> ${item.categoria || "-"}</p>

                <p><strong>Referência:</strong> ${item.referencia || "-"}</p>

                <p><strong>Descrição:</strong><br>${item.descricao || ""}</p>

                <button class="btn-verde btn-orcamento">
                    Solicitar orçamento
                </button>





            </div>

        </div>

    `;

    card.querySelector(".btn-orcamento").onclick = () => {

        enviarWhatsappImplemento(item);

    };

    // Botões admin (Editar / Excluir)
    // Só renderiza para admin logado.
    if (typeof App === "undefined" || !App.usuario) {
        return card;
    }

    const area = document.createElement("div");
    area.className = "acoes-implemento";
    area.innerHTML = `
        <button type="button" class="btn-cinza btn-editar">Editar</button>
        <button type="button" class="btn-cinza btn-excluir">Excluir</button>
    `;

    const editarBtn = area.querySelector(".btn-editar");
    const excluirBtn = area.querySelector(".btn-excluir");

    editarBtn.onclick = () => {
        if (typeof App === "undefined" || !App.usuario) {
            alert("Faça login no painel para editar.");
            return;
        }
        editarImplemento(item);
    };

    excluirBtn.onclick = () => {
        if (typeof App === "undefined" || !App.usuario) {
            alert("Faça login no painel para excluir.");
            return;
        }
        excluirImplemento(item.id);
    };

    // Mostra/oculta conforme login atual
    if (typeof App !== "undefined" && App.usuario) {
        card.querySelector(".implemento-info").appendChild(area);
    }

    // Se o admin logar depois, re-render vai acontecer via snapshot.


    return card;

}

/*=========================================================
EDITAR
=========================================================*/

function editarImplemento(item) {

    const painel = document.getElementById("painelImplementos");

    const impNome = document.getElementById("impNome");
    const impMarca = document.getElementById("impMarca");
    const impCategoria = document.getElementById("impCategoria");
    const impModelo = document.getElementById("impModelo");
    const impValor = document.getElementById("impValor");
    const impDisponibilidade = document.getElementById("impDisponibilidade");
    const impImagem = document.getElementById("impImagem");
    const impDescricao = document.getElementById("impDescricao");

    // Se algum campo não existir, o HTML está incompatível com o JS.
    // Como o painel está atualmente com apenas campos impNome/impMarca/impCategoria/impImagem/impDescricao,
    // vamos preencher o que existir e não quebrar o clique.

    if (impNome) impNome.value = item.nome || "";
    if (impMarca) impMarca.value = item.marca || "";
    if (impCategoria) impCategoria.value = item.categoria || "";

    if (impModelo) impModelo.value = item.modelo || "";
    if (impValor) impValor.value = item.valor || "";
    if (impDisponibilidade) impDisponibilidade.value = item.disponibilidade || "Em estoque";
    if (impImagem) impImagem.value = item.imagem || "";
    if (impDescricao) impDescricao.value = item.descricao || "";

    Implementos.editando = item.id;

    if (painel) {

        painel.style.display = "block";

        window.scrollTo({

            top: painel.offsetTop,

            behavior: "smooth"

        });

    }

}

/*=========================================================
FORMULÁRIO
=========================================================*/

function obterDadosImplemento() {

    const impNome = document.getElementById("impNome");
    const impMarca = document.getElementById("impMarca");
    const impCategoria = document.getElementById("impCategoria");
    const impModelo = document.getElementById("impModelo");
    const impValor = document.getElementById("impValor");
    const impDisponibilidade = document.getElementById("impDisponibilidade");
    const impImagem = document.getElementById("impImagem");
    const impDescricao = document.getElementById("impDescricao");

    return {

        nome: (impNome?.value || "").trim(),

        marca: (impMarca?.value || "").trim(),

        categoria: (impCategoria?.value || "").trim(),

        modelo: (impModelo?.value || "").trim(),

        valor: Number((impValor?.value || 0)),

        disponibilidade: (impDisponibilidade?.value || ""),

        imagem: (impImagem?.value || "").trim(),

        descricao: (impDescricao?.value || "").trim(),

        dataCadastro: new Date()

    };

}

/*=========================================================
VALIDAÇÃO
=========================================================*/

function validarImplemento(dados) {

    if (!dados.nome) {

        alert("Informe o nome.");

        return false;

    }

    // imagem não é obrigatório: só valide se o campo existir
    if (dados.imagem === "") {

        // se você preferir obrigar imagem, troque para return false
        // alert("Informe a imagem.");

    }

    if (Number.isNaN(dados.valor) || dados.valor < 0) {

        alert("Valor inválido.");

        return false;

    }

    return true;

}

/*=========================================================
SALVAR
=========================================================*/

async function salvarImplemento(event) {

    event.preventDefault();

    if (typeof App === "undefined" || !App.usuario) {
        alert("Faça login no painel para cadastrar/editar implementos.");
        return;
    }

    try {

        const dados = obterDadosImplemento();

        if (!validarImplemento(dados)) return;

        if (Implementos.editando) {

            await atualizarImplemento(Implementos.editando, dados);

        } else {

            await adicionarImplemento(dados);

        }

        // garante re-render via snapshot
        limparFormularioImplemento();

        alert("Implemento salvo com sucesso.");

    } catch (erro) {

        console.error("Erro ao salvar implemento:", erro);

        alert("Erro ao salvar.");

    }

}

/*=========================================================
EXCLUIR
=========================================================*/

async function excluirImplemento(id) {

    const confirmar = confirm(

        "Deseja realmente excluir este implemento?"

    );

    if (!confirmar) return;

    try {

        await db

            .collection("implementos")

            .doc(id)

            .delete();

        alert("Implemento removido.");

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao excluir.");

    }

}

/*=========================================================
NOVO IMPLEMENTO
=========================================================*/

async function adicionarImplemento(dados) {

    dados.dataCadastro =
        firebase.firestore.FieldValue.serverTimestamp();

    dados.dataAtualizacao =
        firebase.firestore.FieldValue.serverTimestamp();

    await db
        .collection("implementos")
        .add(dados);

}

/*=========================================================
ATUALIZAR
=========================================================*/

async function atualizarImplemento(id, dados) {

    dados.dataAtualizacao =
        firebase.firestore.FieldValue.serverTimestamp();

    await db
        .collection("implementos")
        .doc(id)
        .update(dados);

}

/*=========================================================
LIMPAR
=========================================================*/

function limparFormularioImplemento() {

    Implementos.formulario.reset();

    Implementos.editando = null;

}

function normalizarImagemImplemento(url) {

    if (!url) return "sem-imagem.png";

    const u = String(url).trim();

    if (!u) return "sem-imagem.png";

    // Se for relativo (ex: /images/x.jpg), tenta usar como está.
    return u;

}

function enviarWhatsappImplemento(item) {

    const mensagem = `Olá!

Tenho interesse neste implemento.

Nome: ${item.nome}

Marca: ${item.marca}

Categoria: ${item.categoria}

Gostaria de receber um orçamento.`;

    window.open(

        `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`,

        "_blank"

    );

}

/*=========================================================
ESTADO VAZIO
=========================================================*/

function renderizarEstadoVazio() {

    if (!Implementos.container) return;

    Implementos.container.innerHTML = `

        <div class="implementos-vazio">

            <i class="fa-solid fa-tractor"></i>

            <h2>

                Nenhum implemento cadastrado

            </h2>

            <p>

                Os implementos cadastrados aparecerão aqui.

            </p>

        </div>

    `;

}

/*=========================================================
ORDENAR
=========================================================*/

function ordenarImplementos() {

    Implementos.lista.sort((a, b) => {

        return a.nome.localeCompare(

            b.nome,

            "pt-BR"

        );

    });

}

/*=========================================================
PESQUISA
=========================================================*/

function pesquisarImplementos(texto) {

    texto = texto

        .toLowerCase()

        .trim();

    const lista = Implementos.lista.filter(item => {

        return (

            item.nome

                .toLowerCase()

                .includes(texto)

            ||

            (item.marca || "")

                .toLowerCase()

                .includes(texto)

            ||

            (item.categoria || "")

                .toLowerCase()

                .includes(texto)

        );

    });

    renderizarLista(lista);

}

function renderizarLista(lista) {

    Implementos.container.innerHTML = "";

    lista.forEach(item => {

        Implementos.container.appendChild(

            criarCardImplemento(item)

        );

    });

}

function cancelarEdicao() {

    limparFormularioImplemento();

}
