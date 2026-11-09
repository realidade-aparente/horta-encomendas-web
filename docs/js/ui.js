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

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Escolhe um local desta lista";
  placeholder.disabled = true;
  placeholder.hidden = true;
  placeholder.selected = !selectedValue;
  selectEl.appendChild(placeholder);

  for (const item of options) {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    if (item === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

function getProductsEntries(products) {
  if (Array.isArray(products)) {
    return products
      .filter(Boolean)
      .map((product) => [product.id, product]);
  }

  return Object.entries(products || {});
}

function getProductById(products, productId) {
  if (Array.isArray(products)) {
    return products.find((product) => product?.id === productId) || null;
  }

  return products?.[productId] || null;
}

export function getDisplayedPrice(product) {
  const unidade = String(product?.unidade || "").toLowerCase();
  const precoKg = Number(product?.preco || 0);
  const gramas = Number(product?.quantidadeComercializacaoGr || 0);

  if (unidade === "kg") {
    return precoKg;
  }

  if (gramas > 0) {
    return (precoKg * gramas) / 1000;
  }

  return precoKg;
}

function getDisplayUnit(unit, qty) {
  const unidade = String(unit || "").toLowerCase();
  const quantidade = Number(qty || 0);

  if (unidade === "molho") {
    return quantidade === 1 ? "molho" : "molhos";
  }

  if (unidade === "emb") {
    return quantidade === 1 ? "emb" : "emb";
  }

  if (unidade === "un") {
    return quantidade === 1 ? "un" : "un";
  }

  return unit || "";
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

  const sorted = getProductsEntries(products)
    .filter(([, product]) => product)
    .filter(([, product]) => product.ativo !== false)
    .filter(([, product]) => product.tipoAtividade !== "i")
    .sort((a, b) => {
      const nomeA = String(a[1].nome || "").toLocaleLowerCase("pt-PT");
      const nomeB = String(b[1].nome || "").toLocaleLowerCase("pt-PT");

      const cmp = nomeA.localeCompare(nomeB, "pt-PT");
      if (cmp !== 0) return cmp;

      const orderA = a[1].ordem ?? 9999;
      const orderB = b[1].ordem ?? 9999;
      return orderA - orderB;
    });

  for (const [productId, product] of sorted) {
    const item = items[productId] || {};
    const qty = item.quantidade ?? "";
    const note = item.nota ?? "";

    const unidade = String(product.unidade || "").toLowerCase();
    const integerOnly = ["molho", "emb", "un"].includes(unidade);
    const stepValue = integerOnly ? "1" : "0.1";

    const displayedPrice = getDisplayedPrice(product);

    const gramsText =
      unidade !== "kg" && product.quantidadeComercializacaoGr
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
            placeholder="Nota curta (máx. 20)"
            value="${escapeHtml(note)}"
            ${isClosed ? "disabled" : ""}
          />
          <div class="char-counter" data-counter-for="${productId}">${String(note).length}/20</div>
        </div>
      `
      : "";

    const card = document.createElement("div");
    card.className = `product-card ${qty !== "" && Number(qty) > 0 ? "product-card-selected" : ""}`.trim();

    card.innerHTML = `
      <div class="product-title">${product.nome}</div>
      <div class="product-meta">${product.unidade}${gramsText} • ${money(displayedPrice)}</div>
      ${originText}
      ${commentText}
      <div class="qty-row">
        <button class="qty-btn" data-action="minus" ${isClosed ? "disabled" : ""}>-</button>

        <div class="qty-input-wrap">
          <input
            class="qty-input"
            type="number"
            inputmode="decimal"
            step="${stepValue}"
            min="0"
            value="${qty}"
            ${isClosed ? "disabled" : ""}
          />
          <span class="qty-unit ${qty === "" ? "hidden" : ""}">
            ${escapeHtml(getDisplayUnit(product.unidade, qty))}
          </span>
        </div>

        <button class="qty-btn" data-action="plus" ${isClosed ? "disabled" : ""}>+</button>
      </div>
      ${noteField}
    `;

    const btnMinus = card.querySelector('[data-action="minus"]');
    const btnPlus = card.querySelector('[data-action="plus"]');
    const qtyInput = card.querySelector(".qty-input");
    const qtyUnit = card.querySelector(".qty-unit");
    const noteInput = card.querySelector(".note-input");
    const noteCounter = card.querySelector(".char-counter");

    btnMinus?.addEventListener("click", () => onMinus(productId));
    btnPlus?.addEventListener("click", () => onPlus(productId));
    qtyInput?.addEventListener("input", (e) => onInputQty(productId, e.target.value));

    qtyInput?.addEventListener("focus", () => {
      qtyUnit?.classList.add("hidden");
    });

    qtyInput?.addEventListener("blur", () => {
      const currentValue = String(qtyInput.value || "").trim();

      if (currentValue === "") {
        qtyUnit?.classList.add("hidden");
      } else {
        qtyUnit?.classList.remove("hidden");
      }
    });

    noteInput?.addEventListener("input", (e) => {
      const value = String(e.target.value || "").slice(0, 20);
      e.target.value = value;

      if (noteCounter) {
        noteCounter.textContent = `${value.length}/20`;
      }

      onInputNote(productId, value);
    });

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
    const product = getProductById(products, productId);

    if (qty > 0 && product) {
      lines += 1;
      total += qty * getDisplayedPrice(product);
    }
  }

  return { lines, total };
}

export function renderReview({ container, products, items, notasEncomenda = "" }) {
  container.innerHTML = "";

  for (const [productId, item] of Object.entries(items || {})) {
    const qty = Number(item?.quantidade || 0);
    const note = item?.nota || "";
    const product = getProductById(products, productId);

    if (!product || qty <= 0) continue;

    const row = document.createElement("div");
    row.className = "review-item";

    const noteText = note ? ` | Nota: ${note}` : "";
    const displayedPrice = getDisplayedPrice(product);
    row.textContent = `${qty} × ${product.nome} (${product.unidade}) — ${money(qty * displayedPrice)}${noteText}`;

    container.appendChild(row);
  }

  if (notasEncomenda) {
    const notesRow = document.createElement("div");
    notesRow.className = "review-item";
    notesRow.innerHTML = `<strong>Notas da encomenda:</strong> ${notasEncomenda}`;
    container.appendChild(notesRow);
  }
}
