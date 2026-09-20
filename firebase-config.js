// firebase-config.js
// Konfigurasi Firebase + helper functions

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7-xZFaGMXzy_5UwPKd5jY8EFWpCk5UDc",
  authDomain: "babycare-shop-bf6bc.firebaseapp.com",
  projectId: "babycare-shop-bf6bc",
  storageBucket: "babycare-shop-bf6bc.firebasestorage.app",
  messagingSenderId: "98641123320",
  appId: "1:98641123320:web:b2b3dc72881fdcab10a80d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========== PRODUCTS ==========
export async function fbGetProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fbAddProduct(data) {
  return await addDoc(collection(db, "products"), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function fbUpdateProduct(id, data) {
  return await updateDoc(doc(db, "products", id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function fbDeleteProduct(id) {
  return await deleteDoc(doc(db, "products", id));
}

export function fbWatchProducts(callback) {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(products);
  });
}

// ========== ORDERS ==========
export async function fbGetOrders() {
  const snap = await getDocs(collection(db, "orders"));
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return orders.sort((a, b) => {
    const ta = a.date?.seconds || 0;
    const tb = b.date?.seconds || 0;
    return tb - ta;
  });
}

export async function fbAddOrder(data) {
  return await addDoc(collection(db, "orders"), {
    ...data,
    date: serverTimestamp()
  });
}

export async function fbUpdateOrder(id, data) {
  return await updateDoc(doc(db, "orders", id), data);
}

export async function fbDeleteOrder(id) {
  return await deleteDoc(doc(db, "orders", id));
}

export { db };
