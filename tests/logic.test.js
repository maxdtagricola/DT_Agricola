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

console.log(`\n${total - falhas}/${total} testes passaram.`);

if (falhas > 0) {
    process.exitCode = 1;
}
