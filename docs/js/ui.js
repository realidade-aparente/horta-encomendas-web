export function money(value) {
  return Number(value || 0).toFixed(2).replace(".", ",") + " €";
}

export function show(el) {
  el.classList.remove("hidden");
}

export function hide(el) {
  el.classList.add("hidden");
}

export function setWeekStatus(el, estado) {
  el.textContent = estado === "aberta" ? "Encomendas abertas" : "Encomendas encerradas";
  el.style.background = estado === "aberta" ? "#dff3e2" : "#f3dfdf";
}

export function renderPickupOptions(selectEl, options = [], selectedValue = "") {
  selectEl.innerHTML = "";

  for (const item of options) {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    if (item === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

export function renderProducts({
  container,
  products,
  items,
  isClosed,
  onMinus,
  onInputQty,
  onPlus,
  onInputNote
}) {
  container.innerHTML = "";

  const sorted = Object.entries(products || {}).sort((a, b) => {
    const orderA = a[1].ordem ?? 9999;
    const orderB = b[1].ordem ?? 9999;
    return orderA - orderB;
  });

  for (const [productId, product] of sorted) {
    if (product.ativo === false) continue;
    if (product.tipoAtividade === "i") continue;

const unidade = String(product.unidade || "").toLowerCase();
const integerOnly = ["molho", "emb", "un"].includes(unidade);
const stepValue = integerOnly ? "1" : "0.1";


    const item = items[productId] || {};
    const qty = item.quantidade ?? "";
    const note = item.nota ?? "";

    const gramsText = product.quantidadeComercializacaoGr
      ? ` • ${product.quantidadeComercializacaoGr}g`
      : "";

    const originText = product.origem
      ? `<div class="product-extra">Origem: ${product.origem}</div>`
      : "";

    const commentText = product.comentario
      ? `<div class="product-comment">${product.comentario}</div>`
      : "";

    const noteField = product.aceitaNotaCliente
      ? `
        <div class="note-row">
          <input
            class="note-input"
            type="text"
            maxlength="20"
            placeholder="Nota curta (máx. 20 caract.)"
            value="${escapeHtml(note)}"
            ${isClosed ? "disabled" : ""}
          />
          <div class="char-counter">${String(note).length}/20</div>
        </div>
      `
      : "";

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-title">${product.nome}</div>
      <div class="product-meta">${product.unidade}${gramsText} • ${money(product.preco)}</div>
      ${originText}
      ${commentText}
      <div class="qty-row">
        
        <input
  class="qty-input"
  type="number"
  inputmode="decimal"
  step="${stepValue}"
  min="0"
  value="${qty}"
  ${isClosed ? "disabled" : ""}
/>
        <button class="qty-btn" data-action="minus" ${isClosed ? "disabled" : ""}>-</button>
		<button class="qty-btn" data-action="plus" ${isClosed ? "disabled" : ""}>+</button>
      </div>
      ${noteField}
    `;

    const btnMinus = card.querySelector('[data-action="minus"]');
    const btnPlus = card.querySelector('[data-action="plus"]');
    const qtyInput = card.querySelector(".qty-input");
    const noteInput = card.querySelector(".note-input");

    btnMinus?.addEventListener("click", () => onMinus(productId));
    btnPlus?.addEventListener("click", () => onPlus(productId));
    qtyInput?.addEventListener("input", (e) => onInputQty(productId, e.target.value));
    noteInput?.addEventListener("input", (e) => onInputNote(productId, e.target.value));

    container.appendChild(card);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function calculateSummary(products, items) {
  let total = 0;
  let lines = 0;

  for (const [productId, item] of Object.entries(items || {})) {
    const qty = Number(item?.quantidade || 0);
    if (qty > 0 && products[productId]) {
      lines += 1;
      total += qty * Number(products[productId].preco || 0);
    }
  }

  return { lines, total };
}

export function renderReview({ container, products, items, notasEncomenda = "" }) {
  container.innerHTML = "";

  for (const [productId, item] of Object.entries(items || {})) {
    const qty = Number(item?.quantidade || 0);
    const note = item?.nota || "";
    const product = products[productId];

    if (!product || qty <= 0) continue;

    const row = document.createElement("div");
    row.className = "review-item";

    const noteText = note ? ` | Nota: ${note}` : "";
    row.textContent = `${qty} × ${product.nome} (${product.unidade}) — ${money(qty * Number(product.preco || 0))}${noteText}`;

    container.appendChild(row);
  }

  if (notasEncomenda) {
    const notesRow = document.createElement("div");
    notesRow.className = "review-item";
    notesRow.innerHTML = `<strong>Notas da encomenda:</strong> ${notasEncomenda}`;
    container.appendChild(notesRow);
  }
}