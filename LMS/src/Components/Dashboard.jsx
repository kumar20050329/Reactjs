import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import {
  FaSearch, FaHistory, FaTrash, FaPlus, FaCheckCircle, FaTimes,
  FaExclamationTriangle, FaUserShield, FaFileCsv, FaEye, FaArrowLeft,
  FaUserCircle, FaEdit, FaSave, FaCamera, FaMoon, FaSun, FaBookmark,
  FaFilePdf, FaStar, FaIdCard, FaDownload
} from 'react-icons/fa';
import { HiOutlineDocumentReport } from "react-icons/hi";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import {
  getBooks, getUsers, getTransactions, addBookToDB, deleteBookFromDB,
  borrowBookDB, returnBookDB, deleteUserFromDB, addUserToDB, updateUserPasswordDB
} from '../db';

// --- LIBRARIES ---
import Swal from 'sweetalert2';
import Cropper from 'react-easy-crop'; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// --- TANSTACK TABLE ---
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

// --- RJSF ---
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';

// ==========================================
// --- UTILITIES ---
// ==========================================
const createImage = (url) => new Promise((resolve, reject) => { const image = new Image(); image.addEventListener('load', () => resolve(image)); image.addEventListener('error', (error) => reject(error)); image.setAttribute('crossOrigin', 'anonymous'); image.src = url; });
async function getCroppedImg(imageSrc, pixelCrop) { const image = await createImage(imageSrc); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = pixelCrop.width; canvas.height = pixelCrop.height; ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height); return new Promise((resolve) => { canvas.toBlob((blob) => { const reader = new FileReader(); reader.readAsDataURL(blob); reader.onloadend = () => resolve(reader.result); }, 'image/jpeg'); }); }
const renderStars = (rating) => { const stars = []; for (let i = 1; i <= 5; i++) { stars.push(<FaStar key={i} color={i <= rating ? "#ffc107" : "#e4e5e9"} size={14} />); } return <div style={{display:'flex', gap:'2px'}}>{stars}</div>; };

// ==========================================
// --- SCHEMAS ---
// ==========================================
const bookSchema = { type: "object", required: ["title", "author", "category"], properties: { title: { type: "string", title: "Book Title", minLength: 3 }, author: { type: "string", title: "Author Name" }, category: { type: "string", title: "Category", enum: ["Fiction", "Science", "History", "Technology", "General"], default: "General" } } };
const librarianSchema = { type: "object", required: ["username", "password"], properties: { username: { type: "string", title: "Username", minLength: 3 }, password: { type: "string", title: "Password", minLength: 4 } } };
const passwordSchema = { type: "object", required: ["profilePassword"], properties: { profilePassword: { type: "string", title: "New Password", minLength: 4 } } };
const userProfileSchema = { type: "object", required: ["email", "phone"], properties: { username: { type: "string", title: "Username", readOnly: true }, role: { type: "string", title: "Role", readOnly: true }, email: { type: "string", title: "Email Address", format: "email" }, phone: { type: "string", title: "Phone Number" }, address: { type: "string", title: "Address" } } };

const commonUiSchema = { "ui:submitButtonOptions": { norender: true } };
const bookUiSchema = { ...commonUiSchema, title: { "ui:placeholder": "Enter book title", "ui:classNames": "custom-rjsf-field" }, author: { "ui:placeholder": "Enter author name", "ui:classNames": "custom-rjsf-field" }, category: { "ui:classNames": "custom-rjsf-field" } };
const librarianUiSchema = { ...commonUiSchema, username: { "ui:placeholder": "Enter username", "ui:classNames": "input-field-light" }, password: { "ui:widget": "password", "ui:placeholder": "Enter password", "ui:classNames": "input-field-light" } };
const passwordUiSchema = { ...commonUiSchema, profilePassword: { "ui:widget": "password", "ui:placeholder": "Enter new password", "ui:classNames": "input-field-light" } };
const userProfileUiSchema = { ...commonUiSchema, username: { "ui:classNames": "input-field-light", "ui:disabled": true }, role: { "ui:classNames": "input-field-light", "ui:disabled": true }, email: { "ui:placeholder": "example@library.com", "ui:classNames": "input-field-light" }, phone: { "ui:placeholder": "+91 9876543210", "ui:classNames": "input-field-light" }, address: { "ui:widget": "textarea", "ui:placeholder": "Enter your address", "ui:classNames": "input-field-light" } };

