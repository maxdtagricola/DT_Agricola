/*=========================================================
    DANIEL TRATORES AGRÍCOLA
    IMPORTAÇÃO / SINCRONIZAÇÃO DE PRODUTOS VIA PLANILHA (.xlsx)
    Ferramenta interna (fora do menu). Lê uma planilha Excel,
    casa cada linha com o catálogo pela "referencia":
      - se já existe: só atualiza a disponibilidade, calculada
        a partir da "quantidade" (>0 = Em estoque, <=0 = Sob encomenda)
      - se não existe: cadastra um produto novo com os dados
        disponíveis na planilha
    A regra de negócio (validação, casamento, cálculo) está em
    Utils.processarPlanilhaProdutos (js/utils.js) — este arquivo
    só cuida de arquivo, Firestore e tela.
=========================================================*/

"use strict";

const Importacao = {
    linhas: []
};

document.addEventListener("DOMContentLoaded", () => {

    const inputArquivo = $("arquivoImportacao");
    if (!inputArquivo) return; // esta página/seção não está presente

    $("btnBaixarModelo")?.addEventListener("click", baixarModelo);
    $("btnPreVisualizarImportacao")?.addEventListener("click", preVisualizar);
    $("btnImportarProdutos")?.addEventListener("click", importarPlanilha);
});

/*=========================================================
MODELO DE PLANILHA (gerado na hora, direto no navegador)
=========================================================*/

function baixarModelo() {

    const dados = [
        Utils.CAMPOS_PLANILHA_PRODUTOS,
        ["Filtro de Óleo", "John Deere", "RE504836", "Filtros", "", 89.90, 12, "https://exemplo.com/filtro.jpg", "Filtro de óleo original"],
        ["Correia Dentada", "Massey Ferguson", "3395857M1", "Correias", "20mm", 145.00, 0, "", "Correia para trator série 200"]
    ];

    const planilha = XLSX.utils.aoa_to_sheet(dados);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Produtos");
    XLSX.writeFile(livro, "modelo-importacao-produtos.xlsx");
}

/*=========================================================
LEITURA DO ARQUIVO
=========================================================*/

async function lerPlanilha(arquivo) {
    const bytes = await arquivo.arrayBuffer();
    const livro = XLSX.read(bytes);
    const primeiraAba = livro.Sheets[livro.SheetNames[0]];
    return XLSX.utils.sheet_to_json(primeiraAba, { header: 1, defval: "" });
}

/*=========================================================
CATÁLOGO ATUAL (para casar pela referência)
=========================================================*/

async function buscarProdutosExistentes() {

    const mapa = new Map();
    const snapshot = await db.collection("produtos").get();

    snapshot.forEach(doc => {
        const dados = doc.data();
        const referencia = String(dados.referencia || "").trim();
        if (!referencia) return; // produtos sem referência ficam fora da sincronização

        const chave = referencia.toUpperCase();
        if (!mapa.has(chave)) {
            mapa.set(chave, { id: doc.id, nome: dados.nome || "" });
        }
    });

    return mapa;
}

/*=========================================================
PRÉ-VISUALIZAÇÃO
=========================================================*/

async function preVisualizar() {

    if (!App.usuario) {
        alert("Faça login para usar esta ferramenta.");
        return;
    }

    const inputArquivo = $("arquivoImportacao");
    const resumo = $("resumoImportacao");
    const tabela = $("tabelaPreviewImportacao");
    const btnImportar = $("btnImportarProdutos");

    if (!inputArquivo.files || inputArquivo.files.length === 0) {
        if (resumo) resumo.textContent = "Selecione um arquivo .xlsx antes de pré-visualizar.";
        return;
    }

    if (btnImportar) btnImportar.disabled = true;
    if (tabela) tabela.innerHTML = "";
    if (resumo) resumo.textContent = "Lendo planilha...";

    try {

        const linhasBrutas = await lerPlanilha(inputArquivo.files[0]);

        if (resumo) resumo.textContent = "Consultando catálogo atual...";
        const produtosExistentes = await buscarProdutosExistentes();

        const resultado = Utils.processarPlanilhaProdutos(linhasBrutas, produtosExistentes);

        if (resultado.erroGeral) {
            Importacao.linhas = [];
            if (resumo) resumo.textContent = resultado.erroGeral;
            return;
        }

        Importacao.linhas = resultado.linhas;
        renderizarPreview(resultado.linhas);

    } catch (erro) {
        console.error("Erro ao ler planilha:", erro);
        Importacao.linhas = [];
        if (resumo) resumo.textContent = "Não foi possível ler o arquivo. Verifique se é um .xlsx válido.";
    }
}

