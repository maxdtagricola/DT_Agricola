/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    MÓDULO DE IMPLEMENTOS
=========================================================*/

"use strict";

const Implementos = {
    lista: [],
    editando: null,
    formulario: null,
    container: null
};

document.addEventListener("DOMContentLoaded", () => {
    iniciarModuloImplementos();
});

function iniciarModuloImplementos() {

    Implementos.formulario = document.getElementById("formImplemento");
    Implementos.container = document.getElementById("listaImplementos");

    registrarEventosImplementos();
    registrarEfeito3D();

    // Só inicia o listener do Firestore se a página tiver a lista
    // de implementos (otimização — evita leituras desnecessárias).
    if (Implementos.container) iniciarFirestoreImplementos();
}

function registrarEventosImplementos() {
    if (!Implementos.formulario) return;
    Implementos.formulario.addEventListener("submit", salvarImplemento);
}

/*=========================================================
EFEITO 3D (mousemove)
    O CSS já previa as variáveis --mx/--my para o brilho que
    acompanha o mouse, mas nada as atualizava. Este listener
    corrige isso.
=========================================================*/

function registrarEfeito3D() {

    if (!Implementos.container) return;

    Implementos.container.addEventListener("mousemove", (evento) => {

        const alvo = evento.target.closest(".implemento-3d");
        if (!alvo) return;

        const retangulo = alvo.getBoundingClientRect();
        const mx = ((evento.clientX - retangulo.left) / retangulo.width) * 100;
        const my = ((evento.clientY - retangulo.top) / retangulo.height) * 100;

        alvo.style.setProperty("--mx", `${mx}%`);
        alvo.style.setProperty("--my", `${my}%`);
    });
}

/*=========================================================
FIRESTORE
=========================================================*/

function iniciarFirestoreImplementos() {

    db.collection("implementos")
        .orderBy("nome")
        .onSnapshot(snapshot => {

            const lista = [];
            snapshot.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));

            // Ordena no cliente (localeCompare pt-BR) depois de
            // montar a lista — antes essa chamada acontecia sobre o
            // array ainda vazio, então nunca fazia efeito de fato.
            Implementos.lista = Utils.ordenarPorNome(lista);

            renderizarImplementos();

        }, erro => {
            console.error("Erro Firestore (implementos):", erro);
        });
}

/*=========================================================
RENDERIZAÇÃO
=========================================================*/

function renderizarImplementos() {

    if (!Implementos.container) return;

    Implementos.container.innerHTML = "";

    if (Implementos.lista.length === 0) {
        renderizarEstadoVazioImplementos();
        return;
    }

    Implementos.lista.forEach(item => {
        Implementos.container.appendChild(criarCardImplemento(item));
    });
}

function criarCardImplemento(item) {

    const card = document.createElement("div");
    card.className = "implemento-card";

    const podeEditar = !!(App && App.usuario);

    card.innerHTML = `
        <div class="implemento-3d">
            <div class="implemento-detalhes">
                <div class="implemento-imagem">
                    <img src="${Utils.normalizarImagem(item.imagem)}" alt="${item.nome || "Implemento"}" loading="lazy" decoding="async">
                </div>
                <div class="implemento-info">
                    <h2>${item.nome || ""}</h2>
                    <p><strong>Marca:</strong> ${item.marca || "-"}</p>
                    <p><strong>Categoria:</strong> ${item.categoria || "-"}</p>
                    <p><strong>Referência:</strong> ${item.referencia || "-"}</p>
                    <p><strong>Descrição:</strong><br>${item.descricao || ""}</p>
                    <button type="button" class="btn-verde btn-orcamento">Solicitar orçamento</button>
                </div>
            </div>
        </div>
    `;

    card.querySelector(".btn-orcamento").onclick = () => enviarWhatsappImplemento(item);

    if (podeEditar) {

        const area = document.createElement("div");
        area.className = "acoes-implemento";
        area.innerHTML = `
            <button type="button" class="btn-cinza btn-editar">Editar</button>
            <button type="button" class="btn-cinza btn-excluir">Excluir</button>
        `;

        area.querySelector(".btn-editar").onclick = () => editarImplemento(item);
        area.querySelector(".btn-excluir").onclick = () => excluirImplemento(item.id);

        card.querySelector(".implemento-info").appendChild(area);
    }

    return card;
}

