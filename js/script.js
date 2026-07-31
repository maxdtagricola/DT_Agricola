/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    MÓDULO DE PRODUTOS
=========================================================*/

"use strict";

const CONFIG = {
    moeda: "pt-BR",
    moedaFormato: "BRL",
    itensPorPagina: 20
};

App.produtos = App.produtos || [];
App.editando = App.editando || null;

let paginaAtualProdutos = 1;

/*=========================================================
CARD
=========================================================*/

function criarCardProduto(produto) {

    const card = document.createElement("div");
    card.className = "produto-card";

    const podeEditar = !!(App && App.usuario);

    const imagem = document.createElement("img");
    imagem.src = Utils.normalizarImagem(produto.imagem);
    imagem.alt = produto.nome || "Produto";
    imagem.loading = "lazy";
    imagem.decoding = "async";

    const info = document.createElement("div");
    info.className = "produto-info";

    const titulo = document.createElement("h3");
    titulo.textContent = produto.nome || "";

    const marca = document.createElement("p");
    marca.innerHTML = `<strong>MARCA:</strong> ${produto.marca || "-"}`;

    const referencia = document.createElement("p");
    referencia.innerHTML = `<strong>REFERÊNCIA:</strong> ${produto.referencia || "-"}`;

    const descricao = document.createElement("p");
    descricao.textContent = produto.descricao || "";

    const estoque = document.createElement("span");
    estoque.className = "estoque";
    estoque.textContent = produto.disponibilidade || "Consulte disponibilidade";

    info.append(titulo, marca, referencia, descricao, estoque);

    if (Number(produto.valor) > 0) {
        const preco = document.createElement("p");
        preco.className = "produto-preco";
        preco.textContent = Utils.formatarMoeda(produto.valor, CONFIG.moeda, CONFIG.moedaFormato);
        info.appendChild(preco);
    }

    const botaoOrcamento = document.createElement("button");
    botaoOrcamento.type = "button";
    botaoOrcamento.className = "btn-orcamento";
    botaoOrcamento.textContent = "Solicitar Orçamento";
    botaoOrcamento.onclick = () => enviarWhatsapp(produto);
    info.appendChild(botaoOrcamento);

    if (podeEditar) {

        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "btn-cinza";
        editar.textContent = "Editar";
        editar.onclick = () => editarProduto(produto);
        info.appendChild(editar);

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "btn-cinza";
        excluir.textContent = "Excluir";
        excluir.onclick = () => excluirProduto(produto.id);
        info.appendChild(excluir);
    }

    card.append(imagem, info);
    return card;
}

/*=========================================================
RENDERIZAÇÃO + PAGINAÇÃO
    Máximo de CONFIG.itensPorPagina (20) itens exibidos por vez.
    Ao ultrapassar esse limite, o restante fica em outra página,
    navegável pelos botões Anterior/Próxima.
=========================================================*/

function renderizarProdutos(lista = App.produtos) {

    const container = $("listaProdutos");
    if (!container) return;

    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `<h3 style="text-align:center">Nenhum produto encontrado.</h3>`;
        renderizarPaginacaoProdutos(0, 1);
        return;
    }

    const totalPaginas = Utils.calcularTotalPaginas(lista.length, CONFIG.itensPorPagina);

    if (paginaAtualProdutos > totalPaginas) paginaAtualProdutos = totalPaginas;
    if (paginaAtualProdutos < 1) paginaAtualProdutos = 1;

    const paginaDeItens = Utils.paginar(lista, paginaAtualProdutos, CONFIG.itensPorPagina);
    paginaDeItens.forEach(produto => container.appendChild(criarCardProduto(produto)));

    renderizarPaginacaoProdutos(totalPaginas, paginaAtualProdutos);
}

