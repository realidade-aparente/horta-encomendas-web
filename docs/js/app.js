import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { auth } from "./firebase-config.js";
import {
  getWeekData,
  getClientProfile,
  saveClientProfile,
  getOrder,
  saveOrder
} from "./db.js";

import {
  money,
  show,
  hide,
  setWeekStatus,
  renderPickupOptions,
  renderProducts,
  calculateSummary,
  renderReview,
  getDisplayedPrice
} from "./ui.js";

function getCurrentWeekInfo() {
  const now = new Date();
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const day = localDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(localDate);
  monday.setDate(localDate.getDate() + diffToMonday);

  const isoDate = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  isoDate.setUTCDate(isoDate.getUTCDate() + 3);
  const firstThursday = new Date(Date.UTC(isoDate.getUTCFullYear(), 0, 4));
  const weekNumber = 1 + Math.round(
    ((isoDate - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
  );

  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  const weekId = `${yyyy}-${mm}-${dd}`;
  const weekLabel = `Semana ${String(weekNumber).padStart(2, "0")} - ${weekId}`;

  return {
    weekId,
    weekNumber,
    weekLabel
  };
}

const EMAILJS_PUBLIC_KEY = "hgrb7V-u6GGGCYUTa";
const EMAILJS_SERVICE_ID = "service_ja0vggr";
const EMAILJS_TEMPLATE_CLIENTE = "template_08hxlen";
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 10;
const PASSWORD_ALLOWED_REGEX = /^[A-Za-zÀ-ÿ0-9 !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initEmailJS() {
  if (window.emailjs) {
    window.emailjs.init({
      publicKey: EMAILJS_PUBLIC_KEY
    });
  }
}

const els = {
  secAuth: document.getElementById("secAuth"),
  secApp: document.getElementById("secApp"),
  secClosed: document.getElementById("secClosed"),

  loginPanel: document.getElementById("loginPanel"),
  registerPanel: document.getElementById("registerPanel"),

  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  registerEmail: document.getElementById("registerEmail"),
  registerPassword: document.getElementById("registerPassword"),

  loginEmailError: document.getElementById("loginEmailError"),
  loginPasswordError: document.getElementById("loginPasswordError"),
  registerEmailError: document.getElementById("registerEmailError"),
  registerPasswordError: document.getElementById("registerPasswordError"),
  regNameError: document.getElementById("regNameError"),

  btnToggleLoginPassword: document.getElementById("btnToggleLoginPassword"),
  btnToggleRegisterPassword: document.getElementById("btnToggleRegisterPassword"),
  btnShowRegister: document.getElementById("btnShowRegister"),
  btnShowLogin: document.getElementById("btnShowLogin"),

  regName: document.getElementById("regName"),
  regPhone: document.getElementById("regPhone"),
  authMessage: document.getElementById("authMessage"),
  btnLogin: document.getElementById("btnLogin"),
  btnRegister: document.getElementById("btnRegister"),
  btnLogout: document.getElementById("btnLogout"),

  weekLabel: document.getElementById("weekLabel"),
  weekStatus: document.getElementById("weekStatus"),
  customerName: document.getElementById("customerName"),
  customerEmail: document.getElementById("customerEmail"),
  lastUpdate: document.getElementById("lastUpdate"),

  pickupLocation: document.getElementById("pickupLocation"),
  productsList: document.getElementById("productsList"),
  summaryBar: document.getElementById("summaryBar"),
  summaryLines: document.getElementById("summaryLines"),
  summaryTotal: document.getElementById("summaryTotal"),

  reviewModal: document.getElementById("reviewModal"),
  reviewWeek: document.getElementById("reviewWeek"),
  reviewCustomer: document.getElementById("reviewCustomer"),
  reviewPickup: document.getElementById("reviewPickup"),
  reviewItems: document.getElementById("reviewItems"),
  reviewTotal: document.getElementById("reviewTotal"),
  btnReview: document.getElementById("btnReview"),
  btnCloseReview: document.getElementById("btnCloseReview"),
  btnSubmitOrder: document.getElementById("btnSubmitOrder"),
  btnSaveOrder: document.getElementById("btnSaveOrder"),
  orderNotes: document.getElementById("orderNotes"),
  orderNotesCounter: document.getElementById("orderNotesCounter"),
};

const state = {
  uid: null,
  user: null,
  profile: null,
  weekId: null,
  weekData: null,
  products: [],
  items: {},
  pickupLocation: "",
  notasEncomenda: ""
};

function setMessage(msg, isError = false) {
  els.authMessage.textContent = msg;
  els.authMessage.style.color = isError ? "#b00020" : "#2f7d32";
}

function clearAuthMessage() {
  setMessage("", false);
}

function setFieldError(inputEl, errorEl, message) {
  if (!inputEl || !errorEl) return false;
  inputEl.classList.add("input-error");
  inputEl.classList.remove("input-valid");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  return false;
}

function setFieldValid(inputEl, errorEl) {
  if (!inputEl || !errorEl) return true;
  inputEl.classList.remove("input-error");
  inputEl.classList.add("input-valid");
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
  return true;
}

function clearFieldState(inputEl, errorEl) {
  if (!inputEl || !errorEl) return;
  inputEl.classList.remove("input-error", "input-valid");
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function clearAllAuthFieldStates() {
  clearFieldState(els.loginEmail, els.loginEmailError);
  clearFieldState(els.loginPassword, els.loginPasswordError);
  clearFieldState(els.registerEmail, els.registerEmailError);
  clearFieldState(els.registerPassword, els.registerPasswordError);
  clearFieldState(els.regName, els.regNameError);
}

function showLoginPanel() {
  show(els.loginPanel);
  hide(els.registerPanel);
  clearAuthMessage();
  clearAllAuthFieldStates();
}

function showRegisterPanel() {
  hide(els.loginPanel);
  show(els.registerPanel);
  clearAuthMessage();
  clearAllAuthFieldStates();
}

function setPasswordVisibility(inputEl, buttonEl, visible) {
  if (!inputEl || !buttonEl) return;
  inputEl.type = visible ? "text" : "password";
  buttonEl.textContent = visible ? "🙈" : "👁";
}

function togglePasswordVisibility(inputEl, buttonEl) {
  if (!inputEl || !buttonEl) return;
  const isVisible = inputEl.type === "text";
  setPasswordVisibility(inputEl, buttonEl, !isVisible);
}

function validateEmailField(inputEl, errorEl, { required = true } = {}) {
  const value = String(inputEl?.value || "").trim();

  if (!value) {
    if (!required) {
      clearFieldState(inputEl, errorEl);
      return true;
    }
    return setFieldError(inputEl, errorEl, "Preenche o endereço de email.");
  }

  if (!EMAIL_REGEX.test(value)) {
    return setFieldError(inputEl, errorEl, "Introduz um endereço de email válido.");
  }

  return setFieldValid(inputEl, errorEl);
}

function validatePasswordField(inputEl, errorEl, { required = true } = {}) {
  const value = String(inputEl?.value || "");

  if (!value) {
    if (!required) {
      clearFieldState(inputEl, errorEl);
      return true;
    }
    return setFieldError(inputEl, errorEl, "Preenche a palavra-passe.");
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return setFieldError(inputEl, errorEl, `A palavra-passe deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }

  if (value.length > PASSWORD_MAX_LENGTH) {
    return setFieldError(inputEl, errorEl, `A palavra-passe deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);
  }

  if (!PASSWORD_ALLOWED_REGEX.test(value)) {
    return setFieldError(inputEl, errorEl, "Usa apenas letras, números e símbolos normais do teclado.");
  }

  return setFieldValid(inputEl, errorEl);
}

function validateNameField(inputEl, errorEl) {
  const value = String(inputEl?.value || "").trim();

  if (!value) {
    return setFieldError(inputEl, errorEl, "Preenche o nome para criar conta.");
  }

  return setFieldValid(inputEl, errorEl);
}

function validateLoginForm() {
  clearAuthMessage();
  const emailOk = validateEmailField(els.loginEmail, els.loginEmailError);
  const passwordOk = validatePasswordField(els.loginPassword, els.loginPasswordError);
  return emailOk && passwordOk;
}

function validateRegisterForm() {
  clearAuthMessage();
  const emailOk = validateEmailField(els.registerEmail, els.registerEmailError);
  const passwordOk = validatePasswordField(els.registerPassword, els.registerPasswordError);
  const nameOk = validateNameField(els.regName, els.regNameError);
  return emailOk && passwordOk && nameOk;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildWeeklyCatalog(produtosGerais = {}, produtosSemana = {}) {
  const result = [];

  for (const [productId, dadosSemana] of Object.entries(produtosSemana || {})) {
    const dadosGeral = produtosGerais?.[productId];
    if (!dadosGeral) continue;

    const tipoAtividade = dadosGeral.tipoAtividade ?? "i";
    if (tipoAtividade === "i") continue;

    const item = {
      id: productId,
      nome: dadosGeral.nome ?? productId,
      unidade: dadosGeral.unidade ?? "",
      aceitaNotaCliente: !!dadosGeral.aceitaNotaCliente,
      quantidadeComercializacaoGr: dadosGeral.quantidadeComercializacaoGr ?? 0,
      tipoAtividade,
      preco: dadosSemana.preco ?? dadosGeral.precoConsumidor ?? 0,
      origem: dadosSemana.origem ?? dadosGeral.origemPadrao ?? "",
      comentario: dadosSemana.comentario ?? dadosGeral.comentarioPadrao ?? "",
      ordem: dadosSemana.ordem ?? dadosGeral.ordem ?? 999,
      ativo: dadosSemana.ativo ?? true
    };

    result.push(item);
  }

  result.sort((a, b) => {
    const ordemDiff = (a.ordem ?? 999) - (b.ordem ?? 999);
    if (ordemDiff !== 0) return ordemDiff;
    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt");
  });

  return result;
}

function getProductById(productId) {
  return state.products.find((product) => product?.id === productId) || null;
}

function buildOrderRowsHtml() {
  const rows = [];

  for (const [productId, item] of Object.entries(state.items || {})) {
    const qty = Number(item?.quantidade || 0);
    const note = item?.nota || "";
    const product = getProductById(productId);

    if (!product || qty <= 0) continue;

    const subtotal = qty * getDisplayedPrice(product);
    const noteHtml = note
      ? `<div style="font-size:12px; color:#777; margin-top:4px;">Nota: ${escapeHtml(note)}</div>`
      : "";

    rows.push(`
      <tr>
        <td style="padding:14px 0; border-bottom:1px solid #e5e5e5; vertical-align:top;">
          <div>${escapeHtml(product.nome)}</div>
          ${noteHtml}
        </td>
        <td style="padding:14px 0; border-bottom:1px solid #e5e5e5; vertical-align:top;">
          ${escapeHtml(String(qty))} ${escapeHtml(product.unidade)}
        </td>
        <td style="padding:14px 0; border-bottom:1px solid #e5e5e5; text-align:right; vertical-align:top;">
          ${money(subtotal)}
        </td>
      </tr>
    `);
  }

  return rows.join("");
}

function buildNotesHtml() {
  if (!state.notasEncomenda) return "";

  return `
    <div style="border-top:1px solid #ddd; padding-top:20px; margin-top:20px;">
      <div style="font-size:12px; text-transform:uppercase; color:#888; margin-bottom:8px;">Notas gerais</div>
      <div style="font-size:16px; line-height:1.6;">
        ${escapeHtml(state.notasEncomenda)}
      </div>
    </div>
  `;
}

function normalizeQty(value, product) {
  if (value === "" || value === null || value === undefined) return "";

  const cleaned = String(value).replace(",", ".").trim();
  const n = Number(cleaned);

  if (Number.isNaN(n) || n < 0) return "";

  const unidade = String(product?.unidade || "").toLowerCase();
  const integerOnly = ["molho", "emb", "un"].includes(unidade);

  if (integerOnly) {
    return Math.round(n);
  }

  return Number(n.toFixed(3));
}

function refreshSummary() {
  const { lines, total } = calculateSummary(state.products, state.items);
  els.summaryLines.textContent = `${lines} produtos`;
  els.summaryTotal.textContent = `Total estimado: ${money(total)}`;
}

function getQuantityStepMinus(product, currentQty = 0) {
  const unidade = String(product?.unidade || "").toLowerCase();

  if (["molho", "emb", "un"].includes(unidade)) {
    return 1;
  }

  if (unidade === "kg") {
    return currentQty <= 1 ? 0.1 : 1;
  }

  return 1;
}

function renderAllProducts() {
  renderProducts({
    container: els.productsList,
    products: state.products,
    items: state.items,
    isClosed: state.weekData?.estado !== "aberta" || !state.user,
    onMinus: (productId) => {
      const product = getProductById(productId);
      const current = Number(state.items[productId]?.quantidade || 0);
      const step = getQuantityStepMinus(product, current);
      const next = Math.max(0, Number((current - step).toFixed(3)));

      if (next === 0) {
        delete state.items[productId];
      } else {
        state.items[productId] = {
          quantidade: next,
          nota: state.items[productId]?.nota || ""
        };
      }

      renderAllProducts();
      refreshSummary();
    },
    onPlus: (productId) => {
      const product = getProductById(productId);
      const unidade = String(product?.unidade || "").toLowerCase();
      const current = Number(state.items[productId]?.quantidade || 0);

      let next;

      if (["molho", "emb", "un"].includes(unidade)) {
        next = current + 1;
      } else if (unidade === "kg") {
        if (current < 0.9) {
          next = Number((current + 0.1).toFixed(3));
        } else {
          next = Math.floor(current) + 1;
        }
      } else {
        next = current + 1;
      }

      state.items[productId] = {
        quantidade: next,
        nota: state.items[productId]?.nota || ""
      };

      renderAllProducts();
      refreshSummary();
    },
    onInputQty: (productId, value) => {
      const product = getProductById(productId);
      const normalized = normalizeQty(value, product);

      if (normalized === "") {
        delete state.items[productId];
      } else {
        state.items[productId] = {
          quantidade: normalized,
          nota: state.items[productId]?.nota || ""
        };
      }

      refreshSummary();
    },
    onInputNote: (productId, value) => {
      const cleaned = String(value || "").slice(0, 20);

      if (!state.items[productId]) {
        state.items[productId] = {
          quantidade: 0,
          nota: cleaned
        };
      } else {
        state.items[productId].nota = cleaned;
      }
    }
  });
}

function buildOrderLinesText() {
  const lines = [];

  for (const [productId, item] of Object.entries(state.items || {})) {
    const qty = Number(item?.quantidade || 0);
    const note = item?.nota || "";
    const product = getProductById(productId);

    if (!product || qty <= 0) continue;

    const subtotal = qty * getDisplayedPrice(product);
    const noteText = note ? ` | Nota: ${note}` : "";

    lines.push(
      `${qty} x ${product.nome} (${product.unidade}) — ${money(subtotal)}${noteText}`
    );
  }

  if (state.notasEncomenda) {
    lines.push(`\nNotas da encomenda: ${state.notasEncomenda}`);
  }

  return lines.length > 0 ? lines.join("\n") : "Sem produtos selecionados.";
}

function buildOrderPayload(submitState = "submetida") {
  const cleanItems = {};

  for (const [productId, item] of Object.entries(state.items || {})) {
    const quantidade = Number(item?.quantidade || 0);
    const nota = String(item?.nota || "").slice(0, 20);

    if (quantidade > 0) {
      cleanItems[productId] = {
        quantidade,
        nota
      };
    }
  }

  const { lines, total } = calculateSummary(state.products, cleanItems);

  return {
    clienteUid: state.uid,
    email: state.user.email,
    nomeCliente: String(state.profile?.nome || "").trim(),
    origem: "web",
    estado: submitState,
    ultimaAtualizacao: new Date().toISOString(),
    localRecolha: state.pickupLocation || "",
    notasEncomenda: String(state.notasEncomenda || "").slice(0, 100),
    itens: cleanItems,
    totais: {
      valorEstimado: Number(total.toFixed(2)),
      numeroLinhas: lines
    }
  };
}

async function ensureClientProfile() {
  if (!state.user || !state.uid) return null;

  let profile = await getClientProfile(state.uid);

  if (!profile) {
    const email = state.user.email || "";
    const nomeBase = email ? email.split("@")[0] : "Cliente";

    profile = {
      email,
      nome: nomeBase,
      telefone: "",
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    await saveClientProfile(state.uid, profile);
  }

  return profile;
}

async function loadAppData() {
  const currentWeek = getCurrentWeekInfo();
  state.weekId = currentWeek.weekId;

  state.weekData = await getWeekData(state.weekId);

  els.weekLabel.textContent = currentWeek.weekLabel;
  setWeekStatus(els.weekStatus, state.weekData?.estado || "fechada");

  state.products = buildWeeklyCatalog(
    state.weekData?.produtosGerais || {},
    state.weekData?.produtosSemana || {}
  );

  const pickupOptions = state.weekData?.locaisRecolha || [
    "Quinta",
    "Mercado local",
    "Entrega combinada"
  ];

  if (state.user && state.uid) {
    state.profile = await ensureClientProfile();
    const order = await getOrder(state.weekId, state.uid);

    els.customerName.textContent = state.profile?.nome || "Cliente";
    els.customerEmail.textContent = state.user?.email || "";

    state.items = order?.itens || {};
    state.pickupLocation = order?.localRecolha || "";
    state.notasEncomenda = order?.notasEncomenda || "";
    els.orderNotes.value = state.notasEncomenda;

    if (els.orderNotesCounter) {
      els.orderNotesCounter.textContent = `${state.notasEncomenda.length}/100`;
    }

    els.lastUpdate.textContent = order?.ultimaAtualizacao
      ? new Date(order.ultimaAtualizacao).toLocaleString("pt-PT")
      : "Sem registo";
  } else {
    state.profile = null;
    state.items = {};
    state.pickupLocation = "";
    state.notasEncomenda = "";
    els.orderNotes.value = "";

    if (els.orderNotesCounter) {
      els.orderNotesCounter.textContent = "0/100";
    }

    els.customerName.textContent = "Visitante";
    els.customerEmail.textContent = "Inicia sessão para guardar a encomenda";
    els.lastUpdate.textContent = "Sem registo";
  }

  renderPickupOptions(els.pickupLocation, pickupOptions, state.pickupLocation);

  els.pickupLocation.disabled = !state.user || state.weekData?.estado !== "aberta";
  els.orderNotes.disabled = !state.user || state.weekData?.estado !== "aberta";

  if (state.weekData?.estado !== "aberta") {
    show(els.secClosed);
  } else {
    hide(els.secClosed);
  }

  if (state.user) {
    show(els.summaryBar);
  } else {
    hide(els.summaryBar);
  }

  renderAllProducts();
  refreshSummary();
}

async function handleRegister() {
  if (!validateRegisterForm()) return;

  const email = els.registerEmail.value.trim();
  const password = els.registerPassword.value;
  const nome = els.regName.value.trim();
  const telefone = els.regPhone.value.trim();

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await saveClientProfile(cred.user.uid, {
      email,
      nome,
      telefone,
      ativo: true,
      criadoEm: new Date().toISOString()
    });
    setMessage("Conta criada com sucesso.");
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function handleLogin() {
  if (!validateLoginForm()) return;

  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    setMessage("Sessão iniciada.");
  } catch (err) {
    setMessage("Não foi possível entrar. Verifica se o email e a palavra-passe estão corretos.", true);
  }
}

async function sendClientConfirmationEmail(payload, isUpdate = false) {
  if (!window.emailjs) {
    console.warn("EmailJS não está disponível.");
    return;
  }

  const isFinal = payload.estado === "entregue";

  const templateParams = {
    to_email: state.user.email,
    to_name: state.profile?.nome || "Cliente",
    week_label: state.weekData?.meta?.label || state.weekId,
    email_heading: isUpdate ? "Encomenda atualizada" : "Encomenda confirmada",
    intro_text: isUpdate
      ? "Confirmo a atualização da seguinte encomenda:"
      : "Confirmo a receção da seguinte encomenda:",
    order_rows_html: buildOrderRowsHtml(),
    pickup_location: payload.localRecolha || "",
    order_total_label: isFinal ? "Valor final" : "Valor estimado",
    order_total: money(payload.totais?.valorEstimado || 0),
    notes_html: buildNotesHtml(),
    updated_at: new Date(payload.ultimaAtualizacao).toLocaleString("pt-PT"),
    order_status: payload.estado || "submetida"
  };

  await window.emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_CLIENTE,
    templateParams
  );
}

async function handleSave(submitState = "submetida") {
  if (!state.user || !state.uid) {
    alert("Inicia sessão ou cria conta para guardar ou submeter a encomenda.");
    return;
  }

  if (!state.profile?.nome || !String(state.profile.nome).trim()) {
    alert("O perfil deste cliente está incompleto. Termina sessão e volta a entrar.");
    return;
  }

  if (!state.weekId || !state.uid) return;

  if (!state.pickupLocation) {
    alert("Escolhe um local de recolha antes de guardar a encomenda.");
    return;
  }

  const previousOrder = await getOrder(state.weekId, state.uid);
  const isUpdate = !!previousOrder;

  const payload = buildOrderPayload(submitState);
  await saveOrder(state.weekId, state.uid, payload);

  if (submitState === "submetida") {
    try {
      await sendClientConfirmationEmail(payload, isUpdate);
    } catch (err) {
      console.error("Erro ao enviar email:", err);
      alert("A encomenda foi submetida, mas houve um erro ao enviar o email de confirmação.");
    }
  }

  els.lastUpdate.textContent = new Date(payload.ultimaAtualizacao).toLocaleString("pt-PT");

  if (submitState === "rascunho") {
    alert("Rascunho guardado com sucesso.");
  } else {
    alert("Encomenda submetida com sucesso. Foi enviado um email de confirmação.");
  }
}

function openReview() {
  els.reviewWeek.textContent = els.weekLabel.textContent;
  els.reviewCustomer.textContent = state.profile?.nome || "";
  els.reviewPickup.textContent = `Local de recolha: ${state.pickupLocation || "(não escolhido)"}`;

  renderReview({
    container: els.reviewItems,
    products: state.products,
    items: state.items,
    notasEncomenda: state.notasEncomenda
  });

  const { total } = calculateSummary(state.products, state.items);
  els.reviewTotal.textContent = `Total estimado: ${money(total)}`;
  show(els.reviewModal);
}

function bindValidationEvents() {
  els.loginEmail.addEventListener("blur", () => {
    validateEmailField(els.loginEmail, els.loginEmailError, { required: true });
  });

  els.loginPassword.addEventListener("blur", () => {
    validatePasswordField(els.loginPassword, els.loginPasswordError, { required: true });
  });

  els.registerEmail.addEventListener("blur", () => {
    validateEmailField(els.registerEmail, els.registerEmailError, { required: true });
  });

  els.registerPassword.addEventListener("blur", () => {
    validatePasswordField(els.registerPassword, els.registerPasswordError, { required: true });
  });

  els.regName.addEventListener("blur", () => {
    validateNameField(els.regName, els.regNameError);
  });

  els.loginEmail.addEventListener("input", () => {
    clearFieldState(els.loginEmail, els.loginEmailError);
  });

  els.loginPassword.addEventListener("input", () => {
    clearFieldState(els.loginPassword, els.loginPasswordError);
  });

  els.registerEmail.addEventListener("input", () => {
    clearFieldState(els.registerEmail, els.registerEmailError);
  });

  els.registerPassword.addEventListener("input", () => {
    clearFieldState(els.registerPassword, els.registerPasswordError);
  });

  els.regName.addEventListener("input", () => {
    clearFieldState(els.regName, els.regNameError);
  });
}

function bindEvents() {
  els.btnLogin.addEventListener("click", handleLogin);
  els.btnRegister.addEventListener("click", handleRegister);

  els.btnShowRegister.addEventListener("click", () => {
    showRegisterPanel();
  });

  els.btnShowLogin.addEventListener("click", () => {
    showLoginPanel();
  });

  els.btnToggleLoginPassword.addEventListener("click", () => {
    togglePasswordVisibility(els.loginPassword, els.btnToggleLoginPassword);
  });

  els.btnToggleRegisterPassword.addEventListener("click", () => {
    togglePasswordVisibility(els.registerPassword, els.btnToggleRegisterPassword);
  });

  els.btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });

  els.pickupLocation.addEventListener("change", (e) => {
    state.pickupLocation = e.target.value;
  });

  els.btnReview.addEventListener("click", openReview);
  els.btnCloseReview.addEventListener("click", () => hide(els.reviewModal));

  els.btnSaveOrder.addEventListener("click", async () => {
    await handleSave("rascunho");
  });

  els.btnSubmitOrder.addEventListener("click", async () => {
    await handleSave("submetida");
    hide(els.reviewModal);
  });

  els.orderNotes.addEventListener("input", (e) => {
    const value = String(e.target.value || "").slice(0, 100);
    e.target.value = value;
    state.notasEncomenda = value;

    if (els.orderNotesCounter) {
      els.orderNotesCounter.textContent = `${value.length}/100`;
    }
  });

  bindValidationEvents();
}

function initAuthObserver() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      state.uid = null;
      state.user = null;

      try {
        await loadAppData();
        show(els.secAuth);
        show(els.secApp);
        showLoginPanel();
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar dados.");
      }

      return;
    }

    state.uid = user.uid;
    state.user = user;

    try {
      await loadAppData();
      hide(els.secAuth);
      show(els.secApp);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar dados.");
    }
  });
}

initEmailJS();
bindEvents();
initAuthObserver();
