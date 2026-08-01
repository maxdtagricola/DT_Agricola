/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    TESTES — funções puras de js/utils.js

    Como rodar (não precisa de nada instalado, só Node.js):
        node tests/logic.test.js
=========================================================*/

"use strict";

const assert = require("assert");
const Utils = require("../js/utils.js");

let total = 0;
let falhas = 0;

function teste(nome, fn) {
    total++;
    try {
        fn();
        console.log(`  OK  - ${nome}`);
    } catch (erro) {
        falhas++;
        console.log(`FALHOU - ${nome}`);
        console.log(`         ${erro.message}`);
    }
}

console.log("formatarMoeda");
teste("formata número em Real (BRL)", () => {
    assert.strictEqual(Utils.formatarMoeda(1500, "pt-BR", "BRL"), "R$\u00A01.500,00");
});
teste("trata valor vazio/indefinido como zero", () => {
    assert.strictEqual(Utils.formatarMoeda(undefined, "pt-BR", "BRL"), "R$\u00A00,00");
});

console.log("\nlimparTexto");
teste("remove acentos e caixa alta", () => {
    assert.strictEqual(Utils.limparTexto("Rolamento Traseiro"), "rolamento traseiro");
});
teste("lida com valores vazios sem quebrar", () => {
    assert.strictEqual(Utils.limparTexto(undefined), "");
});

console.log("\nordenarPorNome");
teste("ordena alfabeticamente respeitando acentuação pt-BR", () => {
    const lista = [{ nome: "Óleo" }, { nome: "Arado" }, { nome: "Correia" }];
    const ordenado = Utils.ordenarPorNome(lista).map(i => i.nome);
    assert.deepStrictEqual(ordenado, ["Arado", "Correia", "Óleo"]);
});
teste("não altera o array original (imutável)", () => {
    const lista = [{ nome: "B" }, { nome: "A" }];
    Utils.ordenarPorNome(lista);
    assert.strictEqual(lista[0].nome, "B");
});

console.log("\ncalcularTotalPaginas / paginar (limite de 50 itens por página)");
teste("50 itens cabem em 1 página", () => {
    assert.strictEqual(Utils.calcularTotalPaginas(50, 50), 1);
});
teste("51 itens exigem 2 páginas", () => {
    assert.strictEqual(Utils.calcularTotalPaginas(51, 50), 2);
});
teste("120 itens exigem 3 páginas", () => {
    assert.strictEqual(Utils.calcularTotalPaginas(120, 50), 3);
});
teste("lista vazia sempre retorna ao menos 1 página", () => {
    assert.strictEqual(Utils.calcularTotalPaginas(0, 50), 1);
});
teste("página 1 traz os itens de 1 a 50", () => {
    const lista = Array.from({ length: 120 }, (_, i) => i + 1);
    const pagina1 = Utils.paginar(lista, 1, 50);
    assert.strictEqual(pagina1.length, 50);
    assert.strictEqual(pagina1[0], 1);
    assert.strictEqual(pagina1[49], 50);
});
teste("página 3 (última) traz os itens restantes (20 itens)", () => {
    const lista = Array.from({ length: 120 }, (_, i) => i + 1);
    const pagina3 = Utils.paginar(lista, 3, 50);
    assert.strictEqual(pagina3.length, 20);
    assert.strictEqual(pagina3[0], 101);
    assert.strictEqual(pagina3[19], 120);
});
teste("página fora do intervalo é limitada ao total de páginas", () => {
    const lista = Array.from({ length: 30 }, (_, i) => i + 1);
    const pagina = Utils.paginar(lista, 99, 50);
    assert.strictEqual(pagina.length, 30);
});
teste("página abaixo de 1 é tratada como página 1", () => {
    const lista = Array.from({ length: 30 }, (_, i) => i + 1);
    const pagina = Utils.paginar(lista, 0, 50);
    assert.strictEqual(pagina[0], 1);
});

