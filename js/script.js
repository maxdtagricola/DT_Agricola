/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    MÓDULO DE PRODUTOS
    Reescrito para minimizar leitura do Firestore:
      - 20 itens por página, lidos sob demanda (nunca a coleção
        inteira).
      - Paginação por cursor (startAfter), sem offset.
      - Cache em memória por combinação de busca/filtro — página
        já visitada nunca é lida de novo na mesma sessão.
      - Busca por nome/referência direto no Firestore (prefixo),
        usando campos-sombra normalizados (nomeBusca/referenciaBusca)
        pra funcionar sem depender de maiúsculas/acentos.
      - onSnapshot (tempo real) só na página atualmente visível E
        só quando há admin logado; getDocs (get()) em todo o resto.
=========================================================*/

"use strict";

const CONFIG = {
    moeda: "pt-BR",
    moedaFormato: "BRL",
    itensPorPagina: 20
};

App.produtos = App.produtos || []; // itens da página atual (não mais a coleção inteira)
App.editando = App.editando || null;

let paginaAtualProdutos = 1;
let listenerPaginaAtual = null; // função de "unsubscribe" do onSnapshot ativo (admin), se houver

// Map<chaveConsulta, Map<numeroPagina, {itens, ultimoDoc, temProximaPagina}>>
const cachePaginasProdutos = new Map();
// Map<chaveConsulta, number|null> — null = contagem indisponível (SDK sem suporte a count())
const cacheContagemProdutos = new Map();

/*=========================================================
CONFIGURAÇÃO ATUAL DE BUSCA/FILTROS
=========================================================*/

function obterConfiguracaoAtual() {
    return {
        busca: Utils.limparTexto($("busca")?.value || ""),
        buscaReferencia: Utils.limparTexto($("buscaReferencia")?.value || ""),
        marca: $("filtroMarca")?.value || "",
        disponibilidade: $("filtroDisponibilidade")?.value || ""
    };
}

// Só um "modo" de consulta ativo por vez — buscar por referência tem
// prioridade sobre buscar por nome, que tem prioridade sobre os
// filtros de marca/disponibilidade. Combinar todos ao mesmo tempo
// exigiria vários índices compostos a mais no Firestore sem
// necessidade real.
function modoConsultaAtual(config) {
    if (config.buscaReferencia) return "referencia";
    if (config.busca) return "nome-busca";
    return "navegacao";
}

/*=========================================================
MONTAGEM DA CONSULTA NO FIRESTORE
=========================================================*/

function montarConsultaProdutos(config) {

    const modo = modoConsultaAtual(config);

    if (modo === "referencia") {
        const termo = config.buscaReferencia;
        return db.collection("produtos")
            .orderBy("referenciaBusca")
            .where("referenciaBusca", ">=", termo)
            .where("referenciaBusca", "<=", termo + "\uf8ff");
    }

    if (modo === "nome-busca") {
        const termo = config.busca;
        return db.collection("produtos")
            .orderBy("nomeBusca")
            .where("nomeBusca", ">=", termo)
            .where("nomeBusca", "<=", termo + "\uf8ff");
    }

    let query = db.collection("produtos").orderBy("nome");
    if (config.marca) query = query.where("marca", "==", config.marca);
    if (config.disponibilidade) query = query.where("disponibilidade", "==", config.disponibilidade);
    return query;
}

/*=========================================================
BUSCA DE UMA PÁGINA (com cache + cursor)
=========================================================*/

async function buscarPaginaProdutos(numeroPagina, config) {

    const chave = Utils.gerarChaveConsulta(config);

    if (!cachePaginasProdutos.has(chave)) cachePaginasProdutos.set(chave, new Map());
    const paginasDaConsulta = cachePaginasProdutos.get(chave);

    if (paginasDaConsulta.has(numeroPagina)) {
        return paginasDaConsulta.get(numeroPagina); // já em cache — nenhuma leitura
    }

    const { paginaBase, faltantes } = Utils.planejarBusca([...paginasDaConsulta.keys()], numeroPagina);
    let cursorAtual = paginaBase > 0 ? paginasDaConsulta.get(paginaBase)?.ultimoDoc : null;

    for (const pagina of faltantes) {

        let query = montarConsultaProdutos(config).limit(CONFIG.itensPorPagina);
        if (cursorAtual) query = query.startAfter(cursorAtual);

        const snapshot = await query.get(); // leitura única — nunca onSnapshot aqui

        const itens = [];
        snapshot.forEach(doc => itens.push({ id: doc.id, ...doc.data() }));

        const ultimoDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        const dadosPagina = {
            itens,
            ultimoDoc,
            temProximaPagina: itens.length === CONFIG.itensPorPagina
        };

        paginasDaConsulta.set(pagina, dadosPagina);
        cursorAtual = ultimoDoc;

        if (itens.length < CONFIG.itensPorPagina) break; // acabaram os itens
    }

    return paginasDaConsulta.get(numeroPagina) || { itens: [], ultimoDoc: null, temProximaPagina: false };
}