// --- DATATABLE ---
const DataTable = ({ data, columns, rowsPerPage = 5 }) => {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), autoResetPageIndex: false, initialState: { pagination: { pageSize: rowsPerPage } } });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const pages = Array.from({ length: pageCount }, (_, i) => i);
  useEffect(() => { if (pageCount > 0 && pageIndex >= pageCount) table.setPageIndex(pageCount - 1); }, [pageCount, pageIndex, table]);

  return (
    <>
      <table className="custom-table">
        <thead>{table.getHeaderGroups().map(hg => (<tr key={hg.id}>{hg.headers.map(h => (<th key={h.id} style={{textAlign: h.column.columnDef.meta?.align || 'left'}}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr>))}</thead>
        <tbody>{table.getRowModel().rows.length > 0 ? (table.getRowModel().rows.map(row => (<tr key={row.id}>{row.getVisibleCells().map(cell => (<td key={cell.id} style={{textAlign: cell.column.columnDef.meta?.align || 'left'}} className={cell.column.columnDef.meta?.className || ''}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>))}</tr>))) : (<tr><td colSpan={columns.length} style={{textAlign: 'center', padding: '20px'}}>No records found.</td></tr>)}</tbody>
      </table>
      {table.getPageCount() > 1 && (<div className="pagination-wrapper"><div className="pagination-container"><button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="page-nav-btn"><IoIosArrowBack /></button>{pages.map(p => (<button key={p} onClick={() => table.setPageIndex(p)} className={`page-number-btn ${pageIndex === p ? 'active' : ''}`}>{p + 1}</button>))}<button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="page-nav-btn"><IoIosArrowForward /></button></div></div>)}
    </>
  );
};

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Filters & Theme
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Profile Image & Crop
  const [profileImage, setProfileImage] = useState(null);
  const [tempImage, setTempImage] = useState(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  // Modals
  const [showCropModal, setShowCropModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBorrowConfirm, setShowBorrowConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyBookTitle, setHistoryBookTitle] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showIDModal, setShowIDModal] = useState(false);
  
  const idCardRef = useRef(null);

  const [selectedBook, setSelectedBook] = useState(null);
  const isStudent = user?.role === 'Student';
  const isAdmin = user?.role === 'Admin';
  const isLibrarian = user?.role === 'Librarian';

  const refreshData = async () => {
    const allBooks = await getBooks();
    const ratedBooks = allBooks.map(b => ({ ...b, rating: b.rating || Math.floor(Math.random() * 2) + 3 })); 
    const allUsers = await getUsers();
    const allTrans = await getTransactions();
    
    setBooks(ratedBooks.reverse());
    // FIX: Ensure students are loaded correctly into state
    setStudents(allUsers.filter(u => u.role === 'Student'));
    setAdmins(allUsers.filter(u => u.role === 'Admin' || u.role === 'Librarian'));
    setTransactions(allTrans);
  };

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    refreshData();
    const savedImg = localStorage.getItem(`profile_img_${user.username}`);
    if (savedImg) setProfileImage(savedImg);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
  }, [user, navigate]);

  const handleLogout = () => { setUser(null); navigate('/'); };
  const toggleTheme = () => { const newMode = !isDarkMode; setIsDarkMode(newMode); localStorage.setItem('theme', newMode ? 'dark' : 'light'); };

  // --- PDF EXPORT FUNCTION ---
  const exportToPDF = (data, title, columns) => {
    if (!data || data.length === 0) { Swal.fire({ icon: 'info', title: 'No Data', text: 'No data to export.', confirmButtonColor: '#6c63ff' }); return; }
    try {
      const doc = new jsPDF();
      doc.text(title, 14, 15);
      const tableHeaders = columns.map(col => col.replace(/([A-Z])/g, ' $1').toUpperCase());
      const tableRows = data.map(item => columns.map(col => item[col] !== undefined && item[col] !== null ? item[col] : '-'));
      doc.autoTable({ head: [tableHeaders], body: tableRows, startY: 20 });
      doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
    } catch (error) { console.error("PDF Error:", error); Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to generate PDF.' }); }
  };

  const exportToCSV = () => { if (transactions.length === 0) { Swal.fire({ icon: 'info', title: 'No Data', text: 'No transactions.' }); return; } const headers = ["Book Title", "User", "Borrow Date", "Return Date", "Status"]; const rows = transactions.map(t => [t.bookTitle, t.username, t.borrowDate, t.returnDate, t.status]); let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n"); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "transactions.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const calculateFine = (borrowDate) => { if (!borrowDate) return 0; const diffDays = Math.ceil(Math.abs(new Date() - new Date(borrowDate)) / (1000 * 60 * 60 * 24)); return diffDays > 5 ? (diffDays - 5) * 10 : 0; };
  const downloadIDCard = () => { if (idCardRef.current) { html2canvas(idCardRef.current, { backgroundColor: null }).then(canvas => { const link = document.createElement('a'); link.download = `${user.username}_ID_Card.png`; link.href = canvas.toDataURL(); link.click(); }); } };

  // Handlers
  const handleViewProfile = (student) => { 
    setSelectedStudent(student); 
    setActiveTab('student_profile'); 
  };

  const confirmReturn = async () => { if (selectedBook) { const activeTxn = transactions.find(t => t.bookTitle === selectedBook.title && t.status === 'Borrowed'); let fineAmount = 0; if (activeTxn) fineAmount = calculateFine(activeTxn.borrowDate); await returnBookDB(selectedBook.id, user.username); const updatedBooks = books.map(b => b.id === selectedBook.id ? { ...b, reservedBy: null } : b); setBooks(updatedBooks); setShowReturnConfirm(false); refreshData(); let result; if (fineAmount > 0) { result = await Swal.fire({ icon: 'warning', title: `Returned with Fine!`, html: `Fine Amount: <b style="color:red">₹${fineAmount}</b><br/>Please pay at the desk.`, confirmButtonColor: '#d33', confirmButtonText: 'Pay & Continue' }); } else { result = await Swal.fire({ icon: 'success', title: 'Returned!', text: `Book returned successfully.`, confirmButtonColor: '#6c63ff' }); } if (result.isConfirmed) { const { value: rating } = await Swal.fire({ title: 'Rate this Book', input: 'select', inputOptions: { '5': '⭐⭐⭐⭐⭐ Excellent', '4': '⭐⭐⭐⭐ Good', '3': '⭐⭐⭐ Average', '2': '⭐⭐ Poor', '1': '⭐ Terrible' }, inputPlaceholder: 'Select a rating', showCancelButton: true, confirmButtonText: 'Submit Rating', confirmButtonColor: '#ffc107' }); if (rating) { const newBooks = books.map(b => b.id === selectedBook.id ? { ...b, rating: parseInt(rating) } : b); setBooks(newBooks); Swal.fire({ icon: 'success', title: 'Thanks!', text: `You rated it ${rating} stars.`, confirmButtonColor: '#6c63ff' }); } } } };
  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => { setTempImage(reader.result); setShowCropModal(true); setZoom(1); setCrop({ x: 0, y: 0 }); }; } };
  const onCropComplete = useCallback((_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels), []);
  const saveCroppedImage = async () => { try { const croppedImg = await getCroppedImg(tempImage, croppedAreaPixels); setProfileImage(croppedImg); localStorage.setItem(`profile_img_${user.username}`, croppedImg); setShowCropModal(false); Swal.fire({ icon: 'success', title: 'Updated!', text: 'Photo saved.', confirmButtonColor: '#6c63ff', timer: 1500 }); } catch (e) { console.error(e); } };
  const handleReserveClick = (book) => { Swal.fire({ title: 'Reserve?', text: `Reserve "${book.title}"?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#ff9800', confirmButtonText: 'Yes' }).then((res) => { if (res.isConfirmed) { const up = books.map(b => b.id === book.id ? { ...b, reservedBy: user.username } : b); setBooks(up); Swal.fire({ icon: 'success', title: 'Reserved!', html: `Book reserved.<br/><small style="color:#666">Email sent to ${user.username}</small>`, confirmButtonColor: '#ff9800' }); } }); };
  const onSaveBook = async ({ formData }) => { if (formData.title) { await addBookToDB({ ...formData, status: 'Available' }); setShowAddModal(false); refreshData(); Swal.fire({ icon: 'success', title: 'Added!', confirmButtonColor: '#6c63ff' }); } };
  const confirmDelete = async () => { if (selectedBook) { await deleteBookFromDB(selectedBook.id); setShowDeleteModal(false); refreshData(); Swal.fire({ icon: 'success', title: 'Deleted!', showConfirmButton: false, timer: 1500 }); } };
  const handleBorrowClick = (book) => { setSelectedBook(book); setShowBorrowConfirm(true); };
  const confirmBorrow = async () => { if (selectedBook) { await borrowBookDB(selectedBook.id, user.username); setShowBorrowConfirm(false); refreshData(); Swal.fire({ icon: 'success', title: 'Borrowed!', html: `Book Borrowed.<br/><small style="color:#666">Email sent to ${user.username}</small>`, confirmButtonColor: '#6c63ff' }); } };
  const handleReturnClick = (book) => { setSelectedBook(book); setShowReturnConfirm(true); };
  const onCreateLibrarian = async ({ formData }) => { if(formData.username) { await addUserToDB({ ...formData, role: 'Librarian' }); refreshData(); Swal.fire({ icon: 'success', title: 'Created!', html: `Account created.<br/><small style="color:#666">Details sent to ${formData.username}</small>`, confirmButtonColor: '#6c63ff' }); } };
  const handleDeleteUser = async (id) => { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { if (r.isConfirmed) { await deleteUserFromDB(id); refreshData(); Swal.fire('Deleted!', '', 'success'); } }); };
  const onPasswordUpdate = async ({ formData }) => { if (formData.profilePassword) { let tid = user.id; if (selectedStudent && activeTab === 'student_profile') tid = selectedStudent.id; await updateUserPasswordDB(tid, formData.profilePassword); Swal.fire({ icon: 'success', title: 'Updated!', html: `Password updated.<br/><small style="color:#666">Security alert sent.</small>`, confirmButtonColor: '#6c63ff' }); refreshData(); } };
  const onUpdateUserProfile = () => { Swal.fire({ icon: 'success', title: 'Saved!', confirmButtonColor: '#6c63ff' }); };
  const handleHistoryClick = (book) => { const h = transactions.filter(t => t.bookTitle === book.title).map(t => ({ ...t, duration: Math.ceil(Math.abs(new Date(t.returnDate !== '-' ? t.returnDate : new Date()) - new Date(t.borrowDate)) / (1000 * 60 * 60 * 24)) })); setHistoryData(h); setHistoryBookTitle(book.title); setShowHistoryModal(true); };

  const bookColumns = useMemo(() => [ { header: 'S.no', cell: info => info.row.index + 1 }, { header: 'Title', accessorKey: 'title', meta: { className: 'fw-bold' } }, { header: 'Author', accessorKey: 'author' }, { header: 'Category', accessorKey: 'category' }, { header: 'Rating', accessorKey: 'rating', cell: info => renderStars(info.getValue()) }, { header: 'Status', accessorKey: 'status', meta: { align: 'center' }, cell: info => <span className={`status-badge ${info.getValue().toLowerCase()}`}>{info.getValue()}</span> }, { header: 'Actions', id: 'actions', meta: { align: 'right' }, cell: ({ row }) => { const book = row.original; const activeTxn = transactions.find(t => t.bookTitle === book.title && t.status === 'Borrowed'); const isBorrowedByCurrentUser = activeTxn && activeTxn.username === user.username; return ( <> {isStudent && ( <> {book.status === 'Available' && <button className="btn-view-profile" onClick={() => handleBorrowClick(book)}>Borrow</button>} {book.status === 'Borrowed' && isBorrowedByCurrentUser && <button className="btn-view-profile" style={{backgroundColor: '#9e9e9eff'}} onClick={() => handleReturnClick(book)}>Return</button>} {book.status === 'Borrowed' && !isBorrowedByCurrentUser && ( !book.reservedBy ? (<button className="btn-reserve" onClick={() => handleReserveClick(book)}><FaBookmark /> Reserve</button>) : book.reservedBy === user.username ? (<span className="badge-reserved">Reserved by You</span>) : (<span style={{color:'#999', fontSize:'12px'}}>Reserved</span>) )} </> )} {!isStudent && ( <> <button className="action-btn history" onClick={() => handleHistoryClick(book)}><FaHistory /></button> {isAdmin && <button className="action-btn delete" onClick={() => { setSelectedBook(book); setShowDeleteModal(true); }}><FaTrash /></button>} </> )} </> ); } } ], [transactions, user, isStudent, isAdmin, books]);
  const studentColumns = useMemo(() => [ { header: 'Student Id', cell: info => info.row.index + 1 }, { header: 'Username', accessorKey: 'username' }, { header: 'Actions', id: 'actions', meta: { align: 'right' }, cell: ({ row }) => (<button className="btn-view-profile" onClick={() => handleViewProfile(row.original)}><FaEye /> View Profile</button>) } ], []);
  const overdueColumns = useMemo(() => [ { header: 'Book Title', accessorKey: 'bookTitle' }, { header: 'Borrowed By', accessorKey: 'username' }, { header: 'Borrow Date', accessorKey: 'borrowDate' }, { header: 'Days Overdue', accessorKey: 'daysOverdue', meta: { align: 'center' }, cell: info => <span style={{color:'red', fontWeight:'bold'}}>{info.getValue()}</span> }, { header: 'Fine (₹)', accessorKey: 'fineAmount', meta: { align: 'center' }, cell: info => <span style={{color:'#d32f2f', fontWeight:'bold', backgroundColor:'#ffebee', padding:'4px 8px', borderRadius:'4px'}}>₹{info.getValue()}</span> } ], []);
  const txnColumns = useMemo(() => [ { header: 'Book Title', accessorKey: 'bookTitle' }, { header: 'User', accessorKey: 'username' }, { header: 'Borrow Date', accessorKey: 'borrowDate' }, { header: 'Return Date', accessorKey: 'returnDate' }, { header: 'Status', accessorKey: 'status' } ], []);
  const adminColumns = useMemo(() => [ { header: 'Username', accessorKey: 'username' }, { header: 'Role', accessorKey: 'role' }, { header: 'Action', id: 'actions', cell: ({ row }) => (row.original.role !== 'Admin' && <button className="btn-del-red" onClick={() => handleDeleteUser(row.original.id)}>Delete</button>) } ], []);

  const renderDashboard = () => { const overdueCount = transactions.filter(t => t.status==='Borrowed' && Math.ceil(Math.abs(new Date() - new Date(t.borrowDate)) / (1000 * 60 * 60 * 24)) > 5).length; const filteredBooks = books.filter(b => { const match = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.author.toLowerCase().includes(searchTerm.toLowerCase()); const cat = categoryFilter === "All Categories" || b.category === categoryFilter; const stat = statusFilter === "All Statuses" || b.status === statusFilter; return match && cat && stat; }); const sortedBooks = [...filteredBooks].sort((a, b) => { if (sortOrder === "A-Z") return a.title.localeCompare(b.title); if (sortOrder === "Z-A") return b.title.localeCompare(a.title); return 0; }); const categoryCounts = books.reduce((acc, book) => { acc[book.category] = (acc[book.category] || 0) + 1; return acc; }, {}); const barData = Object.keys(categoryCounts).map(cat => ({ name: cat, count: categoryCounts[cat] })); const statusCounts = books.reduce((acc, book) => { acc[book.status] = (acc[book.status] || 0) + 1; return acc; }, {}); const pieData = [{ name: 'Available', value: statusCounts['Available'] || 0 }, { name: 'Borrowed', value: statusCounts['Borrowed'] || 0 }]; const COLORS = ['#00C49F', '#FF8042'];
    return ( <> {!isStudent && ( <div className="stats-row"> <div className="stat-card"><div><h3>Total Books</h3><h1>{books.length}</h1></div><HiOutlineDocumentReport className="stat-icon" /></div> <div className="stat-card"><div><h3>Available</h3><h1>{books.filter(b=>b.status==='Available').length}</h1></div><FaCheckCircle className="stat-icon" /></div> <div className="stat-card"><div><h3>Borrowed</h3><h1>{books.filter(b=>b.status==='Borrowed').length}</h1></div><FaTimes className="stat-icon" /></div> <div className="stat-card"><div><h3>Overdue</h3><h1>{overdueCount}</h1></div><FaExclamationTriangle className="stat-icon" /></div> </div> )} {!isStudent && ( <div className="charts-container" style={{display:'flex', gap:'20px', marginBottom:'30px'}}> <div className="chart-card" style={{flex: 1, padding:'20px', borderRadius:'16px', boxShadow:'0 4px 20px rgba(0,0,0,0.03)'}}><h3 style={{margin:'0 0 20px 0', fontSize:'16px', color:'#555'}}>Books by Category</h3><div style={{height: '300px'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="count" fill="#6c63ff" name="Count" /></BarChart></ResponsiveContainer></div></div> <div className="chart-card" style={{flex: 1, padding:'20px', borderRadius:'16px', boxShadow:'0 4px 20px rgba(0,0,0,0.03)'}}><h3 style={{margin:'0 0 20px 0', fontSize:'16px', color:'#555'}}>Availability Status</h3><div style={{height: '300px'}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value" label>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div> </div> )} <div className="table-card"> <div className="table-header-row"><h2>Book Collection</h2>{!isStudent && <button className="btn-add-new" onClick={() => setShowAddModal(true)}><FaPlus /> Add New Book</button>}</div> <hr className="divider" /> <div className="filters-container"> <div className="search-box"><FaSearch className="search-icon" style={{color:'#888', marginRight:'10px'}} /><input type="text" placeholder="Search by title or author" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div> <div className="dropdowns" style={{display:'flex', gap:'15px'}}> <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}><option value="Newest">Newest First</option><option value="A-Z">Title (A-Z)</option><option value="Z-A">Title (Z-A)</option></select> <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option>All Categories</option><option>Fiction</option><option>Science</option><option>History</option><option>Technology</option><option>General</option></select> <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All Statuses</option><option>Available</option><option>Borrowed</option></select> </div> </div> <DataTable data={sortedBooks} columns={bookColumns} rowsPerPage={5} /> </div> </> ); };
  const renderOverdue = () => { const overdueItems = transactions.filter(t => t.status==='Borrowed' && Math.ceil(Math.abs(new Date() - new Date(t.borrowDate)) / (1000 * 60 * 60 * 24)) > 5).map(t => ({...t, daysOverdue: Math.ceil(Math.abs(new Date() - new Date(t.borrowDate)) / (1000 * 60 * 60 * 24)), fineAmount: (Math.ceil(Math.abs(new Date() - new Date(t.borrowDate)) / (1000 * 60 * 60 * 24)) - 5) * 10})); const handlePdf = () => exportToPDF(overdueItems, 'Overdue Report', ['bookTitle', 'username', 'borrowDate', 'daysOverdue']); return (<div className="table-card"> <div className="table-header-row"><div style={{display:'flex', alignItems:'center', gap:'10px'}}><FaExclamationTriangle size={24} /> <h2>Overdue Books Reports</h2></div> <button className="btn-green" style={{background:'#e74c3c'}} onClick={handlePdf}><FaFilePdf /> Export PDF</button> </div><hr className="divider" /><DataTable data={overdueItems} columns={overdueColumns} rowsPerPage={10} /></div>); };
  const renderTransactions = () => { const handlePdf = () => exportToPDF(transactions, 'Transaction History', ['bookTitle', 'username', 'borrowDate', 'returnDate', 'status']); return (<div className="table-card"> <div className="table-header-row"><div style={{display:'flex', alignItems:'center', gap:'10px'}}><h2>All Transactions</h2></div> <div style={{display:'flex', gap:'10px'}}> <button className="btn-green" onClick={exportToCSV}><FaFileCsv /> CSV</button> <button className="btn-green" style={{background:'#e74c3c'}} onClick={handlePdf}><FaFilePdf /> PDF</button> </div> </div><hr className="divider" /><DataTable data={transactions} columns={txnColumns} rowsPerPage={5} /></div>); };
  const renderAdminManagement = () => (<div className="admin-container"><div className="admin-left-panel"><div className="panel-header"><h2>Admins & Librarians List</h2><p className="subtitle">Manage system access.</p></div><hr className="divider" /><DataTable data={admins} columns={adminColumns} rowsPerPage={5} /></div><div className="admin-right-panel"><div className="form-card-modern"><div className="form-header"><div className="icon-box-small"><FaUserShield /></div><h3>Add New Librarian</h3></div><p className="form-subtext">Create account.</p><Form schema={librarianSchema} uiSchema={librarianUiSchema} validator={validator} onSubmit={onCreateLibrarian} className="rjsf-clean-form"><div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '0' }}><button type="submit" className="btn-blue-block">Create Account</button></div></Form></div></div></div>);

  // --- UPDATED RENDER STUDENTS (FIX FOR EMPTY PAGE) ---
  const renderStudents = () => (
    <div className="table-card">
      <div className="table-header-row">
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <FaUserShield size={24} /> <h2>Student Management</h2>
        </div>
      </div>
      <hr className="divider" />
      <DataTable data={students} columns={studentColumns} rowsPerPage={5} />
    </div>
  );

  // --- UPDATED RENDER STUDENT PROFILE (FIXED EMPTY PAGE ISSUE) ---
  const renderStudentProfile = () => {
    // Safety Check: If no student selected, return nothing or loading
    if (!selectedStudent) return null;

    const studentHistory = transactions.filter(t => t.username === selectedStudent.username);
    
    return (
      <div className="profile-container">
        <div className="profile-header">
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div className="profile-icon-circle"><FaUserShield /></div>
            <h1>{selectedStudent.username} Profile</h1>
          </div>
          <button className="btn-back" onClick={() => setActiveTab('students')}><FaArrowLeft /> Back to Students List</button>
        </div>
        <hr className="divider" />
        
        <div className="profile-body">
          <div className="profile-card">
            <h3>Currently Borrowed Books</h3><hr className="divider" />
            {studentHistory.filter(t=>t.status==='Borrowed').length > 0 ? 
              studentHistory.filter(t=>t.status==='Borrowed').map((b, i) => (
                <div key={i} className="borrow-row"><span>{b.bookTitle}</span><span className="badge-gray">Borrow Date: {b.borrowDate}</span></div>
              )) : <div className="no-data">No Books Currently Borrowed.</div>
            }
          </div>
          <div className="profile-card">
            <h3>Update Profile</h3><hr className="divider" />
            <Form schema={passwordSchema} uiSchema={passwordUiSchema} validator={validator} onSubmit={onPasswordUpdate} className="rjsf-clean-form">
              <button type="submit" className="btn-blue-block" style={{marginTop: '15px'}}>Update Password</button>
            </Form>
          </div>
        </div>
        
        <div className="profile-card mt-20">
          <h3>Borrow History</h3><hr className="divider" />
          <table className="custom-table">
            <thead><tr><th>Title</th><th>Borrow Date</th><th>Return Date</th><th>Status</th></tr></thead>
            <tbody>
              {studentHistory.length > 0 ? studentHistory.map((h, i) => (
                <tr key={i}><td>{h.bookTitle}</td><td>{h.borrowDate}</td><td>{h.returnDate}</td><td>{h.status}</td></tr>
              )) : <tr><td colSpan="4" style={{textAlign:'center'}}>No History Found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMyProfile = () => {
    const formData = { username: user.username, role: user.role, email: `${user.username.toLowerCase()}@library.com`, phone: "+91 9876543210", address: "123, Library Street, Knowledge City" };
    return (
      <div className="profile-container">
        {/* HEADER WITH FLEX BETWEEN */}
        <div className="profile-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          {/* LEFT: IMAGE + TEXT */}
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <div style={{position: 'relative', width: '80px', height: '80px'}}>
              <input type="file" id="profile-img-input" accept="image/*" onChange={handleFileSelect} style={{display: 'none'}} />
              <label htmlFor="profile-img-input" style={{cursor: 'pointer', display:'block', width:'100%', height:'100%'}}>
                <div className="profile-icon-large" style={{width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor: '#f0f0f0', border: '2px solid #6c63ff'}}>
                  {profileImage ? (<img src={profileImage} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover'}} />) : (<FaUserCircle size={80} color="#ccc" />)}
                </div>
                <div style={{position: 'absolute', bottom: '0', right: '0', backgroundColor: '#6c63ff', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}}><FaCamera size={14} /></div>
              </label>
            </div>
            <div>
              <h1 style={{margin:0}}>My Profile</h1>
              <p style={{margin:0, fontSize:'13px', color:'#777'}}>Manage your personal details</p>
            </div>
          </div>
          {/* RIGHT: GENERATE BUTTON */}
          <button className="btn-green" style={{background:'#2196f3'}} onClick={() => setShowIDModal(true)}><FaIdCard /> Generate Digital ID</button>
        </div>
        <hr className="divider" />
        <div className="profile-body">
          <div className="profile-card" style={{flex: 1.5}}><h3>Personal Details</h3><hr className="divider" /><Form schema={userProfileSchema} uiSchema={userProfileUiSchema} formData={formData} validator={validator} onSubmit={onUpdateUserProfile} className="rjsf-clean-form"><div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}><button type="submit" className="btn-blue-block" style={{width: 'auto', padding: '10px 30px'}}><FaSave /> Save Changes</button></div></Form></div>
          <div className="profile-card" style={{flex: 1}}><h3>Security</h3><hr className="divider" /><p style={{fontSize:'13px', color:'#666', marginBottom:'15px'}}>Change your password to keep your account secure.</p><Form schema={passwordSchema} uiSchema={passwordUiSchema} validator={validator} onSubmit={onPasswordUpdate} className="rjsf-clean-form"><button type="submit" className="btn-blue-block" style={{marginTop: '15px'}}>Update Password</button></Form></div>
        </div>
      </div>
    );
  };

  return (
    <div className={`main-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <style>{`
        /* ID CARD & CHART STYLES */
        .id-card-wrapper { width: 350px; height: 220px; background: linear-gradient(135deg, #6c63ff 0%, #4a56e2 100%); border-radius: 15px; display: flex; color: white; padding: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); position: relative; overflow: hidden; }
        .id-left { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; border-right: 1px solid rgba(255,255,255,0.2); padding-right: 15px; }
        .id-right { flex: 1.5; padding-left: 15px; display: flex; flex-direction: column; justify-content: center; }
        .id-photo { width: 80px; height: 80px; border-radius: 50%; border: 3px solid white; object-fit: cover; margin-bottom: 10px; background: #fff; }
        .id-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
        .id-val { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
        .id-watermark { position: absolute; bottom: -20px; right: -20px; font-size: 100px; opacity: 0.1; transform: rotate(-20deg); }
        .rjsf-clean-form .field-object > legend, .rjsf-clean-form .field-object > h3 { display: none; }
        .rjsf-clean-form .form-group { margin-bottom: 15px; }
        .rjsf-clean-form label { display: block; margin-bottom: 5px; font-weight: 500; color: #333; }
        .custom-rjsf-field input, .custom-rjsf-field select, .input-field-light input, .input-field-light textarea { width: 100%; padding: 10px; border: 1px solid #e5e7eb !important; border-radius: 5px; font-size: 14px; outline: none !important; box-shadow: none !important; box-sizing: border-box; transition: all 0.2s; }
        .custom-rjsf-field input:focus, .custom-rjsf-field select:focus, .input-field-light input:focus, .input-field-light textarea:focus { border-color: #6c63ff !important; box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.15) !important; }
        .text-danger { color: red; font-size: 12px; margin-top: 5px; }
        .rjsf-clean-form .btn-default { display: none; }
        .crop-container { position: relative; width: 100%; height: 300px; background: #333; margin-bottom: 20px; border-radius: 8px; overflow: hidden; }
        .slider-container { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .zoom-range { width: 100%; cursor: pointer; }
        @media (max-width: 900px) { .charts-container { flex-direction: column; } }
      `}</style>
      
      <header className="top-header">
        <div className="header-left"><span className="brand-icon">🏛️</span><div className="brand-name"><h1>Library</h1><h2>System</h2></div></div>
        <nav className="header-nav"> 
          {!isStudent && <button className={`nav-btn ${activeTab==='dashboard'?'active':''}`} onClick={()=>setActiveTab('dashboard')}>Dashboard</button>}
          {!isStudent && (
             <>
               <button className={`nav-btn ${activeTab==='students' || activeTab==='student_profile' ?'active':''}`} onClick={()=>setActiveTab('students')}>Students</button>
               <button className={`nav-btn ${activeTab==='overdue'?'active':''}`} onClick={()=>setActiveTab('overdue')}>Overdue Report</button>
               <button className={`nav-btn ${activeTab==='transactions'?'active':''}`} onClick={()=>setActiveTab('transactions')}>All Transactions</button>
             </>
          )}      
          {isAdmin && <button className={`nav-btn ${activeTab==='admin'?'active':''}`} onClick={()=>setActiveTab('admin')}>Admin Management</button>}
        </nav>
        <div className="header-right">
          <button className="nav-btn" onClick={toggleTheme} style={{padding: '8px', fontSize: '16px'}}>{isDarkMode ? <FaSun color="orange" /> : <FaMoon color="#6c63ff" />}</button>
          <span>Welcome, {user?.username}! ({user?.role})</span>
          <button onClick={() => setActiveTab('my_profile')} className="nav-btn" style={{padding:'8px', marginLeft:'10px', display:'flex', alignItems:'center', gap:'5px'}}>{profileImage ? (<img src={profileImage} alt="Me" style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover'}} />) : (<FaUserCircle size={20} />)} Profile</button>
          <button onClick={handleLogout} className="logout-btn">Log out</button>
        </div>
      </header>

      <div className="content-area">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'students' && !isStudent && renderStudents()}
        {activeTab === 'student_profile' && !isStudent && renderStudentProfile()}
        {activeTab === 'overdue' && !isStudent && renderOverdue()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'admin' && isAdmin && renderAdminManagement()}
        {activeTab === 'my_profile' && renderMyProfile()}
      </div>

      <footer className="footer"><p>© 2025 Library Management System. Designed by Thulasikumar</p></footer>

      {/* --- MODALS (Existing) --- */}
      {showAddModal && <div className="modal-overlay"><div className="modal-content add-book-modal"><div className="modal-header"><h2>Add Book</h2></div><div className="modal-body" style={{paddingBottom: 0, marginBottom: 0}}><Form schema={bookSchema} uiSchema={bookUiSchema} validator={validator} onSubmit={onSaveBook} className="rjsf-clean-form"><div className="modal-footer" style={{padding: '20px 0 0 0', display:'flex', gap:'10px', justifyContent:'center'}}><button type="submit" className="btn-save">Save Book</button><button type="button" className="btn-cancel" onClick={()=>{ setShowAddModal(false); }}>Cancel</button></div></Form></div></div></div>}
      {showDeleteModal && <div className="modal-overlay"><div className="modal-content delete-modal-content"><p className="delete-msg">Delete {selectedBook?.title}?</p><div className="modal-footer center"><button className="btn-yes" onClick={confirmDelete}>Yes</button><button className="btn-no" onClick={()=>setShowDeleteModal(false)}>No</button></div></div></div>}
      {showBorrowConfirm && <div className="modal-overlay"><div className="modal-content delete-modal-content"><h2>Confirm Borrow</h2><p className="delete-msg">Borrow <b>{selectedBook?.title}</b>?</p><div className="modal-footer center"><button className="btn-yes" style={{backgroundColor:'#4a56e2'}} onClick={confirmBorrow}>Yes, Borrow</button><button className="btn-no" onClick={()=>setShowBorrowConfirm(false)}>Cancel</button></div></div></div>}
      {showReturnConfirm && <div className="modal-overlay"><div className="modal-content delete-modal-content"><h2>Confirm Return</h2><p className="delete-msg">Return <b>{selectedBook?.title}</b>?</p><div className="modal-footer center"><button className="btn-yes" style={{backgroundColor:'#4a56e2'}} onClick={confirmReturn}>Yes, Return</button><button className="btn-no" onClick={()=>setShowReturnConfirm(false)}>Cancel</button></div></div></div>}
      {showHistoryModal && <div className="modal-overlay"><div className="modal-content history-modal"><h3>History for "{historyBookTitle}"</h3>{historyData.length > 0 ? (<table className="custom-table" style={{marginTop:'20px'}}><thead><tr><th>User</th><th>Borrow Date</th><th>Return Date</th><th style={{textAlign:'center'}}>Duration (Days)</th></tr></thead><tbody>{historyData.map((record, index) => (<tr key={index}><td>{record.username}</td><td>{record.borrowDate}</td><td>{record.returnDate}</td><td style={{textAlign:'center', fontWeight:'bold'}}>{record.duration}</td></tr>))}</tbody></table>) : (<div className="no-history-msg" style={{margin:'40px 0', textAlign:'center', color:'#666'}}><p>No borrow history found.</p></div>)}<div className="modal-footer center" style={{marginTop:'20px'}}><button className="btn-close-gray" onClick={() => setShowHistoryModal(false)}>Close</button></div></div></div>}
      {showWelcomeModal && <div className="modal-overlay"><div className="modal-content" style={{textAlign: 'center', width: '350px'}}><div style={{margin: '10px 0 20px', color: '#6c63ff', fontSize: '50px'}}><FaUserShield /></div><h2 style={{margin: '0 0 10px'}}>Welcome Back!</h2><h3 style={{margin: '0 0 20px', color: '#333'}}>{user.username}</h3><p style={{color: '#666', marginBottom: '30px'}}>Logged in as <b>{user.role}</b>.</p><button className="btn-blue-block" style={{margin: '0 auto', width: '100%', padding: '12px'}} onClick={() => setShowWelcomeModal(false)}>Continue to Dashboard</button></div></div>}
      {showCropModal && <div className="modal-overlay"><div className="modal-content" style={{width: '500px'}}><div className="modal-header"><h2>Adjust Profile Picture</h2></div><div className="modal-body"><div className="crop-container"><Cropper image={tempImage} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} objectFit="cover" /></div><div className="slider-container"><span style={{fontSize:'12px', fontWeight:'bold'}}>Zoom:</span><input type="range" value={zoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setZoom(Number(e.target.value))} className="zoom-range" /></div></div><div className="modal-footer"><button className="btn-save" onClick={saveCroppedImage}>Set Profile Picture</button><button className="btn-cancel" onClick={() => setShowCropModal(false)}>Cancel</button></div></div></div>}
      
      {/* ID CARD MODAL */}
      {showIDModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width: 'auto', maxWidth: '90%'}}>
            <div className="modal-header"><h2>Your Digital ID</h2></div>
            <div className="modal-body" style={{display:'flex', justifyContent:'center'}}>
              <div ref={idCardRef} className="id-card-wrapper">
                <div className="id-left">
                  {profileImage ? <img src={profileImage} className="id-photo" alt="Profile" /> : <div className="id-photo" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><FaUserCircle size={50} color="#ccc"/></div>}
                  <div style={{fontWeight:'bold', fontSize:'16px'}}>{user.username}</div>
                  <div style={{fontSize:'12px', opacity:0.8}}>{user.role}</div>
                </div>
                <div className="id-right">
                  <div className="id-title">ID Number</div><div className="id-val">LMS-{Math.floor(1000 + Math.random() * 9000)}</div>
                  <div className="id-title">Valid Until</div><div className="id-val">Dec 2025</div>
                  {/* WHITE BOX REMOVED */}
                </div>
                <FaUserShield className="id-watermark" />
              </div>
            </div>
            <div className="modal-footer center"><button className="btn-save" onClick={downloadIDCard}><FaDownload /> Download ID Card</button><button className="btn-close-gray" onClick={() => setShowIDModal(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;