console.log("\nnormalizarImagem");
teste("mantém uma URL informada", () => {
    assert.strictEqual(Utils.normalizarImagem("https://x.com/a.png"), "https://x.com/a.png");
});
teste("usa a imagem padrão quando vazio", () => {
    assert.strictEqual(Utils.normalizarImagem(""), Utils.IMAGEM_PADRAO);
});
teste("usa a imagem padrão quando indefinido", () => {
    assert.strictEqual(Utils.normalizarImagem(undefined), Utils.IMAGEM_PADRAO);
});

console.log("\nWHATSAPP (número único, usado por produtos e implementos)");
teste("número de WhatsApp tem o formato correto (55 + DDD + 9 dígitos)", () => {
    assert.match(Utils.WHATSAPP, /^55\d{2}9\d{8}$/);
});

console.log("\nconverterNumero (planilha Excel)");
teste("aceita célula numérica direta (tipo number)", () => {
    assert.strictEqual(Utils.converterNumero(89.9), 89.9);
});
teste("aceita formato BR com vírgula decimal", () => {
    assert.strictEqual(Utils.converterNumero("1.234,56"), 1234.56);
});
teste("aceita ponto como decimal quando não há vírgula", () => {
    assert.strictEqual(Utils.converterNumero("89.90"), 89.9);
});
teste("aceita número negativo (quantidade pode ser negativa)", () => {
    assert.strictEqual(Utils.converterNumero("-5"), -5);
});
teste("texto vazio vira NaN", () => {
    assert.ok(Number.isNaN(Utils.converterNumero("")));
});
teste("texto não numérico vira NaN", () => {
    assert.ok(Number.isNaN(Utils.converterNumero("abc")));
});

console.log("\nmapearCabecalhoPlanilha");
teste("mapeia colunas conhecidas, ignorando maiúsculas/acentos", () => {
    const mapa = Utils.mapearCabecalhoPlanilha(["Nome", "REFERENCIA", "Quantidade"]);
    assert.deepStrictEqual(mapa, { nome: 0, referencia: 1, quantidade: 2 });
});
teste("funciona com colunas fora de ordem e colunas desconhecidas ignoradas", () => {
    const mapa = Utils.mapearCabecalhoPlanilha(["quantidade", "coluna extra", "referencia", "nome"]);
    assert.deepStrictEqual(mapa, { quantidade: 0, referencia: 2, nome: 3 });
});

console.log("\nprocessarPlanilhaProdutos — regra de sincronização");

teste("planilha vazia retorna erro geral", () => {
    const r = Utils.processarPlanilhaProdutos([], new Map());
    assert.ok(r.erroGeral);
    assert.strictEqual(r.linhas.length, 0);
});

teste("sem as colunas referencia/quantidade, retorna erro geral", () => {
    const r = Utils.processarPlanilhaProdutos([["nome", "marca"], ["Filtro", "John Deere"]], new Map());
    assert.ok(r.erroGeral);
});

teste("produto novo (referência não cadastrada) exige nome e usa todos os dados da planilha", () => {
    const linhas = [
        ["nome", "marca", "referencia", "categoria", "medidas", "valor", "quantidade", "imagem", "descricao"],
        ["Filtro de Óleo", "John Deere", "RE001", "Filtros", "", 89.9, 12, "", "Filtro original"]
    ];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.strictEqual(r.linhas.length, 1);
    const linha = r.linhas[0];
    assert.strictEqual(linha.erros.length, 0);
    assert.strictEqual(linha.acao, "novo");
    assert.strictEqual(linha.disponibilidade, "Em estoque");
    assert.strictEqual(linha.dadosNovoProduto.nome, "Filtro de Óleo");
    assert.strictEqual(linha.dadosNovoProduto.valor, 89.9);
    assert.strictEqual(linha.dadosNovoProduto.quantidade, 12);
});

teste("produto novo sem nome é rejeitado", () => {
    const linhas = [
        ["nome", "referencia", "quantidade"],
        ["", "RE002", 5]
    ];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.ok(r.linhas[0].erros.includes("nome obrigatório para produto novo"));
});