/*=========================================================
CONTAGEM TOTAL (pra numerar as páginas) — usa count(), que é
uma leitura MUITO mais barata que baixar os documentos.
=========================================================*/

async function obterContagemProdutos(config) {

    const chave = Utils.gerarChaveConsulta(config);

    if (cacheContagemProdutos.has(chave)) {
        return cacheContagemProdutos.get(chave);
    }

    let total = null;

    try {
        const query = montarConsultaProdutos(config);
        if (typeof query.count === "function") {
            const resultado = await query.count().get();
            total = resultado.data().count;
        }
    } catch (erro) {
        console.error("Erro ao contar produtos:", erro);
        total = null;
    }

    cacheContagemProdutos.set(chave, total);
    return total;
}

function invalidarCacheProdutos() {
    cachePaginasProdutos.clear();
    cacheContagemProdutos.clear();
}

/*=========================================================
NAVEGAÇÃO ENTRE PÁGINAS
=========================================================*/

async function irParaPaginaProdutos(numeroPagina) {

    const container = $("listaProdutos");
    if (!container) return;

    const config = obterConfiguracaoAtual();

    if (numeroPagina < 1) numeroPagina = 1;
    paginaAtualProdutos = numeroPagina;

    const dadosPagina = await buscarPaginaProdutos(numeroPagina, config);

    // Se pedimos uma página vazia além do fim (ex: base de dados
    // encolheu), volta pra última página que tem itens.
    if (dadosPagina.itens.length === 0 && numeroPagina > 1) {
        paginaAtualProdutos = numeroPagina - 1;
        return irParaPaginaProdutos(paginaAtualProdutos);
    }

    App.produtos = dadosPagina.itens;
    renderizarProdutosAtuais();

    const total = await obterContagemProdutos(config);
    renderizarPaginacaoProdutos(total, paginaAtualProdutos, dadosPagina.temProximaPagina);

    ativarListenerPaginaAtual(config, paginaAtualProdutos);
}

// Listener "ao vivo" (onSnapshot) só na página que está na tela agora,
// e só quando há um admin logado — visitante nunca mantém conexão
// aberta (evita leituras contínuas desnecessárias).
function ativarListenerPaginaAtual(config, numeroPagina) {

    if (listenerPaginaAtual) {
        listenerPaginaAtual();
        listenerPaginaAtual = null;
    }

    if (!App.usuario) return;

    const chave = Utils.gerarChaveConsulta(config);
    const paginaAnterior = cachePaginasProdutos.get(chave)?.get(numeroPagina - 1);

    let query = montarConsultaProdutos(config).limit(CONFIG.itensPorPagina);
    if (paginaAnterior?.ultimoDoc) query = query.startAfter(paginaAnterior.ultimoDoc);

    listenerPaginaAtual = query.onSnapshot(snapshot => {

        const itens = [];
        snapshot.forEach(doc => itens.push({ id: doc.id, ...doc.data() }));

        App.produtos = itens;
        renderizarProdutosAtuais();

        const ultimoDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        cachePaginasProdutos.get(chave)?.set(numeroPagina, {
            itens,
            ultimoDoc,
            temProximaPagina: itens.length === CONFIG.itensPorPagina
        });

    }, erro => {
        console.error("Erro no listener da página atual:", erro);
    });
}

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
RENDERIZAÇÃO
=========================================================*/

function renderizarProdutosAtuais() {

    const container = $("listaProdutos");
    if (!container) return;

    container.innerHTML = "";

    if (App.produtos.length === 0) {
        container.innerHTML = `<h3 style="text-align:center">Nenhum produto encontrado.</h3>`;
        return;
    }

    App.produtos.forEach(produto => container.appendChild(criarCardProduto(produto)));
}

