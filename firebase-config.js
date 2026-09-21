// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, writeBatch, where, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const auth = getAuth(app);

// ========== AUTH ==========
export function fbOnAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function fbRegister(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      email, displayName, createdAt: serverTimestamp()
    }, { merge: true });
  } catch (e) { console.warn('Save user error:', e); }
  return cred.user;
}

export async function fbLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function fbLogout() {
  await signOut(auth);
}

export function fbCurrentUser() {
  return auth.currentUser;
}

export async function fbResetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ========== USERS ==========
export async function fbGetUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function fbUpdateUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

// ========== PRODUCTS ==========
export async function fbGetProducts() {
  try {
    const snap = await getDocs(collection(db, "products"));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    products.sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });
    return products;
  } catch (e) {
    console.error('fbGetProducts error:', e);
    throw e;
  }
}

export async function fbAddProduct(data) {
  return await addDoc(collection(db, "products"), {
    ...data, createdAt: serverTimestamp()
  });
}

export async function fbUpdateProduct(id, data) {
  return await updateDoc(doc(db, "products", id), {
    ...data, updatedAt: serverTimestamp()
  });
}

export async function fbDeleteProduct(id) {
  return await deleteDoc(doc(db, "products", id));
}

// ========== CATEGORIES ==========
export async function fbGetCategories() {
  try {
    const snap = await getDocs(collection(db, "categories"));
    if (snap.empty) return [];
    const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cats.sort((a, b) => (a.order || 99) - (b.order || 99));
    return cats;
  } catch (e) {
    console.error('fbGetCategories error:', e);
    return [];
  }
}

const DEFAULT_CATEGORIES = [
  { slug: 'baju', name: 'Baju Bayi', icon: '👕', subLabel: 'Pakaian Lucu', badge: 'badge-info', order: 1 },
  { slug: 'celana', name: 'Celana', icon: '👖', subLabel: 'Nyaman & Elastis', badge: 'badge-info', order: 2 },
  { slug: 'aksesoris', name: 'Aksesoris', icon: '🎀', subLabel: 'Topi, Selimut, dll', badge: 'badge-warning', order: 3 },
  { slug: 'perawatan', name: 'Perawatan', icon: '🧴', subLabel: 'Sabun, Minyak, dll', badge: 'badge-success', order: 4 },
  { slug: 'mainan', name: 'Mainan', icon: '🧸', subLabel: 'Edukatif & Aman', badge: 'badge-secondary', order: 5 },
  { slug: 'sepatu', name: 'Sepatu', icon: '👟', subLabel: 'Soft Sole Anti Slip', badge: 'badge-danger', order: 6 },
  { slug: 'perlengkapan', name: 'Perlengkapan Bayi', icon: '🍼', subLabel: 'Bedong, Gendongan', badge: 'badge-pink', order: 7 },
  { slug: 'mpasi', name: 'MPASI & Makanan', icon: '🍽️', subLabel: 'Bubur, Snack Bayi', badge: 'badge-success', order: 8 },
  { slug: 'botol', name: 'Botol & Dot', icon: '🍶', subLabel: 'Botol Susu, Dot', badge: 'badge-warning', order: 9 },
  { slug: 'stroller', name: 'Stroller & Car Seat', icon: '🚼', subLabel: 'Kereta Bayi', badge: 'badge-purple', order: 10 }
];

export async function fbSeedCategories() {
  const existing = await fbGetCategories();
  if (existing.length > 0) return { seeded: false, count: existing.length };
  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach(cat => {
    const ref = doc(collection(db, "categories"));
    batch.set(ref, { ...cat, createdAt: serverTimestamp() });
  });
  await batch.commit();
  return { seeded: true, count: DEFAULT_CATEGORIES.length };
}

export async function fbAddCategory(data) {
  return await addDoc(collection(db, "categories"), {
    ...data, createdAt: serverTimestamp()
  });
}

export async function fbUpdateCategory(id, data) {
  return await updateDoc(doc(db, "categories", id), {
    ...data, updatedAt: serverTimestamp()
  });
}

export async function fbDeleteCategory(id) {
  return await deleteDoc(doc(db, "categories", id));
}

// ========== ORDERS ==========
export async function fbGetOrders() {
  try {
    const snap = await getDocs(collection(db, "orders"));
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => {
      const ta = a.date?.seconds || 0;
      const tb = b.date?.seconds || 0;
      return tb - ta;
    });
    return orders;
  } catch (e) {
    console.error('fbGetOrders error:', e);
    throw e;
  }
}

export async function fbGetUserOrders(uid) {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", uid));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => {
      const ta = a.date?.seconds || 0;
      const tb = b.date?.seconds || 0;
      return tb - ta;
    });
    return orders;
  } catch (e) {
    console.error('fbGetUserOrders error:', e);
    return [];
  }
}