teste("produto já existente: só atualiza disponibilidade, ignora outros dados da planilha", () => {
    const existentes = new Map([["RE001", { id: "abc123", nome: "Filtro Antigo" }]]);
    const linhas = [
        ["nome", "referencia", "quantidade", "valor"],
        ["Nome Novo Ignorado", "RE001", 7, 999]
    ];
    const r = Utils.processarPlanilhaProdutos(linhas, existentes);
    const linha = r.linhas[0];
    assert.strictEqual(linha.acao, "atualizar");
    assert.strictEqual(linha.existenteId, "abc123");
    assert.strictEqual(linha.dadosNovoProduto, null);
    assert.strictEqual(linha.disponibilidade, "Em estoque");
});

teste("casamento por referência ignora maiúsculas/minúsculas", () => {
    const existentes = new Map([["RE001", { id: "abc123", nome: "X" }]]);
    const linhas = [
        ["referencia", "quantidade"],
        ["re001", 3]
    ];
    const r = Utils.processarPlanilhaProdutos(linhas, existentes);
    assert.strictEqual(r.linhas[0].acao, "atualizar");
});

teste("quantidade positiva => Em estoque", () => {
    const linhas = [["nome", "referencia", "quantidade"], ["X", "R1", 1]];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.strictEqual(r.linhas[0].disponibilidade, "Em estoque");
});

teste("quantidade zero => Indisponível", () => {
    const linhas = [["nome", "referencia", "quantidade"], ["X", "R1", 0]];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.strictEqual(r.linhas[0].disponibilidade, "Indisponível");
});

teste("quantidade negativa => Indisponível", () => {
    const linhas = [["nome", "referencia", "quantidade"], ["X", "R1", -3]];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.strictEqual(r.linhas[0].disponibilidade, "Indisponível");
});

teste("referência vazia é rejeitada", () => {
    const linhas = [["nome", "referencia", "quantidade"], ["X", "", 5]];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.ok(r.linhas[0].erros.includes("referência vazia"));
});

teste("quantidade inválida (texto não numérico) é rejeitada", () => {
    const linhas = [["nome", "referencia", "quantidade"], ["X", "R1", "abc"]];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.ok(r.linhas[0].erros.includes("quantidade inválida"));
});

teste("referência duplicada na mesma planilha é rejeitada na segunda ocorrência", () => {
    const linhas = [
        ["nome", "referencia", "quantidade"],
        ["X", "R1", 5],
        ["Y", "R1", 8]
    ];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.strictEqual(r.linhas[0].erros.length, 0);
    assert.ok(r.linhas[1].erros.includes("referência duplicada nesta planilha"));
});

teste("linhas em branco são ignoradas (não geram erro nem entram na lista)", () => {
    const linhas = [
        ["nome", "referencia", "quantidade"],
        ["", "", ""],
        ["X", "R1", 5]
    ];
    const r = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.strictEqual(r.linhas.length, 1);
    assert.strictEqual(r.linhas[0].referencia, "R1");
});

teste("permite rodar a mesma planilha várias vezes sem duplicar (idempotente)", () => {
    // Primeira importação: produto novo.
    const linhas = [["nome", "referencia", "quantidade"], ["Filtro", "R9", 10]];
    const primeira = Utils.processarPlanilhaProdutos(linhas, new Map());
    assert.strictEqual(primeira.linhas[0].acao, "novo");

    // Segunda importação (mesma planilha), agora o produto já existe.
    const existentesDepois = new Map([["R9", { id: "xyz", nome: "Filtro" }]]);
    const segunda = Utils.processarPlanilhaProdutos(linhas, existentesDepois);
    assert.strictEqual(segunda.linhas[0].acao, "atualizar");
    assert.strictEqual(segunda.linhas[0].existenteId, "xyz");
});