function renderizarPaginacaoProdutos(total, paginaAtual, temProximaPagina) {

    const el = $("paginacaoProdutos");
    if (!el) return;

    // Sem contagem disponível (SDK sem count(), ou erro): degrada
    // graciosamente pra Anterior/Próxima, sem números de página.
    if (total === null || total === undefined) {

        if (paginaAtual <= 1 && !temProximaPagina) {
            el.innerHTML = "";
            return;
        }

        el.innerHTML = `
            <button type="button" class="btn-cinza" id="btnPaginaAnterior" ${paginaAtual <= 1 ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-left"></i> Anterior
            </button>
            <span class="paginacao-info">Página ${paginaAtual}</span>
            <button type="button" class="btn-cinza" id="btnPaginaProxima" ${!temProximaPagina ? "disabled" : ""}>
                Próxima <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

        $("btnPaginaAnterior")?.addEventListener("click", () => irComScroll(paginaAtual - 1));
        $("btnPaginaProxima")?.addEventListener("click", () => irComScroll(paginaAtual + 1));
        return;
    }

    const totalPaginas = Utils.calcularTotalPaginas(total, CONFIG.itensPorPagina);

    if (totalPaginas <= 1) {
        el.innerHTML = "";
        return;
    }

    const botoes = Utils.calcularBotoesPaginacao(paginaAtual, totalPaginas, 1);

    const botoesHtml = botoes.map(b => {
        if (b === "...") return `<span class="paginacao-reticencias">...</span>`;
        const ativo = b === paginaAtual ? "pagina-ativa" : "";
        return `<button type="button" class="btn-cinza pagina-numero ${ativo}" data-pagina="${b}">${b}</button>`;
    }).join("");

    el.innerHTML = `
        <button type="button" class="btn-cinza" id="btnPaginaAnterior" ${paginaAtual <= 1 ? "disabled" : ""}>
            <i class="fa-solid fa-chevron-left"></i>
        </button>
        ${botoesHtml}
        <button type="button" class="btn-cinza" id="btnPaginaProxima" ${paginaAtual >= totalPaginas ? "disabled" : ""}>
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

    $("btnPaginaAnterior")?.addEventListener("click", () => irComScroll(paginaAtual - 1));
    $("btnPaginaProxima")?.addEventListener("click", () => irComScroll(paginaAtual + 1));

    el.querySelectorAll(".pagina-numero").forEach(botao => {
        botao.addEventListener("click", () => irComScroll(Number(botao.dataset.pagina)));
    });
}

function irComScroll(numeroPagina) {
    irParaPaginaProdutos(numeroPagina);
    const container = $("listaProdutos");
    if (container) window.scrollTo({ top: container.offsetTop - 120, behavior: "smooth" });
}

/*=========================================================
FILTROS / BUSCA
=========================================================*/

// Chamada pelos campos de busca/filtro — sempre volta pra página 1,
// já que o conjunto de resultados muda.
function filtrarComReset() {
    paginaAtualProdutos = 1;
    atualizarEstadoCamposFiltro();
    irParaPaginaProdutos(1);
}

// Busca por referência/nome não combina com os filtros de marca e
// disponibilidade (evita precisar de índices compostos a mais) —
// desabilita visualmente os filtros enquanto uma busca está ativa,
// pra não parecer que eles deveriam funcionar juntos.
function atualizarEstadoCamposFiltro() {
    const config = obterConfiguracaoAtual();
    const buscando = !!(config.busca || config.buscaReferencia);

    const filtroMarca = $("filtroMarca");
    const filtroDisponibilidade = $("filtroDisponibilidade");

    if (filtroMarca) filtroMarca.disabled = buscando;
    if (filtroDisponibilidade) filtroDisponibilidade.disabled = buscando;
}

// Nome mantido igual ao que auth.js já chama (sem precisar tocar em
// auth.js): aqui, "aplicar filtros" significa "atualizar a página
// atual com a configuração de busca/filtro atual" — usado tanto pelo
// login/logout quanto internamente.
function aplicarFiltros() {
    irParaPaginaProdutos(paginaAtualProdutos);
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

// Acrescenta os campos-sombra normalizados usados pela busca direta
// no Firestore (nomeBusca/referenciaBusca) — sem eles, um produto
// cadastrado/editado não apareceria nas buscas até ser resalvo.
function comCamposDeBusca(dados) {
    return {
        ...dados,
        nomeBusca: Utils.limparTexto(dados.nome),
        referenciaBusca: Utils.limparTexto(dados.referencia)
    };
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
        `https://wa.me/${Utils.WHATSAPP}?text=${encodeURIComponent(mensagem)}`,
        "_blank",
        "noopener"
    );
}

/*=========================================================
FIRESTORE CRUD
Toda escrita invalida o cache de páginas/contagem — inserir ou
excluir um item desloca o que cada página contém, então o cache
antigo não é mais confiável. É um "custo" pequeno e único logo
após uma edição, não por visita.
=========================================================*/

async function salvarProduto(dados) {
    const completo = comCamposDeBusca(dados);
    completo.dataCadastro = firebase.firestore.FieldValue.serverTimestamp();
    completo.dataAtualizacao = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("produtos").add(completo);
    invalidarCacheProdutos();
    alert("Produto cadastrado!");
}

async function atualizarProduto(id, dados) {
    const completo = comCamposDeBusca(dados);
    completo.dataAtualizacao = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection("produtos").doc(id).update(completo);
    invalidarCacheProdutos();
    alert("Produto atualizado.");
}

async function excluirProduto(id) {

    if (!confirm("Excluir produto?")) return;

    try {
        await db.collection("produtos").doc(id).delete();
        invalidarCacheProdutos();
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
MIGRAÇÃO (rodar uma vez): preenche nomeBusca/referenciaBusca em
produtos cadastrados ANTES dessa mudança. Sem isso, produtos
antigos não apareceriam nas buscas até serem resalvos manualmente.
Ação explícita do admin — não roda sozinha.
=========================================================*/

async function migrarCamposDeBusca() {

    if (!App.usuario) {
        alert("Faça login para migrar.");
        return;
    }

    const btn = $("btnMigrarBusca");
    if (btn) { btn.disabled = true; btn.textContent = "Migrando..."; }

    try {

        const snapshot = await db.collection("produtos").get(); // leitura única, ação explícita e pontual

        const pendentes = [];
        snapshot.forEach(doc => {
            const dados = doc.data();
            if (dados.nomeBusca === undefined || dados.referenciaBusca === undefined) {
                pendentes.push({ id: doc.id, nome: dados.nome || "", referencia: dados.referencia || "" });
            }
        });

        if (pendentes.length === 0) {
            alert("Nenhum produto precisava de migração — tudo já está atualizado.");
            return;
        }

        const TAMANHO_LOTE = 400;
        for (let inicio = 0; inicio < pendentes.length; inicio += TAMANHO_LOTE) {
            const lote = db.batch();
            pendentes.slice(inicio, inicio + TAMANHO_LOTE).forEach(item => {
                lote.update(db.collection("produtos").doc(item.id), {
                    nomeBusca: Utils.limparTexto(item.nome),
                    referenciaBusca: Utils.limparTexto(item.referencia)
                });
            });
            await lote.commit();
        }

        invalidarCacheProdutos();
        alert(`Migração concluída: ${pendentes.length} produto(s) atualizado(s).`);

    } catch (erro) {
        console.error("Erro na migração:", erro);
        alert("Erro na migração. Veja o console (F12).");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Migrar campos de busca (rodar uma vez)"; }
    }
}

/*=========================================================
INICIALIZAÇÃO
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    const formulario = $("formProduto");
    if (formulario) formulario.addEventListener("submit", enviarFormulario);

    const busca = $("busca");
    if (busca) busca.addEventListener("input", Utils.debounce(filtrarComReset, 350));

    const buscaReferencia = $("buscaReferencia");
    if (buscaReferencia) buscaReferencia.addEventListener("input", Utils.debounce(filtrarComReset, 350));

    const filtroMarca = $("filtroMarca");
    if (filtroMarca) filtroMarca.addEventListener("change", filtrarComReset);

    const filtroDisponibilidade = $("filtroDisponibilidade");
    if (filtroDisponibilidade) filtroDisponibilidade.addEventListener("change", filtrarComReset);

    $("btnMigrarBusca")?.addEventListener("click", migrarCamposDeBusca);

    // Só inicia a busca se a página realmente tiver a lista de
    // produtos (evita leituras desnecessárias em outras páginas).
    if ($("listaProdutos")) irParaPaginaProdutos(1);

});
