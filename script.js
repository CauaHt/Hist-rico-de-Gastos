// ---------- estado ----------
let gastos = [];
try {
  gastos = JSON.parse(localStorage.getItem("gastos_v2") || "[]");
} catch (e) {
  gastos = [];
}

const CATEGORY_COLORS = {
  "Alimentação": "#c15f4a",
  "Transporte": "#cd9f3f",
  "Moradia": "#7686a8",
  "Saúde": "#7c9b7f",
  "Lazer": "#937198",
  "Compras": "#b97a55",
  "Assinaturas": "#5f8fa0",
  "Educação": "#a68a3f",
  "Outros": "#7d7768",
};

function corCategoria(cat) {
  return CATEGORY_COLORS[cat] || "#7d7768";
}

// ---------- elementos ----------
const form = document.getElementById("form");
const descInput = document.getElementById("desc");
const valorInput = document.getElementById("valor");
const dataInput = document.getElementById("data");
const catInput = document.getElementById("cat");
const pagamentoInput = document.getElementById("pagamento");
const parcelasInput = document.getElementById("parcelas");
const campoParcelas = document.getElementById("campoParcelas");
const listaEl = document.getElementById("lista");
const listaVaziaEl = document.getElementById("listaVazia");
const chartEmptyEl = document.getElementById("chartEmpty");
const canvas = document.getElementById("graf");

// data padrão = hoje
dataInput.value = new Date().toISOString().slice(0, 10);

// ---------- parcelas: só aparece no crédito ----------
pagamentoInput.addEventListener("change", () => {
  const isCredito = pagamentoInput.value === "Crédito";
  campoParcelas.hidden = !isCredito;
});

// ---------- gráfico ----------
let viewAtual = "categoria";
const chart = new Chart(canvas, {
  type: "doughnut",
  data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: { color: "#b6b1a4", font: { family: "Inter", size: 12 }, padding: 14 },
      },
    },
  },
});

document.querySelectorAll(".toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    viewAtual = btn.dataset.view;
    atualizarGrafico();
  });
});

function atualizarGrafico() {
  if (gastos.length === 0) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    canvas.style.display = "none";
    chartEmptyEl.hidden = false;
    chart.update();
    return;
  }
  canvas.style.display = "block";
  chartEmptyEl.hidden = true;

  if (viewAtual === "categoria") {
    const totais = {};
    gastos.forEach((g) => {
      totais[g.categoria] = (totais[g.categoria] || 0) + g.valor;
    });
    const labels = Object.keys(totais);
    chart.config.type = "doughnut";
    chart.data.labels = labels;
    chart.data.datasets[0].data = labels.map((l) => totais[l]);
    chart.data.datasets[0].backgroundColor = labels.map(corCategoria);
    chart.options.plugins.legend.position = "right";
  } else {
    // por mês: últimos 6 meses (incluindo o atual)
    const meses = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) });
    }
    const totais = {};
    gastos.forEach((g) => {
      const chave = g.data.slice(0, 7);
      totais[chave] = (totais[chave] || 0) + g.valor;
    });
    chart.config.type = "bar";
    chart.data.labels = meses.map((m) => m.label);
    chart.data.datasets[0].data = meses.map((m) => totais[m.chave] || 0);
    chart.data.datasets[0].backgroundColor = "#c15f4a";
    chart.options.plugins.legend.position = "right";
    chart.options.plugins.legend.display = false;
  }
  chart.options.plugins.legend.display = viewAtual === "categoria";
  chart.update();
}

// ---------- render ----------
function formatarMoeda(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function render() {
  // ordena por data desc
  const ordenados = [...gastos].sort((a, b) => (a.data < b.data ? 1 : -1));

  listaEl.innerHTML = "";
  if (ordenados.length === 0) {
    listaVaziaEl.hidden = false;
  } else {
    listaVaziaEl.hidden = true;
    ordenados.forEach((g) => {
      const idx = gastos.indexOf(g);
      const tr = document.createElement("tr");
      const dataFmt = new Date(g.data + "T00:00:00").toLocaleDateString("pt-BR");
      const parcelasTxt = g.pagamento === "Crédito" && g.parcelas > 1 ? `${g.parcelas}x de ${formatarMoeda(g.valor / g.parcelas)}` : "—";
      tr.innerHTML = `
        <td>${dataFmt}</td>
        <td class="desc-cell">${g.descricao}</td>
        <td><span class="badge" style="background:${corCategoria(g.categoria)}">${g.categoria}</span></td>
        <td>${g.pagamento}</td>
        <td>${parcelasTxt}</td>
        <td class="valor-cell">${formatarMoeda(g.valor)}</td>
        <td><button class="del-btn" data-idx="${idx}" aria-label="Excluir lançamento">✕</button></td>
      `;
      listaEl.appendChild(tr);
    });
  }

  // resumo
  const hoje = new Date();
  const chaveMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const totalGeral = gastos.reduce((s, g) => s + g.valor, 0);
  const totalMes = gastos.filter((g) => g.data.slice(0, 7) === chaveMesAtual).reduce((s, g) => s + g.valor, 0);

  const porCategoria = {};
  gastos.forEach((g) => (porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor));
  let maiorCat = "—";
  let maiorVal = -1;
  Object.entries(porCategoria).forEach(([cat, val]) => {
    if (val > maiorVal) {
      maiorVal = val;
      maiorCat = cat;
    }
  });

  document.getElementById("totalGeral").textContent = formatarMoeda(totalGeral);
  document.getElementById("totalMes").textContent = formatarMoeda(totalMes);
  document.getElementById("maiorCategoria").textContent = maiorCat;
  document.getElementById("qtdLancamentos").textContent = gastos.length;

  atualizarGrafico();
  salvar();
}

function salvar() {
  localStorage.setItem("gastos_v2", JSON.stringify(gastos));
}

// ---------- ações ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!descInput.value.trim() || !valorInput.value || +valorInput.value <= 0) return;

  gastos.push({
    descricao: descInput.value.trim(),
    valor: +valorInput.value,
    data: dataInput.value,
    categoria: catInput.value,
    pagamento: pagamentoInput.value,
    parcelas: pagamentoInput.value === "Crédito" ? +parcelasInput.value : 1,
  });

  descInput.value = "";
  valorInput.value = "";
  dataInput.value = new Date().toISOString().slice(0, 10);
  pagamentoInput.value = "Dinheiro";
  campoParcelas.hidden = true;
  descInput.focus();

  render();
});

listaEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;
  const idx = +btn.dataset.idx;
  gastos.splice(idx, 1);
  render();
});

render();
