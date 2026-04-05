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
  renderReview
} from "./ui.js";

function getCurrentWeekInfo() {
  const now = new Date();
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const day = localDate.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
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

  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  regName: document.getElementById("regName"),
  regPhone: document.getElementById("regPhone"),
  registerExtra: document.getElementById("registerExtra"),
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
  btnSaveOrder: document.getElementById("btnSaveOrder")
};

const state = {
  uid: null,
  user: null,
  profile: null,
  weekId: null,
  weekData: null,
  products: {},
  quantities: {},
  pickupLocation: ""
};

function setMessage(msg, isError = false) {
  els.authMessage.textContent = msg;
  els.authMessage.style.color = isError ? "#b00020" : "#2f7d32";
}

function normalizeQty(value) {
  if (value === "" || value === null || value === undefined) return "";
  const cleaned = String(value).replace(",", ".").trim();
  const n = Number(cleaned);

  if (Number.isNaN(n) || n < 0) return "";
  return Number(n.toFixed(3));
}

function refreshSummary() {
  const { lines, total } = calculateSummary(state.products, state.quantities);
  els.summaryLines.textContent = `${lines} produtos`;
  els.summaryTotal.textContent = `Total estimado: ${money(total)}`;
}

function renderAllProducts() {
  renderProducts({
    container: els.productsList,
    products: state.products,
    quantities: state.quantities,
    isClosed: state.weekData?.estado !== "aberta" || !state.user,
    onMinus: (productId) => {
      const current = Number(state.quantities[productId] || 0);
      const next = Math.max(0, current - 1);
      if (next === 0) {
        delete state.quantities[productId];
      } else {
        state.quantities[productId] = next;
      }
      renderAllProducts();
      refreshSummary();
    },
    onPlus: (productId) => {
      const current = Number(state.quantities[productId] || 0);
      state.quantities[productId] = current + 1;
      renderAllProducts();
      refreshSummary();
    },
    onInput: (productId, value) => {
      const normalized = normalizeQty(value);
      if (normalized === "") {
        delete state.quantities[productId];
      } else {
        state.quantities[productId] = normalized;
      }
      refreshSummary();
    }
  });
}

function buildOrderLinesText() {
  const lines = [];

  for (const [productId, qtyRaw] of Object.entries(state.quantities || {})) {
    const qty = Number(qtyRaw || 0);
    const product = state.products[productId];

    if (!product || qty <= 0) continue;

    const subtotal = qty * Number(product.preco || 0);
    lines.push(
      `${qty} x ${product.nome} (${product.unidade}) — ${money(subtotal)}`
    );
  }

  return lines.length > 0 ? lines.join("\n") : "Sem produtos selecionados.";
}

function buildOrderPayload(submitState = "submetida") {
  const cleanItems = {};
  for (const [productId, qty] of Object.entries(state.quantities)) {
    const n = Number(qty || 0);
    if (n > 0) cleanItems[productId] = n;
  }

  const { lines, total } = calculateSummary(state.products, cleanItems);

  return {
    clienteUid: state.uid,
    email: state.user.email,
    nomeCliente: state.profile?.nome || "",
    origem: "web",
    estado: submitState,
    ultimaAtualizacao: new Date().toISOString(),
    localRecolha: state.pickupLocation || "",
    itens: cleanItems,
    totais: {
      valorEstimado: Number(total.toFixed(2)),
      numeroLinhas: lines
    }
  };
}

async function loadAppData() {
  const currentWeek = getCurrentWeekInfo();
  state.weekId = currentWeek.weekId;

  state.weekData = await getWeekData(state.weekId);

  els.weekLabel.textContent = currentWeek.weekLabel;
  setWeekStatus(els.weekStatus, state.weekData?.estado || "fechada");

  state.products = state.weekData?.produtos || {};

  const pickupOptions = state.weekData?.locaisRecolha || [
    "Quinta",
    "Mercado local",
    "Entrega combinada"
  ];

  if (state.user && state.uid) {
    state.profile = await getClientProfile(state.uid);
    const order = await getOrder(state.weekId, state.uid);

    els.customerName.textContent = state.profile?.nome || "Cliente";
    els.customerEmail.textContent = state.user?.email || "";

    state.quantities = order?.itens || {};
    state.pickupLocation = order?.localRecolha || "";

    els.lastUpdate.textContent = order?.ultimaAtualizacao
      ? new Date(order.ultimaAtualizacao).toLocaleString("pt-PT")
      : "Sem registo";
  } else {
    state.profile = null;
    state.quantities = {};
    state.pickupLocation = "";
    els.customerName.textContent = "Visitante";
    els.customerEmail.textContent = "Inicia sessão para guardar a encomenda";
    els.lastUpdate.textContent = "Sem registo";
  }

  renderPickupOptions(els.pickupLocation, pickupOptions, state.pickupLocation);
  
  els.pickupLocation.disabled = !state.user || state.weekData?.estado !== "aberta";
  
  if (state.weekData?.estado !== "aberta") {
    show(els.secClosed);
  } else {
    hide(els.secClosed);
  }

  renderAllProducts();
  refreshSummary();
}

async function handleRegister() {
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value.trim();
  const nome = els.regName.value.trim();
  const telefone = els.regPhone.value.trim();

  if (!nome) {
    setMessage("Preenche o nome para criar conta.", true);
    show(els.registerExtra);
    return;
  }

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
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    setMessage("Sessão iniciada.");
  } catch (err) {
    show(els.registerExtra);
    setMessage("Não foi possível entrar. Se ainda não tens conta, preenche o nome e cria conta.", true);
  }
}

async function sendClientConfirmationEmail(payload) {
  if (!window.emailjs) {
    console.warn("EmailJS não está disponível.");
    return;
  }

  const templateParams = {
    to_email: state.user.email,
    to_name: state.profile?.nome || "Cliente",
    week_label: state.weekData?.meta?.label || state.weekId,
    pickup_location: payload.localRecolha || "",
    order_lines: buildOrderLinesText(),
    order_total: money(payload.totais?.valorEstimado || 0),
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
  if (!state.weekId || !state.uid) return;

  if (!state.pickupLocation) {
    alert("Escolhe um local de recolha antes de guardar a encomenda.");
    return;
  }

  const payload = buildOrderPayload(submitState);
  await saveOrder(state.weekId, state.uid, payload);

  if (submitState === "submetida") {
    try {
      await sendClientConfirmationEmail(payload);
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
    quantities: state.quantities
  });

  const { total } = calculateSummary(state.products, state.quantities);
  els.reviewTotal.textContent = `Total estimado: ${money(total)}`;
  show(els.reviewModal);
}

function bindEvents() {
  els.btnLogin.addEventListener("click", handleLogin);

  els.btnRegister.addEventListener("click", () => {
    show(els.registerExtra);
    handleRegister();
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