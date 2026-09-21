// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, serverTimestamp, writeBatch, where, setDoc, runTransaction
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

// ========== SHARED HELPERS (dipakai index.html & admin.html) ==========
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape teks sebelum disisipkan ke innerHTML / atribut HTML. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);

/** Format angka ke Rupiah. */
export const rp = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

/** Format Firestore Timestamp ke teks tanggal Indonesia. */
export function fmtDate(ts, options) {
  const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
  if (!d) return '-';
  return d.toLocaleDateString('id-ID', options || {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export const ORDER_STATUS = Object.freeze({
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Sudah Dibayar',
  SHIPPED: 'Dikirim',
  DONE: 'Selesai',
  CANCELLED: 'Dibatalkan'
});
export const ORDER_STATUSES = Object.values(ORDER_STATUS);

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const byNewest = (field) => (a, b) => (b[field]?.seconds || 0) - (a[field]?.seconds || 0);
const failWith = (code, message) => Object.assign(new Error(message), { code });

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

// ========== ADMIN ==========
// Admin = akun Firebase Auth yang punya dokumen admins/{uid} (dibuat manual lewat Firebase Console).
export async function fbIsAdmin(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch (e) {
    console.warn('fbIsAdmin error:', e);
    return false;
  }
}

export async function fbAdminLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!(await fbIsAdmin(cred.user.uid))) {
    const uid = cred.user.uid;
    await signOut(auth);
    throw failWith('admin/not-admin', `Akun ini belum terdaftar sebagai admin (UID: ${uid})`);
  }
  return cred.user;
}

// ========== USERS ==========
export async function fbGetUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function fbUpdateUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
  // Sinkronkan nama tampilan di Firebase Auth agar konsisten di semua tempat.
  if (data.displayName && auth.currentUser?.uid === uid) {
    await updateProfile(auth.currentUser, { displayName: data.displayName });
  }
}

