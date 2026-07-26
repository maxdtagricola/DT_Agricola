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
    const WHATSAPP = "5569996031753";

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

    return {
        WHATSAPP,
        IMAGEM_PADRAO,
        formatarMoeda,
        limparTexto,
        ordenarPorNome,
        calcularTotalPaginas,
        paginar,
        normalizarImagem,
        debounce
    };

}));
