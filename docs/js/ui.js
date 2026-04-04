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
  quantities,
  isClosed,
  onMinus,
  onInput,
  onPlus
}) {
  container.innerHTML = "";

  const sorted = Object.entries(products || {}).sort((a, b) => {
    const orderA = a[1].ordem ?? 9999;
    const orderB = b[1].ordem ?? 9999;
    return orderA - orderB;
  });

  for (const [productId, product] of sorted) {
    if (product.ativo === false) continue;

    const qty = quantities[productId] ?? "";

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-title">${product.nome}</div>
      <div class="product-meta">${product.unidade} • ${money(product.preco)}</div>
      <div class="qty-row">
        <button class="qty-btn" data-action="minus" ${isClosed ? "disabled" : ""}>-</button>
        <input
          class="qty-input"
          type="number"
          inputmode="decimal"
          step="0.1"
          min="0"
          value="${qty}"
          ${isClosed ? "disabled" : ""}
        />
        <button class="qty-btn" data-action="plus" ${isClosed ? "disabled" : ""}>+</button>
      </div>
    `;

    const btnMinus = card.querySelector('[data-action="minus"]');
    const btnPlus = card.querySelector('[data-action="plus"]');
    const input = card.querySelector(".qty-input");

    btnMinus?.addEventListener("click", () => onMinus(productId));
    btnPlus?.addEventListener("click", () => onPlus(productId));
    input?.addEventListener("input", (e) => onInput(productId, e.target.value));

    container.appendChild(card);
  }
}

export function calculateSummary(products, quantities) {
  let total = 0;
  let lines = 0;

  for (const [productId, qtyRaw] of Object.entries(quantities || {})) {
    const qty = Number(qtyRaw || 0);
    if (qty > 0 && products[productId]) {
      lines += 1;
      total += qty * Number(products[productId].preco || 0);
    }
  }

  return { lines, total };
}

export function renderReview({ container, products, quantities }) {
  container.innerHTML = "";

  for (const [productId, qtyRaw] of Object.entries(quantities || {})) {
    const qty = Number(qtyRaw || 0);
    const product = products[productId];
    if (!product || qty <= 0) continue;

    const row = document.createElement("div");
    row.className = "review-item";
    row.textContent = `${qty} × ${product.nome} (${product.unidade}) — ${money(qty * Number(product.preco || 0))}`;
    container.appendChild(row);
  }
}