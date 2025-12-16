import { openDB } from 'idb';

const DB_NAME = 'LibraryManagementDB';
const DB_VERSION = 3; 

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id', autoIncrement: true });
        bookStore.add({ title: "Physics Vol-1", author: "H.C. Verma", category: "Science", status: "Available" });
        bookStore.add({ title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction", status: "Available" });
        bookStore.add({ title: "Sapiens", author: "Yuval Noah Harari", category: "History", status: "Available" });
        bookStore.add({ title: "Clean Code", author: "Robert Martin", category: "Tech", status: "Available" });
      }
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        userStore.add({ username: 'admin', password: '123', role: 'Admin' });
        userStore.add({ username: 'librarian', password: '123', role: 'Librarian' });
        userStore.add({ username: 'shyam', password: '123', role: 'Student' });
        userStore.add({ username: 'hari', password: '123', role: 'Student' });
        userStore.add({ username: 'thulasi', password: '123', role: 'Student' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

// --- READ OPERATIONS ---
export const getBooks = async () => {
  const db = await initDB();
  return db.getAll('books');
};
export const getUsers = async () => {
  const db = await initDB();
  return db.getAll('users');
};
export const getTransactions = async () => {
  const db = await initDB();
  return db.getAll('transactions');
};

// --- WRITE OPERATIONS ---
export const addBookToDB = async (book) => {
  const db = await initDB();
  return db.add('books', { ...book, status: 'Available' });
};
export const deleteBookFromDB = async (id) => {
  const db = await initDB();
  return db.delete('books', id);
};
export const addUserToDB = async (user) => {
  const db = await initDB();
  return db.add('users', user);
};
export const deleteUserFromDB = async (id) => {
  const db = await initDB();
  return db.delete('users', id);
};

// --- BORROW/RETURN LOGIC ---
export const borrowBookDB = async (bookId, username) => {
  const db = await initDB();
  const tx = db.transaction(['books', 'transactions'], 'readwrite');
  const bookStore = tx.objectStore('books');
  const transStore = tx.objectStore('transactions');

  const book = await bookStore.get(bookId);
  if (!book) throw new Error('Book not found');

  book.status = 'Borrowed';
  await bookStore.put(book);

  await transStore.add({
    bookTitle: book.title,
    username: username,
    borrowDate: new Date().toLocaleString(),
    returnDate: "-",
    status: "Borrowed"
  });
  await tx.done;
};

export const returnBookDB = async (bookId, username) => {
  const db = await initDB();
  const tx = db.transaction(['books', 'transactions'], 'readwrite');
  const bookStore = tx.objectStore('books');
  const transStore = tx.objectStore('transactions');

  const book = await bookStore.get(bookId);
  if (!book) throw new Error('Book not found');
  book.status = 'Available';
  await bookStore.put(book);

  let cursor = await transStore.openCursor();
  while (cursor) {
    const t = cursor.value;
    if (t.bookTitle === book.title && t.username === username && t.status === 'Borrowed') {
      const updatedTrans = { ...t, returnDate: new Date().toLocaleString(), status: 'Returned' };
      await cursor.update(updatedTrans);
      break; 
    }
    cursor = await cursor.continue();
  }
  await tx.done;
};

// --- NEW: UPDATE PASSWORD LOGIC ---
export const updateUserPasswordDB = async (userId, newPassword) => {
  const db = await initDB();
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  
  const user = await store.get(userId);
  if (!user) throw new Error('User not found');
  
  user.password = newPassword;
  await store.put(user);
  await tx.done;
};