import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

import { db } from "./firebase-config.js";

export async function getCurrentWeekId() {
  const snap = await get(ref(db, "config/semanaAtual"));
  return snap.exists() ? snap.val() : null;
}

export async function getWeekData(weekId) {
  const [metaSnap, estadoSnap, locaisSnap, produtosSnap] = await Promise.all([
    get(ref(db, `semanas/${weekId}/meta`)),
    get(ref(db, `semanas/${weekId}/estado`)),
    get(ref(db, `semanas/${weekId}/locaisRecolha`)),
    get(ref(db, `semanas/${weekId}/produtos`))
  ]);

  return {
    meta: metaSnap.exists() ? metaSnap.val() : {},
    estado: estadoSnap.exists() ? estadoSnap.val() : "fechada",
    locaisRecolha: locaisSnap.exists() ? locaisSnap.val() : [],
    produtos: produtosSnap.exists() ? produtosSnap.val() : {}
  };
}

export async function getClientProfile(uid) {
  const snap = await get(ref(db, `clientes/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export async function saveClientProfile(uid, data) {
  await set(ref(db, `clientes/${uid}`), data);
}

export async function getOrder(weekId, uid) {
  const snap = await get(ref(db, `semanas/${weekId}/encomendas/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export async function saveOrder(weekId, uid, payload) {
  await set(ref(db, `semanas/${weekId}/encomendas/${uid}`), payload);
}

export async function patchOrder(weekId, uid, payload) {
  await update(ref(db, `semanas/${weekId}/encomendas/${uid}`), payload);
}

export async function deleteOrder(weekId, uid) {
  await set(ref(db, `semanas/${weekId}/encomendas/${uid}`), null);
}