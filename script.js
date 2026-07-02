// 🔥 PROTEÇÃO GLOBAL (evita quebrar o site)
window.addEventListener("error", function (e) {
  console.log("Erro detectado:", e.message);
});

// 🔐 CONTROLE DE USUÁRIO
let usuarioLogado = null;

// 🔹 ABAS
function mostrarAba(id) {
  document.querySelectorAll('.aba').forEach(sec => {
    sec.classList.remove('ativa');
  });

  const aba = document.getElementById(id);
  if (aba) aba.classList.add('ativa');
}

// 🔐 ABRIR LOGIN
function abrirLogin() {
  document.getElementById("loginModal").style.display = "flex";
}

// 🔐 FECHAR LOGIN
function fecharLogin() {
  document.getElementById("loginModal").style.display = "none";
}

// 🔐 LOGIN
function fazerLogin() {
  const email = document.getElementById("emailLogin").value;
  const senha = document.getElementById("senhaLogin").value;
  const erro = document.getElementById("erroLogin");

  firebase.auth().signInWithEmailAndPassword(email, senha)
    .then(() => {
      fecharLogin();
      erro.innerText = "";
    })
    .catch(() => {
      erro.innerText = "Email ou senha inválidos";
    });
}

// 🔐 LOGOUT
function logout() {
  firebase.auth().signOut();
}

// 🔥 DETECTAR /admin NA URL
function verificarRotaAdmin() {
  if (
    window.location.search.includes("admin") ||
    window.location.hash === "#admin"
  ) {
    abrirLogin();
  }
}
// 🔹 CARREGAR PRODUTOS
function carregarProdutos() {
  db.collection("produtos").onSnapshot(snapshot => {
    const lista = document.getElementById("listaProdutos");
    if (!lista) return;

    lista.innerHTML = "";

    snapshot.forEach(doc => {
      const p = doc.data();

      // 🔥 USAR A MESMA FUNÇÃO
      lista.innerHTML += montarProdutoHTML(p, doc.id);
    });
  });
}
// 🔹 ADICIONAR PRODUTO (PROTEGIDO)
document.getElementById("formProduto")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!firebase.auth().currentUser) {
    alert("Você precisa estar logado!");
    return;
  }

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

// 🔹 EDITAR PRODUTO (PROTEGIDO)
async function editar(id) {
  if (!firebase.auth().currentUser) {
    alert("Apenas admin pode editar!");
    return;
  }

  const novoPreco = prompt("Novo preço:");
  const novaQtd = prompt("Quantidade:");

  if (!novoPreco || !novaQtd) return;

  await db.collection("produtos").doc(id).update({
    preco: novoPreco,
    quantidade: novaQtd
  });
}

// 🔹 DELETAR PRODUTO (PROTEGIDO)
async function deletar(id) {
  if (!firebase.auth().currentUser) {
    alert("Apenas admin pode excluir!");
    return;
  }

  if (confirm("Excluir produto?")) {
    await db.collection("produtos").doc(id).delete();
  }
}

// 🔍 BUSCA
function buscarProduto() {
  const termo = document.getElementById("busca")?.value.toLowerCase();

  db.collection("produtos").get().then(snapshot => {
    const lista = document.getElementById("listaProdutos");
    if (!lista) return;

    lista.innerHTML = "";

    snapshot.forEach(doc => {
      const p = doc.data();

      if (
        p.nome?.toLowerCase().includes(termo) ||
        p.marca?.toLowerCase().includes(termo) ||
        p.referencia?.toLowerCase().includes(termo)
      ) {
        lista.innerHTML += montarProdutoHTML(p, doc.id);
      }
    });
  });
}

// 🔐 INICIALIZAÇÃO SEGURA
window.onload = function () {

  if (typeof firebase === "undefined") {
    console.log("Firebase não carregou!");
    return;
  }

  firebase.auth().onAuthStateChanged(user => {
    usuarioLogado = user;

    console.log("Usuário:", user);

    carregarProdutos();
  });

  verificarRotaAdmin();
};
function montarProdutoHTML(p, id) {
  const numero = "5569996031753"; // 🔥 seu WhatsApp (com DDI + DDD)

  const mensagem = encodeURIComponent(
    `Olá, gostaria de cotar este produto:\n\n${p.nome}\nMarca: ${p.marca}\nCódigo: ${p.referencia}`
  );

  return `
    <div class="produto">
      <div class="nome">${p.nome || ""}</div>

      <img src="${p.imagem || ""}">

      <p>Referência: ${p.referencia || ""}</p>
      <p>Marca: ${p.marca || ""}</p>
      <p>Estoque: ${p.quantidade || 0}</p>

      <!-- 🔥 BOTÃO WHATSAPP -->
      <a href="https://wa.me/${numero}?text=${mensagem}" target="_blank" class="btn-whatsapp">
        💬 Cotar no WhatsApp
      </a>

      ${firebase.auth().currentUser ? `
        <button onclick="editar('${id}')">Editar</button>
        <button onclick="deletar('${id}')">Excluir</button>
      ` : ""}
    </div>
  `;
}