function renderizarPreview(linhas) {

    const tabela = $("tabelaPreviewImportacao");
    const resumo = $("resumoImportacao");
    const btnImportar = $("btnImportarProdutos");

    if (linhas.length === 0) {
        if (tabela) tabela.innerHTML = "";
        if (resumo) resumo.textContent = "Nenhuma linha de produto encontrada na planilha.";
        if (btnImportar) btnImportar.disabled = true;
        return;
    }

    if (tabela) {
        tabela.innerHTML = `
            <table class="tabela-importacao">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Referência</th>
                        <th>Nome</th>
                        <th>Ação</th>
                        <th>Quantidade</th>
                        <th>Disponibilidade</th>
                        <th>Situação</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhas.map(l => `
                        <tr class="${l.erros.length ? 'linha-invalida' : 'linha-valida'}">
                            <td>${l.numeroLinha}</td>
                            <td>${l.referencia || "-"}</td>
                            <td>${l.nome || "-"}</td>
                            <td>${l.acao === "novo" ? "Novo cadastro" : "Atualizar disponibilidade"}</td>
                            <td>${Number.isNaN(l.quantidade) ? "-" : l.quantidade}</td>
                            <td>${l.disponibilidade || "-"}</td>
                            <td>${l.erros.length ? `Erro: ${l.erros.join(", ")}` : "OK"}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    }

    const validas = linhas.filter(l => l.erros.length === 0);
    const novos = validas.filter(l => l.acao === "novo").length;
    const atualizacoes = validas.filter(l => l.acao === "atualizar").length;
    const comErro = linhas.length - validas.length;

    if (resumo) {
        resumo.textContent =
            `${novos} novo(s) produto(s) a cadastrar, ${atualizacoes} produto(s) a atualizar (disponibilidade)` +
            (comErro > 0 ? `. ${comErro} linha(s) com erro (serão ignoradas).` : ".");
    }

    if (btnImportar) btnImportar.disabled = validas.length === 0;
}

/*=========================================================
IMPORTAÇÃO / SINCRONIZAÇÃO (Firestore em lotes de até 400 operações)
=========================================================*/

async function importarPlanilha() {

    if (!App.usuario) {
        alert("Faça login para importar produtos.");
        return;
    }

    const validas = Importacao.linhas.filter(l => l.erros.length === 0);

    if (validas.length === 0) {
        alert("Pré-visualize antes de importar.");
        return;
    }

    const novos = validas.filter(l => l.acao === "novo").length;
    const atualizacoes = validas.filter(l => l.acao === "atualizar").length;

    const confirmar = confirm(
        `Confirmar sincronização?\n\n${novos} produto(s) novo(s) serão cadastrados.\n${atualizacoes} produto(s) terão a disponibilidade atualizada.`
    );
    if (!confirmar) return;

    const btnImportar = $("btnImportarProdutos");
    const resumo = $("resumoImportacao");

    if (btnImportar) btnImportar.disabled = true;
    if (resumo) resumo.textContent = "Sincronizando...";

    const TAMANHO_LOTE = 400; // limite do Firestore é 500 operações por lote

    try {

        for (let inicio = 0; inicio < validas.length; inicio += TAMANHO_LOTE) {

            const lote = db.batch();
            const fatia = validas.slice(inicio, inicio + TAMANHO_LOTE);

            fatia.forEach(l => {

                if (l.acao === "novo") {

                    const ref = db.collection("produtos").doc();
                    lote.set(ref, {
                        ...l.dadosNovoProduto,
                        dataCadastro: firebase.firestore.FieldValue.serverTimestamp(),
                        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });

                } else {

                    const ref = db.collection("produtos").doc(l.existenteId);
                    lote.update(ref, {
                        quantidade: l.quantidade,
                        disponibilidade: l.disponibilidade,
                        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            await lote.commit();
        }

        if (resumo) {
            resumo.textContent = `Sincronização concluída: ${novos} produto(s) cadastrado(s), ${atualizacoes} atualizado(s).`;
        }
        alert("Sincronização concluída.");

        const inputArquivo = $("arquivoImportacao");
        if (inputArquivo) inputArquivo.value = "";

        const tabela = $("tabelaPreviewImportacao");
        if (tabela) tabela.innerHTML = "";

        Importacao.linhas = [];

    } catch (erro) {
        console.error("Erro ao sincronizar produtos:", erro);
        if (resumo) resumo.textContent = "Erro ao sincronizar. Veja o console (F12) para detalhes.";
        alert("Erro ao sincronizar produtos.");
    } finally {
        if (btnImportar) btnImportar.disabled = false;
    }
}
