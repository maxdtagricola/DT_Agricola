/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    UTILITÁRIOS
    Funções puras (sem DOM), reaproveitadas por script.js,
    implementos.js e pelos testes em /tests.
=========================================================*/

(function (root, factory) {
    "use strict";
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.Utils = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {

    "use strict";

    // Número oficial de WhatsApp da empresa (fonte única — evita
    // números divergentes entre módulos, como acontecia antes).
    const WHATSAPP1 = "556999478925";
    const WHATSAPP2 = "556996002946";

    // Imagem padrão em SVG (data URI) usada quando um produto/implemento
    // não tem imagem cadastrada ou o arquivo "sem-imagem.png" não existe.
    const IMAGEM_PADRAO =
        "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%231d1d1d'/%3E%3Cg fill='%23555'%3E%3Cpath d='M120 190h160l-45-60-35 40-25-25z'/%3E%3Ccircle cx='150' cy='120' r='18'/%3E%3C/g%3E%3Ctext x='200' y='245' font-family='Arial' font-size='16' fill='%23888' text-anchor='middle'%3ESem imagem%3C/text%3E%3C/svg%3E";

    function formatarMoeda(valor, moeda, moedaFormato) {
        return Number(valor || 0).toLocaleString(
            moeda || "pt-BR",
            {
                style: "currency",
                currency: moedaFormato || "BRL"
            }
        );
    }

    function limparTexto(texto) {
        return String(texto || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function ordenarPorNome(lista) {
        return [...lista].sort((a, b) =>
            String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
        );
    }

    function calcularTotalPaginas(totalItens, itensPorPagina) {
        if (!totalItens || totalItens <= 0) return 1;
        return Math.max(1, Math.ceil(totalItens / itensPorPagina));
    }

    function paginar(lista, paginaAtual, itensPorPagina) {
        const total = calcularTotalPaginas(lista.length, itensPorPagina);
        const pagina = Math.min(Math.max(1, paginaAtual), total);
        const inicio = (pagina - 1) * itensPorPagina;
        return lista.slice(inicio, inicio + itensPorPagina);
    }

    function normalizarImagem(url) {
        const u = String(url || "").trim();
        return u || IMAGEM_PADRAO;
    }

    function debounce(fn, atraso) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), atraso);
        };
    }

    /*=====================================================
    IMPORTAÇÃO/SINCRONIZAÇÃO DE PRODUTOS VIA PLANILHA
    Funções puras — recebem os dados já lidos (array de arrays,
    como o SheetJS entrega) e o mapa de produtos já existentes;
    não sabem nada de arquivo, Firestore ou DOM. Isso permite
    testar toda a regra de negócio sem precisar de navegador.
    =====================================================*/

    const CAMPOS_PLANILHA_PRODUTOS = [
        "nome", "marca", "referencia", "categoria",
        "medidas", "valor", "quantidade", "imagem", "descricao"
    ];

    // Aceita número já pronto (célula numérica do Excel), formato
    // BR com vírgula decimal ("1.234,56") ou ponto decimal comum
    // ("1234.56").
    function converterNumero(valor) {
        if (typeof valor === "number") return valor;

        const texto = String(valor ?? "").trim();
        if (!texto) return NaN;

        if (texto.includes(",")) {
            const normalizado = texto.replace(/\./g, "").replace(",", ".");
            return Number(normalizado);
        }

        return Number(texto);
    }

    function linhaEstaVazia(linha) {
        return !linha || linha.every(c => c === undefined || c === null || String(c).trim() === "");
    }

    // Lê a primeira linha da planilha (cabeçalho) e descobre em qual
    // coluna está cada campo — não depende da ordem das colunas.
    function mapearCabecalhoPlanilha(linhaCabecalho) {
        const mapa = {};
        (linhaCabecalho || []).forEach((celula, indice) => {
            const chave = limparTexto(celula || "");
            if (CAMPOS_PLANILHA_PRODUTOS.includes(chave) && !(chave in mapa)) {
                mapa[chave] = indice;
            }
        });
        return mapa;
    }

    // Regra central: para cada linha, decide se é um produto novo ou
    // uma atualização de disponibilidade de um produto existente
    // (casando pela "referencia"), calcula a disponibilidade a partir
    // da quantidade, e valida cada linha individualmente.
    //
    // produtosExistentes: Map com chave = referência em maiúsculas,
    // valor = { id, nome }.
    function processarPlanilhaProdutos(linhasBrutas, produtosExistentes) {

        produtosExistentes = produtosExistentes || new Map();

        if (!linhasBrutas || linhasBrutas.length === 0) {
            return { erroGeral: "A planilha está vazia.", linhas: [] };
        }

        const mapa = mapearCabecalhoPlanilha(linhasBrutas[0]);

        if (mapa.referencia === undefined || mapa.quantidade === undefined) {
            return {
                erroGeral: "A planilha precisa ter, na primeira linha, ao menos as colunas \"referencia\" e \"quantidade\".",
                linhas: []
            };
        }

        const referenciasVistas = new Set();
        const linhas = [];

        for (let i = 1; i < linhasBrutas.length; i++) {

            const linhaBruta = linhasBrutas[i];
            if (linhaEstaVazia(linhaBruta)) continue;

            const bruto = {};
            CAMPOS_PLANILHA_PRODUTOS.forEach(campo => {
                const indice = mapa[campo];
                bruto[campo] = indice === undefined ? "" : linhaBruta[indice];
            });

            const referencia = String(bruto.referencia ?? "").trim();
            const chaveReferencia = referencia.toUpperCase();
            const erros = [];

            if (!referencia) erros.push("referência vazia");

            if (referencia && referenciasVistas.has(chaveReferencia)) {
                erros.push("referência duplicada nesta planilha");
            }

            const quantidade = converterNumero(bruto.quantidade);
            if (Number.isNaN(quantidade)) erros.push("quantidade inválida");

            const existente = referencia ? produtosExistentes.get(chaveReferencia) : null;
            const acao = existente ? "atualizar" : "novo";

            const nome = String(bruto.nome ?? "").trim();
            if (acao === "novo" && !nome) erros.push("nome obrigatório para produto novo");

            let valor = 0;
            if (acao === "novo" && bruto.valor !== "" && bruto.valor !== undefined && bruto.valor !== null) {
                valor = converterNumero(bruto.valor);
                if (Number.isNaN(valor) || valor < 0) erros.push("valor inválido");
            }

            const disponibilidade = Number.isNaN(quantidade)
                ? null
                : (quantidade > 0 ? "Em estoque" : "Indisponível");

            if (referencia) referenciasVistas.add(chaveReferencia);

            linhas.push({
                numeroLinha: i + 1,
                referencia,
                nome: nome || (existente ? existente.nome : ""),
                acao,
                existenteId: existente ? existente.id : null,
                quantidade,
                disponibilidade,
                dadosNovoProduto: acao === "novo" ? {
                    nome,
                    marca: String(bruto.marca ?? "").trim(),
                    referencia,
                    categoria: String(bruto.categoria ?? "").trim(),
                    medidas: String(bruto.medidas ?? "").trim(),
                    valor: Number.isNaN(valor) ? 0 : valor,
                    disponibilidade: disponibilidade || "Indisponível",
                    imagem: String(bruto.imagem ?? "").trim(),
                    descricao: String(bruto.descricao ?? "").trim(),
                    quantidade: Number.isNaN(quantidade) ? 0 : quantidade
                } : null,
                erros
            });
        }

        return { erroGeral: null, linhas };
    }

    /*=====================================================
    PAGINAÇÃO POR CURSOR (produtos.html)
    Funções puras — não sabem nada de Firestore/DOM. Deixam a
    lógica de "o que buscar" e "como cachear" testável sem
    precisar de um Firestore de verdade.
    =====================================================*/

    // Chave determinística pra identificar uma combinação de
    // busca/filtros — cada combinação tem seu próprio cache de
    // páginas (mudar o filtro não aproveita cache de outro filtro).
    function gerarChaveConsulta(config) {
        config = config || {};
        return JSON.stringify({
            busca: config.busca || "",
            buscaReferencia: config.buscaReferencia || "",
            marca: config.marca || "",
            disponibilidade: config.disponibilidade || ""
        });
    }

    // Dado o conjunto de páginas já em cache (para a consulta atual)
    // e a página desejada, decide de qual página cacheada dá pra
    // partir (startAfter) e quais páginas ainda faltam buscar, em
    // ordem. Isso é o que permite "pular" da página 1 pra 5: se 2,3,4
    // já foram visitadas (estão em paginasEmCache), só falta buscar a 5.
    // Se nada foi visitado ainda, tem que atravessar 1,2,3,4,5 uma vez
    // (não tem como pular sem custo de leitura — é limitação do
    // Firestore, não decisão de design).
    function planejarBusca(paginasEmCache, paginaAlvo) {

        let paginaBase = 0;

        (paginasEmCache || []).forEach(n => {
            if (n <= paginaAlvo - 1 && n > paginaBase) paginaBase = n;
        });

        const faltantes = [];
        for (let p = paginaBase + 1; p <= paginaAlvo; p++) faltantes.push(p);

        return { paginaBase, faltantes };
    }

    // Monta a lista de botões de paginação com reticências, tipo
    // 1 ... 4 5 6 ... 20 — em vez de mostrar um botão pra cada página
    // quando há muitas.
    function calcularBotoesPaginacao(paginaAtual, totalPaginas, delta) {

        delta = delta === undefined ? 1 : delta;

        if (!totalPaginas || totalPaginas <= 1) return [1];

        const paginas = new Set([1, totalPaginas, paginaAtual]);

        for (let i = 1; i <= delta; i++) {
            if (paginaAtual - i >= 1) paginas.add(paginaAtual - i);
            if (paginaAtual + i <= totalPaginas) paginas.add(paginaAtual + i);
        }

        const ordenadas = [...paginas].sort((a, b) => a - b);
        const resultado = [];
        let anterior = null;

        ordenadas.forEach(p => {
            if (anterior !== null && p - anterior > 1) resultado.push("...");
            resultado.push(p);
            anterior = p;
        });

        return resultado;
    }

    return {
        WHATSAPP1,
        WHATSAPP2,
        IMAGEM_PADRAO,
        formatarMoeda,
        limparTexto,
        ordenarPorNome,
        calcularTotalPaginas,
        paginar,
        normalizarImagem,
        debounce,
        CAMPOS_PLANILHA_PRODUTOS,
        converterNumero,
        mapearCabecalhoPlanilha,
        processarPlanilhaProdutos,
        gerarChaveConsulta,
        calcularBotoesPaginacao,
        planejarBusca
    };

}));
