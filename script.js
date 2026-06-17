// 🔹 ABAS
function mostrarAba(id) {
  document.querySelectorAll('.aba').forEach(sec => {
    sec.classList.remove('ativa');
  });
  document.getElementById(id).classList.add('ativa');
}

// 🔹 ADICIONAR PRODUTO
document.getElementById("formProduto").addEventListener("submit", async function(e) {
  e.preventDefault();

  await db.collection("produtos").add({
    nome: nome.value,
    marca: marca.value,
    referencia: referencia.value,
    preco: preco.value,
    disponibilidade: disponibilidade.value,
    imagem: imagem.value,
    quantidade: 1
  });

  this.reset();
});

// 🔹 LISTAR PRODUTOS EM TEMPO REAL
db.collection("produtos").onSnapshot(snapshot => {
  renderizar(snapshot);
});

function renderizar(snapshot) {
  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";

  snapshot.forEach(doc => {
    const p = doc.data();

    lista.innerHTML += `
      <div class="produto">
        <div class="marca">${p.marca}</div>
        <div class="nome">${p.nome}</div>

        <img src="${p.imagem}">

        <p>Código: ${p.referencia}</p>
        <p>R$ ${p.preco}</p>
        <p>Estoque: ${p.quantidade}</p>

        <button onclick="editar('${doc.id}')">Editar</button>
        <button onclick="deletar('${doc.id}')">Excluir</button>
      </div>
    `;
  });
}

// 🔹 EDITAR
async function editar(id) {
  const novoPreco = prompt("Novo preço:");
  const novaQtd = prompt("Quantidade:");

  if (novoPreco === null || novaQtd === null) return;

  await db.collection("produtos").doc(id).update({
    preco: novoPreco,
    quantidade: novaQtd
  });
}

// 🔹 EXCLUIR
async function deletar(id) {
  if (confirm("Excluir produto?")) {
    await db.collection("produtos").doc(id).delete();
  }
}

// 🔍 BUSCA
function buscarProduto() {
  const termo = document.getElementById("busca").value.toLowerCase();

  db.collection("produtos").get().then(snapshot => {
    const lista = document.getElementById("listaProdutos");
    lista.innerHTML = "";

    snapshot.forEach(doc => {
      const p = doc.data();

      if (
        p.nome.toLowerCase().includes(termo) ||
        p.marca.toLowerCase().includes(termo)
      ) {
        lista.innerHTML += `
          <div class="produto">
            <div class="nome">${p.nome}</div>
            <img src="${p.imagem}">
          </div>
        `;
      }
    });
  });
}