/*=========================================================
EDITAR
    Alinhado aos campos que realmente existem no formulário
    (nome, marca, categoria, imagem, descrição). Antes o código
    tentava preencher impModelo/impValor/impDisponibilidade, que
    nunca existiram no HTML.
=========================================================*/

function editarImplemento(item) {

    if (!App.usuario) {
        alert("Faça login para editar.");
        return;
    }

    const painel = document.getElementById("painelImplementos");
    const mapa = {
        impNome: "nome",
        impMarca: "marca",
        impCategoria: "categoria",
        impImagem: "imagem",
        impDescricao: "descricao"
    };

    Object.entries(mapa).forEach(([idCampo, chave]) => {
        const el = document.getElementById(idCampo);
        if (el) el.value = item[chave] || "";
    });

    Implementos.editando = item.id;

    if (painel) window.scrollTo({ top: painel.offsetTop - 100, behavior: "smooth" });
}

/*=========================================================
FORMULÁRIO
=========================================================*/

function obterDadosImplemento() {
    return {
        nome: (document.getElementById("impNome")?.value || "").trim(),
        marca: (document.getElementById("impMarca")?.value || "").trim(),
        categoria: (document.getElementById("impCategoria")?.value || "").trim(),
        imagem: (document.getElementById("impImagem")?.value || "").trim(),
        descricao: (document.getElementById("impDescricao")?.value || "").trim()
    };
}

function validarImplemento(dados) {
    if (!dados.nome) {
        alert("Informe o nome.");
        return false;
    }
    return true;
}

async function salvarImplemento(evento) {

    evento.preventDefault();

    if (!App.usuario) {
        alert("Faça login para cadastrar/editar implementos.");
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

    if (!confirm("Deseja realmente excluir este implemento?")) return;

    try {
        await db.collection("implementos").doc(id).delete();
        alert("Implemento removido.");
    } catch (erro) {
        console.error("Erro ao excluir implemento:", erro);
        alert("Erro ao excluir.");
    }
}

/*=========================================================
NOVO / ATUALIZAR
=========================================================*/

async function adicionarImplemento(dados) {
    dados.dataCadastro = firebase.firestore.FieldValue.serverTimestamp();
    dados.dataAtualizacao = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("implementos").add(dados);
}

async function atualizarImplemento(id, dados) {
    dados.dataAtualizacao = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("implementos").doc(id).update(dados);
}

/*=========================================================
LIMPAR / ESTADO VAZIO
=========================================================*/

function limparFormularioImplemento() {
    if (Implementos.formulario) Implementos.formulario.reset();
    Implementos.editando = null;
}

function cancelarEdicao() {
    limparFormularioImplemento();
}

function renderizarEstadoVazioImplementos() {

    if (!Implementos.container) return;

    Implementos.container.innerHTML = `
        <div class="implementos-vazio">
            <i class="fa-solid fa-tractor"></i>
            <h2>Nenhum implemento cadastrado</h2>
            <p>Os implementos cadastrados aparecerão aqui.</p>
        </div>
    `;
}

/*=========================================================
WHATSAPP
    Antes usava um número diferente (e incompleto — faltava um
    dígito) do resto do site. Agora usa a mesma fonte (Utils.WHATSAPP)
    que produtos e todos os links de contato.
=========================================================*/

function enviarWhatsappImplemento(item) {

    const mensagem =
`Olá! Tenho interesse neste implemento:

${item.nome}
Marca: ${item.marca || "-"}
Categoria: ${item.categoria || "-"}

Gostaria de receber um orçamento.`;

    window.open(
        `https://wa.me/${Utils.WHATSAPP}?text=${encodeURIComponent(mensagem)}`,
        "_blank",
        "noopener"
    );
}
