// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, writeBatch
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
  try {
    const snap = await getDocs(collection(db, "products"));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort by createdAt desc (client-side)
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

// ========== SEED DEFAULT PRODUCTS (untuk isi awal) ==========
const DEFAULT_PRODUCTS = [
  { name: "Baju Bayi Lengan Panjang Katun Premium", price: 75000, oldPrice: 95000, category: "baju", emoji: "👕", image: "", rating: 4.8, stock: 50, desc: "Bahan katun 100% lembut, aman untuk kulit sensitif bayi. Tersedia ukuran 0-24 bulan." },
  { name: "Celana Joger Bayi Lucu Motif Hewan", price: 55000, oldPrice: 70000, category: "celana", emoji: "👖", image: "", rating: 4.7, stock: 30, desc: "Celana joger elastis dengan motif hewan menggemaskan. Nyaman untuk aktivitas bayi." },
  { name: "Topi Bayi Rajut Import Premium", price: 35000, oldPrice: 45000, category: "aksesoris", emoji: "🧢", image: "", rating: 4.9, stock: 40, desc: "Topi rajut lembut, hangat, dan stylish. Cocok untuk newborn hingga 12 bulan." },
  { name: "Sabun Mandi Bayi Organik 500ml", price: 65000, oldPrice: 85000, category: "perawatan", emoji: "🧴", image: "", rating: 4.8, stock: 25, desc: "Sabun organik dengan formula lembut, bebas SLS dan paraben. Aman untuk kulit bayi." },
  { name: "Mainan Edukasi Rattle Set 5in1", price: 120000, oldPrice: 150000, category: "mainan", emoji: "🧸", image: "", rating: 4.9, stock: 15, desc: "Set mainan rattle edukatif untuk stimulasi sensorik dan motorik bayi." },
  { name: "Sepatu Bayi Soft Sole Anti Slip", price: 85000, oldPrice: 110000, category: "sepatu", emoji: "👟", image: "", rating: 4.7, stock: 20, desc: "Sepatu soft sole dengan anti slip, melindungi kaki bayi saat belajar berjalan." },
  { name: "Bodysuit Bayi Motif Bunga Premium", price: 68000, oldPrice: 88000, category: "baju", emoji: "👚", image: "", rating: 4.8, stock: 35, desc: "Bodysuit dengan kancing snap mudah dibuka. Bahan katun bambu super lembut." },
  { name: "Selimut Bayi Double Fleece Ultra Soft", price: 95000, oldPrice: 125000, category: "aksesoris", emoji: "🛏️", image: "", rating: 4.9, stock: 18, desc: "Selimut double fleece super lembut, hangat, dan tidak membuat bayi kepanasan." },
  { name: "Celana Pop Bayi Set 3pcs Warna Pastel", price: 89000, oldPrice: 115000, category: "celana", emoji: "🩳", image: "", rating: 4.6, stock: 22, desc: "Paket 3 celana pop dengan warna pastel lucu. Bahan adem dan nyaman." },
  { name: "Minyak Telon Plus Anti Kembung 100ml", price: 45000, oldPrice: 55000, category: "perawatan", emoji: "💧", image: "", rating: 4.9, stock: 60, desc: "Minyak telon dengan aroma lavender, hangat dan membantu meredakan kembung." },
  { name: "Boneka Baby Rattle Genggam Lucu", price: 55000, oldPrice: 75000, category: "mainan", emoji: "🐻", image: "", rating: 4.7, stock: 28, desc: "Boneka rattle genggam dengan suara lembut, membantu stimulasi pendengaran." },
  { name: "Sandal Bayi Karakter Lucu Import", price: 65000, oldPrice: 85000, category: "sepatu", emoji: "🩴", image: "", rating: 4.6, stock: 32, desc: "Sandal karakter lucu dengan bahan karet lembut, tidak licin." },
];

export async function fbSeedDefaultProducts() {
  const existing = await fbGetProducts();
  if (existing.length > 0) {
    return { seeded: false, count: existing.length };
  }
  const batch = writeBatch(db);
  DEFAULT_PRODUCTS.forEach(p => {
    const ref = doc(collection(db, "products"));
    batch.set(ref, { ...p, createdAt: serverTimestamp() });
  });
  await batch.commit();
  return { seeded: true, count: DEFAULT_PRODUCTS.length };
}

export { db };