export async function fbAddOrder(data) {
  return await addDoc(collection(db, "orders"), {
    ...data, date: serverTimestamp()
  });
}

export async function fbUpdateOrder(id, data) {
  return await updateDoc(doc(db, "orders", id), data);
}

export async function fbDeleteOrder(id) {
  return await deleteDoc(doc(db, "orders", id));
}

// ========== WISHLIST ==========
export async function fbGetWishlist(uid) {
  try {
    const snap = await getDoc(doc(db, "wishlists", uid));
    return snap.exists() ? (snap.data().items || []) : [];
  } catch (e) {
    console.error('fbGetWishlist error:', e);
    return [];
  }
}

export async function fbSaveWishlist(uid, items) {
  await setDoc(doc(db, "wishlists", uid), { items });
}

// ========== SEED PRODUCTS ==========
const DEFAULT_PRODUCTS = [
  { name: "Baju Bayi Lengan Panjang Katun Premium", price: 75000, oldPrice: 95000, category: "baju", emoji: "👕", image: "", rating: 4.8, stock: 50, desc: "Bahan katun 100% lembut, aman untuk kulit sensitif bayi. Tersedia ukuran 0-24 bulan." },
  { name: "Celana Joger Bayi Lucu Motif Hewan", price: 55000, oldPrice: 70000, category: "celana", emoji: "👖", image: "", rating: 4.7, stock: 30, desc: "Celana joger elastis dengan motif hewan menggemaskan." },
  { name: "Topi Bayi Rajut Import Premium", price: 35000, oldPrice: 45000, category: "aksesoris", emoji: "🧢", image: "", rating: 4.9, stock: 40, desc: "Topi rajut lembut, hangat, dan stylish." },
  { name: "Sabun Mandi Bayi Organik 500ml", price: 65000, oldPrice: 85000, category: "perawatan", emoji: "🧴", image: "", rating: 4.8, stock: 25, desc: "Sabun organik formula lembut, bebas SLS dan paraben." },
  { name: "Mainan Edukasi Rattle Set 5in1", price: 120000, oldPrice: 150000, category: "mainan", emoji: "🧸", image: "", rating: 4.9, stock: 15, desc: "Set mainan rattle edukatif untuk stimulasi sensorik." },
  { name: "Sepatu Bayi Soft Sole Anti Slip", price: 85000, oldPrice: 110000, category: "sepatu", emoji: "👟", image: "", rating: 4.7, stock: 20, desc: "Sepatu soft sole anti slip untuk belajar berjalan." },
  { name: "Bodysuit Bayi Motif Bunga Premium", price: 68000, oldPrice: 88000, category: "baju", emoji: "👚", image: "", rating: 4.8, stock: 35, desc: "Bodysuit kancing snap, bahan katun bambu super lembut." },
  { name: "Selimut Bayi Double Fleece Ultra Soft", price: 95000, oldPrice: 125000, category: "aksesoris", emoji: "🛏️", image: "", rating: 4.9, stock: 18, desc: "Selimut double fleece hangat dan lembut." },
  { name: "Celana Pop Bayi Set 3pcs Warna Pastel", price: 89000, oldPrice: 115000, category: "celana", emoji: "🩳", image: "", rating: 4.6, stock: 22, desc: "Paket 3 celana pop warna pastel lucu." },
  { name: "Minyak Telon Plus Anti Kembung 100ml", price: 45000, oldPrice: 55000, category: "perawatan", emoji: "💧", image: "", rating: 4.9, stock: 60, desc: "Minyak telon aroma lavender, hangat dan membantu meredakan kembung." },
  { name: "Boneka Baby Rattle Genggam Lucu", price: 55000, oldPrice: 75000, category: "mainan", emoji: "🐻", image: "", rating: 4.7, stock: 28, desc: "Boneka rattle genggam suara lembut." },
  { name: "Sandal Bayi Karakter Lucu Import", price: 65000, oldPrice: 85000, category: "sepatu", emoji: "🩴", image: "", rating: 4.6, stock: 32, desc: "Sandal karakter lucu, bahan karet lembut tidak licin." },
];

export async function fbSeedDefaultProducts() {
  const existing = await fbGetProducts();
  if (existing.length > 0) return { seeded: false, count: existing.length };
  const batch = writeBatch(db);
  DEFAULT_PRODUCTS.forEach(p => {
    const ref = doc(collection(db, "products"));
    batch.set(ref, { ...p, createdAt: serverTimestamp() });
  });
  await batch.commit();
  return { seeded: true, count: DEFAULT_PRODUCTS.length };
}

export { db, auth };