function renderizarPaginacaoProdutos(totalPaginas, paginaAtual) {

    const el = $("paginacaoProdutos");
    if (!el) return;

    if (totalPaginas <= 1) {
        el.innerHTML = "";
        return;
    }

    el.innerHTML = `
        <button type="button" class="btn-cinza" id="btnPaginaAnterior" ${paginaAtual <= 1 ? "disabled" : ""}>
            <i class="fa-solid fa-chevron-left"></i> Anterior
        </button>
        <span class="paginacao-info">Página ${paginaAtual} de ${totalPaginas}</span>
        <button type="button" class="btn-cinza" id="btnPaginaProxima" ${paginaAtual >= totalPaginas ? "disabled" : ""}>
            Próxima <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

    const irParaPagina = (pagina) => {
        paginaAtualProdutos = pagina;
        aplicarFiltros();
        const container = $("listaProdutos");
        if (container) window.scrollTo({ top: container.offsetTop - 120, behavior: "smooth" });
    };

    $("btnPaginaAnterior")?.addEventListener("click", () => {
        if (paginaAtual > 1) irParaPagina(paginaAtual - 1);
    });

    $("btnPaginaProxima")?.addEventListener("click", () => {
        if (paginaAtual < totalPaginas) irParaPagina(paginaAtual + 1);
    });
}

/*=========================================================
FILTROS
=========================================================*/

function aplicarFiltros() {

    const texto = Utils.limparTexto($("busca")?.value || "");
    const marca = $("filtroMarca")?.value || "";
    const disponibilidade = $("filtroDisponibilidade")?.value || "";

    const resultado = App.produtos.filter(produto => {

        const combina =
            Utils.limparTexto(produto.nome).includes(texto) ||
            Utils.limparTexto(produto.referencia).includes(texto) ||
            Utils.limparTexto(produto.marca).includes(texto);

        const marcaOk = !marca || produto.marca === marca;
        const estoqueOk = !disponibilidade || produto.disponibilidade === disponibilidade;

        return combina && marcaOk && estoqueOk;
    });

    renderizarProdutos(resultado);
}

// Usada pelos campos de busca/filtro: sempre volta para a página 1,
// já que o conjunto de resultados muda.
function filtrarComReset() {
    paginaAtualProdutos = 1;
    aplicarFiltros();
}

/*=========================================================
FIRESTORE
=========================================================*/

function iniciarFirestore() {

    db.collection("produtos")
        .orderBy("nome")
        .onSnapshot(snapshot => {

            const lista = [];
            snapshot.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));

            App.produtos = Utils.ordenarPorNome(lista);
            aplicarFiltros();

        }, erro => {
            console.error("Erro Firestore (produtos):", erro);
        });
}

/*=========================================================
FORMULÁRIO
=========================================================*/

function obterDadosFormulario() {
    return {
        nome: ($("nome")?.value || "").trim(),
        marca: ($("marca")?.value || "").trim(),
        referencia: ($("referencia")?.value || "").trim(),
        categoria: ($("categoria")?.value || "").trim(),
        medidas: ($("medidas")?.value || "").trim(),
        valor: Number($("valor")?.value || 0),
        disponibilidade: $("disponibilidade")?.value || "",
        imagem: ($("imagem")?.value || "").trim(),
        descricao: ($("descricao")?.value || "").trim()
    };
}

function validarProduto(produto) {

    if (!produto.nome) {
        alert("Informe o nome.");
        return false;
    }

    if (Number.isNaN(produto.valor) || produto.valor < 0) {
        alert("Valor inválido.");
        return false;
    }

    return true;
}

async function enviarFormulario(evento) {

    evento.preventDefault();

    if (!App.usuario) {
        alert("Faça login para cadastrar/editar produtos.");
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
        console.error("Erro ao salvar produto:", erro);
        alert("Erro ao salvar produto.");
    }
}

function limparFormulario() {
    const formulario = $("formProduto");
    if (formulario) formulario.reset();
    App.editando = null;
}

/*=========================================================
WHATSAPP
=========================================================*/

function enviarWhatsapp(produto) {

    const mensagem =
`Olá! Tenho interesse no produto:

${produto.nome}
Marca: ${produto.marca || "-"}
Referência: ${produto.referencia || "-"}

Gostaria de receber um orçamento.`;

    window.open(
        `https://wa.me/${Utils.WHATSAPP1}?text=${encodeURIComponent(mensagem)}`,
        "_blank",
        "noopener"
    );
}

/*=========================================================
FIRESTORE CRUD
=========================================================*/

async function salvarProduto(dados) {
    dados.dataCadastro = firebase.firestore.FieldValue.serverTimestamp();
    dados.dataAtualizacao = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("produtos").add(dados);
    alert("Produto cadastrado!");
}

async function atualizarProduto(id, dados) {
    dados.dataAtualizacao = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("produtos").doc(id).update(dados);
    alert("Produto atualizado.");
}

async function excluirProduto(id) {

    if (!confirm("Excluir produto?")) return;

    try {
        await db.collection("produtos").doc(id).delete();
    } catch (erro) {
        console.error("Erro ao excluir produto:", erro);
        alert("Erro ao excluir.");
    }
}

/*=========================================================
EDITAR
=========================================================*/

function editarProduto(produto) {

    if (!App.usuario) {
        alert("Faça login para editar.");
        return;
    }

    const campos = ["nome", "marca", "referencia", "categoria", "medidas", "valor", "disponibilidade", "imagem", "descricao"];

    campos.forEach(campo => {
        const el = $(campo);
        if (el) el.value = produto[campo] ?? "";
    });

    App.editando = produto.id;

    const painel = $("painelAdmin");
    if (painel) window.scrollTo({ top: painel.offsetTop - 100, behavior: "smooth" });
}

/*=========================================================
INICIALIZAÇÃO
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    const formulario = $("formProduto");
    if (formulario) formulario.addEventListener("submit", enviarFormulario);

    const busca = $("busca");
    if (busca) busca.addEventListener("input", Utils.debounce(filtrarComReset, 250));

    const filtroMarca = $("filtroMarca");
    if (filtroMarca) filtroMarca.addEventListener("change", filtrarComReset);

    const filtroDisponibilidade = $("filtroDisponibilidade");
    if (filtroDisponibilidade) filtroDisponibilidade.addEventListener("change", filtrarComReset);

    // Só inicia o listener do Firestore se a página realmente tiver
    // a lista de produtos (evita leituras desnecessárias em outras
    // páginas — otimização de custo/desempenho).
    if ($("listaProdutos")) iniciarFirestore();

});