// ========== PRODUCTS ==========
export async function fbGetProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest('createdAt'));
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
  const snap = await getDocs(collection(db, "categories"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
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

// ID dokumen = slug, jadi seed dua kali tidak pernah membuat duplikat.
export async function fbSeedCategories() {
  const existing = await fbGetCategories();
  if (existing.length > 0) return { seeded: false, count: existing.length };
  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach(cat => {
    batch.set(doc(db, "categories", cat.slug), { ...cat, createdAt: serverTimestamp() });
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

/** Ubah kategori + pindahkan semua produknya ke slug baru dalam satu batch (atomik). */
export async function fbUpdateCategoryAndProducts(id, data, oldSlug) {
  const batch = writeBatch(db);
  batch.update(doc(db, "categories", id), { ...data, updatedAt: serverTimestamp() });
  if (oldSlug && data.slug && data.slug !== oldSlug) {
    const snap = await getDocs(query(collection(db, "products"), where("category", "==", oldSlug)));
    if (snap.size > 480) throw new Error('Terlalu banyak produk pada kategori ini untuk diganti sekaligus');
    snap.docs.forEach(d => batch.update(d.ref, { category: data.slug }));
  }
  await batch.commit();
}

export async function fbDeleteCategory(id) {
  return await deleteDoc(doc(db, "categories", id));
}

// ========== ORDERS ==========
export async function fbGetOrders() {
  const snap = await getDocs(collection(db, "orders"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest('date'));
}

export async function fbGetUserOrders(uid) {
  const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", uid)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest('date'));
}

/**
 * Buat pesanan secara atomik: cek stok, kurangi stok, dan simpan pesanan dalam satu transaksi.
 * Harga & nama produk diambil dari database (bukan dari klien).
 * input: { orderId, customer, phone, address, city, note, items: [{id, qty}], expectedTotal? }
 */
export async function fbPlaceOrder(input) {
  const merged = new Map();
  (input.items || []).forEach(i => {
    const qty = Math.floor(Number(i.qty));
    if (i.id && qty > 0) merged.set(i.id, (merged.get(i.id) || 0) + qty);
  });
  const items = [...merged].map(([id, qty]) => ({ id, qty }));
  if (!items.length) throw failWith('order/empty', 'Keranjang kosong');

  const customer = clean(input.customer, 100);
  const phone = clean(input.phone, 25);
  const address = clean(input.address, 400);
  const city = clean(input.city, 80);
  if (!customer || !phone || !address || !city) {
    throw failWith('order/invalid', 'Data pengiriman belum lengkap');
  }

  const user = auth.currentUser;
  const orderRef = doc(collection(db, "orders"));

  return runTransaction(db, async (tx) => {
    // Semua pembacaan harus dilakukan sebelum penulisan.
    const snaps = await Promise.all(items.map(i => tx.get(doc(db, "products", i.id))));
    let total = 0;
    const lines = snaps.map((snap, idx) => {
      if (!snap.exists()) throw failWith('order/not-found', 'Ada produk yang sudah tidak tersedia');
      const p = snap.data();
      const qty = items[idx].qty;
      const stock = Number(p.stock) || 0;
      if (stock < qty) throw failWith('order/out-of-stock', `Stok "${p.name}" tidak cukup (sisa ${stock})`);
      const price = Number(p.price) || 0;
      total += price * qty;
      return { id: snap.id, name: p.name || 'Produk', price, qty, emoji: p.emoji || '📦', newStock: stock - qty };
    });

    if (typeof input.expectedTotal === 'number' && input.expectedTotal !== total) {
      throw failWith('order/price-changed', 'Harga produk berubah. Silakan periksa keranjang kembali');
    }

    lines.forEach(l => tx.update(doc(db, "products", l.id), { stock: l.newStock }));

    // Gambar produk sengaja tidak disimpan di pesanan (base64 bisa membuat dokumen melebihi batas 1 MB).
    const orderItems = lines.map(({ newStock, ...rest }) => rest);
    tx.set(orderRef, {
      orderId: clean(input.orderId, 20),
      userId: user ? user.uid : 'guest',
      userEmail: user ? user.email : 'guest',
      customer, phone, address, city,
      note: clean(input.note, 300),
      items: orderItems,
      total,
      status: ORDER_STATUS.PENDING,
      payment: 'QRIS',
      date: serverTimestamp()
    });

    return { id: orderRef.id, orderId: clean(input.orderId, 20), total, items: orderItems };
  });
}

/** Ubah status pesanan. Membatalkan pesanan otomatis mengembalikan stok. Status "Dibatalkan" bersifat final. */
export async function fbSetOrderStatus(id, newStatus) {
  if (!ORDER_STATUSES.includes(newStatus)) throw new Error('Status tidak valid');
  const orderRef = doc(db, "orders", id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error('Pesanan tidak ditemukan');
    const order = snap.data();
    if (order.status === newStatus) return;
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new Error('Pesanan yang sudah dibatalkan tidak bisa dibuka kembali');
    }

    if (newStatus === ORDER_STATUS.CANCELLED) {
      const items = order.items || [];
      const productSnaps = await Promise.all(items.map(i => tx.get(doc(db, "products", i.id))));
      productSnaps.forEach((ps, idx) => {
        if (ps.exists()) {
          tx.update(ps.ref, { stock: (Number(ps.data().stock) || 0) + (Number(items[idx].qty) || 0) });
        }
      });
    }
    tx.update(orderRef, { status: newStatus, statusUpdatedAt: serverTimestamp() });
  });
}

export async function fbDeleteOrder(id) {
  return await deleteDoc(doc(db, "orders", id));
}

// ========== WISHLIST ==========
export async function fbGetWishlist(uid) {
  const snap = await getDoc(doc(db, "wishlists", uid));
  return snap.exists() ? (snap.data().items || []) : [];
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

// ID dokumen tetap (seed-1, seed-2, ...) agar seed ganda tidak membuat produk duplikat.
export async function fbSeedDefaultProducts() {
  const existing = await fbGetProducts();
  if (existing.length > 0) return { seeded: false, count: existing.length };
  const batch = writeBatch(db);
  DEFAULT_PRODUCTS.forEach((p, i) => {
    batch.set(doc(db, "products", `seed-${i + 1}`), { ...p, createdAt: serverTimestamp() });
  });
  await batch.commit();
  return { seeded: true, count: DEFAULT_PRODUCTS.length };
}

export { db, auth };