console.log("\ngerarChaveConsulta (cache por combinação de busca/filtros)");
teste("mesma configuração gera a mesma chave", () => {
    const a = Utils.gerarChaveConsulta({ busca: "filtro", marca: "", disponibilidade: "" });
    const b = Utils.gerarChaveConsulta({ busca: "filtro", marca: "", disponibilidade: "" });
    assert.strictEqual(a, b);
});
teste("configurações diferentes geram chaves diferentes", () => {
    const a = Utils.gerarChaveConsulta({ busca: "filtro" });
    const b = Utils.gerarChaveConsulta({ busca: "correia" });
    assert.notStrictEqual(a, b);
});
teste("busca por referência gera chave diferente de busca por nome (mesmo texto)", () => {
    const a = Utils.gerarChaveConsulta({ busca: "re001" });
    const b = Utils.gerarChaveConsulta({ buscaReferencia: "re001" });
    assert.notStrictEqual(a, b);
});
teste("campos ausentes são tratados como vazio (config parcial = config com tudo vazio)", () => {
    const a = Utils.gerarChaveConsulta({});
    const b = Utils.gerarChaveConsulta({ busca: "", marca: "", disponibilidade: "", buscaReferencia: "" });
    assert.strictEqual(a, b);
});

console.log("\nplanejarBusca (o que já está em cache vs. o que falta buscar)");
teste("nada em cache: precisa buscar todas as páginas até a alvo", () => {
    const r = Utils.planejarBusca([], 5);
    assert.strictEqual(r.paginaBase, 0);
    assert.deepStrictEqual(r.faltantes, [1, 2, 3, 4, 5]);
});
teste("páginas 1-4 em cache, pedindo a 5: só falta buscar a 5 (o \"pulo\")", () => {
    const r = Utils.planejarBusca([1, 2, 3, 4], 5);
    assert.strictEqual(r.paginaBase, 4);
    assert.deepStrictEqual(r.faltantes, [5]);
});
teste("página já em cache: não falta buscar nada (fica só ela mesma na lista)", () => {
    const r = Utils.planejarBusca([1, 2, 3], 2);
    // paginaBase é a maior página cacheada ABAIXO da alvo
    assert.strictEqual(r.paginaBase, 1);
    assert.deepStrictEqual(r.faltantes, [2]);
});
teste("cache espalhado (buracos): usa a maior página cacheada abaixo da alvo", () => {
    const r = Utils.planejarBusca([1, 2, 7, 8], 5);
    assert.strictEqual(r.paginaBase, 2);
    assert.deepStrictEqual(r.faltantes, [3, 4, 5]);
});
teste("voltar para a página 1 sempre parte do zero (não existe página 0 em cache)", () => {
    const r = Utils.planejarBusca([1, 2, 3, 4, 5], 1);
    assert.strictEqual(r.paginaBase, 0);
    assert.deepStrictEqual(r.faltantes, [1]);
});

console.log("\ncalcularBotoesPaginacao (botões numerados com reticências)");
teste("poucas páginas: mostra todas, sem reticências", () => {
    assert.deepStrictEqual(Utils.calcularBotoesPaginacao(1, 3), [1, 2, 3]);
});
teste("uma página só: mostra só o botão 1", () => {
    assert.deepStrictEqual(Utils.calcularBotoesPaginacao(1, 1), [1]);
});
teste("muitas páginas, no meio: primeira, vizinhas, última, com reticências dos dois lados", () => {
    assert.deepStrictEqual(Utils.calcularBotoesPaginacao(10, 20), [1, "...", 9, 10, 11, "...", 20]);
});
teste("muitas páginas, no início: sem reticências à esquerda", () => {
    assert.deepStrictEqual(Utils.calcularBotoesPaginacao(1, 20), [1, 2, "...", 20]);
});
teste("muitas páginas, no fim: sem reticências à direita", () => {
    assert.deepStrictEqual(Utils.calcularBotoesPaginacao(20, 20), [1, "...", 19, 20]);
});
teste("perto o suficiente do início/fim: reticências viram números (sem gap de 1)", () => {
    assert.deepStrictEqual(Utils.calcularBotoesPaginacao(3, 5), [1, 2, 3, 4, 5]);
});

console.log(`\n${total - falhas}/${total} testes passaram.`);

if (falhas > 0) {
    process.exitCode = 1;
}
