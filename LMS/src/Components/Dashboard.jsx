import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { FaSearch, FaHistory, FaTrash, FaPlus, FaCheckCircle, FaTimes, FaExclamationTriangle, FaUserShield, FaFileCsv, FaEye, FaArrowLeft } from 'react-icons/fa';
import { HiOutlineDocumentReport } from "react-icons/hi";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
// Added updateUserPasswordDB to import
import { getBooks, getUsers, getTransactions, addBookToDB, deleteBookFromDB, borrowBookDB, returnBookDB, deleteUserFromDB, addUserToDB, updateUserPasswordDB } from '../db';

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();

  // --- ROLES HELPER ---
  const isStudent = user?.role === 'Student';
  const isAdmin = user?.role === 'Admin';
  const isLibrarian = user?.role === 'Librarian';

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // UI State & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Borrow & Return Modals
  const [showBorrowConfirm, setShowBorrowConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  
  // History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyBookTitle, setHistoryBookTitle] = useState("");

  // Welcome Popup
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  // New states
  const [selectedBook, setSelectedBook] = useState(null);
  const [newBook, setNewBook] = useState({ title: "", author: "", category: "" });
  const [newLibrarian, setNewLibrarian] = useState({ username: "", password: "" });
  
  // --- NEW: Profile Password Update State ---
  const [profilePassword, setProfilePassword] = useState("");

  // --- LOAD DATA ---
  const refreshData = async () => {
    const allBooks = await getBooks();
    const allUsers = await getUsers();
    const allTrans = await getTransactions();

    setBooks(allBooks.reverse());
    setStudents(allUsers.filter(u => u.role === 'Student'));
    setAdmins(allUsers.filter(u => u.role === 'Admin' || u.role === 'Librarian'));
    setTransactions(allTrans);
  };

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    refreshData();
  }, [user, navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  // --- HANDLERS ---
  const handleLogout = () => { setUser(null); navigate('/'); };

  const handleSaveBook = async () => {
    if (newBook.title) {
      await addBookToDB(newBook);
      setShowAddModal(false);
      setNewBook({ title: "", author: "", category: "" });
      refreshData();
    }
  };

  const confirmDelete = async () => {
    if (selectedBook) {
      await deleteBookFromDB(selectedBook.id);
      setShowDeleteModal(false);
      refreshData();
    }
  };

  const handleBorrowClick = (book) => { setSelectedBook(book); setShowBorrowConfirm(true); };
  const confirmBorrow = async () => {
    if (selectedBook) {
      await borrowBookDB(selectedBook.id, user.username);
      setShowBorrowConfirm(false);
      refreshData();
      alert("Book Borrowed Successfully!");
    }
  };

  const handleReturnClick = (book) => { setSelectedBook(book); setShowReturnConfirm(true); };
  const confirmReturn = async () => {
    if (selectedBook) {
      await returnBookDB(selectedBook.id, user.username);
      setShowReturnConfirm(false);
      refreshData();
      alert("Book Returned Successfully!");
    }
  };

  const handleCreateLibrarian = async () => {
    if(newLibrarian.username && newLibrarian.password) {
      await addUserToDB({ ...newLibrarian, role: 'Librarian' });
      setNewLibrarian({ username: "", password: "" });
      refreshData();
    }
  };

  const handleDeleteUser = async (id) => {
    if(window.confirm("Are you sure?")) {
      await deleteUserFromDB(id);
      refreshData();
    }
  };

  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    setProfilePassword(""); // Clear previous input
    setActiveTab('student_profile');
  };

  // --- NEW: Handle Password Update ---
  const handlePasswordUpdate = async () => {
    if (!profilePassword) {
      alert("Please enter a new password.");
      return;
    }
    
    // Determine whose profile we are updating
    // If Admin/Librarian is viewing a student -> selectedStudent.id
    // If Student is viewing their own profile -> user.id (requires user to be found in DB first)
    
    let targetId;
    if (selectedStudent) {
      targetId = selectedStudent.id;
    } else {
      // Find the current logged in user's ID from the students list or users list
      // Since 'students' state has IDs, let's look there
      const currentUser = students.find(s => s.username === user.username) || admins.find(a => a.username === user.username);
      if(currentUser) targetId = currentUser.id;
    }

    if (targetId) {
      await updateUserPasswordDB(targetId, profilePassword);
      setProfilePassword("");
      alert(`Password updated successfully for ${selectedStudent ? selectedStudent.username : user.username}!`);
      refreshData();
    } else {
      alert("Error finding user ID.");
    }
  };

  const handleHistoryClick = (book) => {
    const bookHistory = transactions.filter(t => t.bookTitle === book.title);
    
    const processedHistory = bookHistory.map(t => {
      let days = 0;
      const borrowDate = new Date(t.borrowDate);
      if(t.returnDate !== "-" && t.returnDate) {
         const returnDate = new Date(t.returnDate);
         const diff = Math.abs(returnDate - borrowDate);
         days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      } else {
         const today = new Date();
         const diff = Math.abs(today - borrowDate);
         days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }
      return { ...t, duration: days };
    });

    setHistoryData(processedHistory);
    setHistoryBookTitle(book.title);
    setShowHistoryModal(true);
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      alert("No transactions to export.");
      return;
    }
    const headers = ["Book Title", "User", "Borrow Date", "Return Date", "Status"];
    const rows = transactions.map(t => [t.bookTitle, t.username, t.borrowDate, t.returnDate, t.status]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDERERS ---

  // 1. DASHBOARD
  const renderDashboard = () => {
    const filtered = books.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "All Categories" || b.category === categoryFilter;
      const matchesStatus = statusFilter === "All Statuses" || b.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    const indexOfLastBook = currentPage * rowsPerPage;
    const indexOfFirstBook = indexOfLastBook - rowsPerPage;
    const currentBooks = filtered.slice(indexOfFirstBook, indexOfLastBook);
    const totalPages = Math.ceil(filtered.length / rowsPerPage);

    return (
      <>
        {!isStudent && (
          <div className="stats-row">
            <div className="stat-card"><div><h3>Total Books</h3><h1>{books.length}</h1></div><HiOutlineDocumentReport className="stat-icon" /></div>
            <div className="stat-card"><div><h3>Available</h3><h1>{books.filter(b=>b.status==='Available').length}</h1></div><FaCheckCircle className="stat-icon" /></div>
            <div className="stat-card"><div><h3>Borrowed</h3><h1>{books.filter(b=>b.status==='Borrowed').length}</h1></div><FaTimes className="stat-icon" /></div>
            <div className="stat-card"><div><h3>Overdue</h3><h1>{books.filter(b=>b.status==='Overdue').length || 0}</h1></div><FaExclamationTriangle className="stat-icon" /></div>
          </div>
        )}

        <div className="table-card">
          <div className="table-header-row">
            <h2>Book Collection</h2>
            {!isStudent && (
              <button className="btn-add-new" onClick={() => setShowAddModal(true)}><FaPlus /> Add New Book</button>
            )}
          </div>
          <hr className="divider" />
          
          <div className="filters-container" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <div className="search-box" style={{display:'flex', alignItems:'center', border:'1px solid #ccc', padding:'8px', borderRadius:'5px', width:'300px'}}>
              <FaSearch className="search-icon" style={{color:'#888', marginRight:'10px'}} />
              <input type="text" placeholder="Search by title or author" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{border:'none', outline:'none', width:'100%'}}/>
            </div>
            <div className="dropdowns" style={{display:'flex', gap:'15px'}}>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{padding:'8px 12px', borderRadius:'5px', border:'1px solid #ccc', cursor:'pointer'}}>
                <option>All Categories</option><option>Fiction</option><option>Science</option><option>History</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{padding:'8px 12px', borderRadius:'5px', border:'1px solid #ccc', cursor:'pointer'}}>
                <option>All Statuses</option><option>Available</option><option>Borrowed</option>
              </select>
            </div>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>S.no</th><th>Title</th><th>Author</th><th>Category</th>
                <th style={{textAlign:'center'}}>Status</th>
                <th style={{textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentBooks.length > 0 ? (
                currentBooks.map((book, index) => {
                  const activeTransaction = transactions.find(t => t.bookTitle === book.title && t.status === 'Borrowed');
                  const isBorrowedByCurrentUser = activeTransaction && activeTransaction.username === user.username;

                  return (
                    <tr key={book.id}>
                      <td>{index + 1 + indexOfFirstBook}</td>
                      <td className="fw-bold">{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.category}</td>
                      <td style={{textAlign:'center'}}><span className={`status-badge ${book.status.toLowerCase()}`}>{book.status}</span></td>
                      <td style={{textAlign:'right'}}>
                        {isStudent && (
                          <>
                            {book.status === 'Available' && (
                              <button className="btn-view-profile" onClick={() => handleBorrowClick(book)}>Borrow</button>
                            )}
                            {book.status === 'Borrowed' && isBorrowedByCurrentUser && (
                              <button className="btn-view-profile" style={{backgroundColor: '#9e9e9eff'}} onClick={() => handleReturnClick(book)}>Return</button>
                            )}
                            {book.status === 'Borrowed' && !isBorrowedByCurrentUser && (
                               <span style={{color:'#999', fontSize:'12px'}}>Unavailable</span>
                            )}
                          </>
                        )}
                        {!isStudent && (
                          <>
                            <button className="action-btn history" onClick={() => handleHistoryClick(book)}><FaHistory /></button>
                            {isAdmin && (
                              <button className="action-btn delete" onClick={() => { setSelectedBook(book); setShowDeleteModal(true); }}><FaTrash /></button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>No books found matching filters.</td></tr>
              )}
            </tbody>
          </table>

          {filtered.length > rowsPerPage && (
            <div className="pagination-area" style={{display:'flex', justifyContent:'center', alignItems:'center', marginTop:'20px', gap:'15px'}}>
               <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{padding:'8px 15px', border:'none', background:'#eee', borderRadius:'5px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold', color: currentPage === 1 ? '#aaa' : '#333'}}>
                  <IoIosArrowBack /> Prev
               </button>
               <span style={{fontWeight:'bold', color:'#555'}}>Page {currentPage} of {totalPages}</span>
               <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{padding:'8px 15px', border:'none', background:'#eee', borderRadius:'5px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold', color: currentPage === totalPages ? '#aaa' : '#333'}}>
                  Next <IoIosArrowForward />
               </button>
            </div>
          )}
        </div>
      </>
    );
  };

  // 2. STUDENTS LIST
  const renderStudents = () => (
    <div className="table-card full-height">
      <div className="table-header-row"><div style={{display:'flex', alignItems:'center', gap:'10px'}}><FaUserShield size={24} /> <h2>Student Management</h2></div></div>
      <hr className="divider" />
      <table className="custom-table">
        <thead><tr><th>Student Id</th><th>Username</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
        <tbody>
          {students.map((std, index) => (
            <tr key={std.id}><td>{index + 1}</td><td>{std.username}</td><td style={{textAlign:'right'}}><button className="btn-view-profile" onClick={() => handleViewProfile(std)}><FaEye /> View Profile</button></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 3. STUDENT PROFILE VIEW (Combined Logic for Admin viewing Student & Student Viewing Self)
  const renderStudentProfile = () => {
    // Determine profile subject: 'selectedStudent' (if admin clicked view) OR 'user' (if student logged in)
    const profileUser = selectedStudent || user;
    
    const studentHistory = transactions.filter(t => t.username === profileUser.username);
    const activeBorrows = studentHistory.filter(t => t.status === 'Borrowed');

    return (
      <div className="profile-container">
        <div className="profile-header">
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div className="profile-icon-circle"><FaUserShield /></div>
            <h1>{profileUser.username} Profile</h1>
          </div>
          {/* Show Back button only if Admin/Librarian came from list */}
          {!isStudent && (
            <button className="btn-back" onClick={() => setActiveTab('students')}><FaArrowLeft /> Back to Students List</button>
          )}
        </div>
        <hr className="divider" />
        
        <div className="profile-body">
          <div className="profile-card">
            <h3>Currently Borrowed Books</h3><hr className="divider" />
            {activeBorrows.length > 0 ? activeBorrows.map((b, i) => (<div key={i} className="borrow-row"><span>{b.bookTitle}</span><span className="badge-gray">Borrow Date: {b.borrowDate}</span></div>)) : <div className="no-data">No Books Currently Borrowed.</div>}
          </div>
          <div className="profile-card">
            <h3>Update Profile</h3><hr className="divider" />
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="Enter New Password" 
              className="input-field" 
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
            />
            <button className="btn-blue-block" onClick={handlePasswordUpdate}>Update Password</button>
          </div>
        </div>
        
        <div className="profile-card mt-20">
          <h3>Borrow History</h3><hr className="divider" />
          <table className="custom-table">
            <thead><tr><th>Title</th><th>Borrow Date</th><th>Return Date</th><th>Status</th></tr></thead>
            <tbody>
              {studentHistory.length > 0 ? studentHistory.map((h, i) => (<tr key={i}><td>{h.bookTitle}</td><td>{h.borrowDate}</td><td>{h.returnDate}</td><td>{h.status}</td></tr>)) : <tr><td colSpan="4" style={{textAlign:'center'}}>No History Found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 4. OVERDUE REPORTS
  const renderOverdue = () => {
    const overdueItems = transactions.filter(t => {
      if (t.status !== 'Borrowed') return false;
      const borrowDate = new Date(t.borrowDate);
      const today = new Date();
      const diffTime = Math.abs(today - borrowDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      t.daysOverdue = diffDays; 
      return diffDays > 6;
    });

    return (
      <div className="table-card">
         <div className="table-header-row"><div style={{display:'flex', alignItems:'center', gap:'10px'}}><FaExclamationTriangle size={24} /> <h2>Overdue Books Reports</h2></div></div>
        <hr className="divider" />
        <table className="custom-table">
          <thead><tr><th>Book Title</th><th>Borrowed By</th><th>Borrow Date</th><th style={{textAlign:'center'}}>Days Overdue</th></tr></thead>
          <tbody>
            {overdueItems.length > 0 ? overdueItems.map((item, i) => (<tr key={i}><td>{item.bookTitle}</td><td>{item.username}</td><td>{item.borrowDate}</td><td style={{textAlign:'center', color:'red', fontWeight:'bold'}}>{item.daysOverdue}</td></tr>)) : <tr><td colSpan="4" style={{textAlign:'center'}}>No Overdue Books (Greater than 6 days).</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  // 5. TRANSACTIONS
  const renderTransactions = () => (
    <div className="table-card">
      <div className="table-header-row"><div style={{display:'flex', alignItems:'center', gap:'10px'}}><h2>All Transactions</h2></div><button className="btn-green" onClick={exportToCSV}><FaFileCsv /> Export To CSV</button></div>
      <hr className="divider" />
      <table className="custom-table">
        <thead><tr><th>Book Title</th><th>User</th><th>Borrow Date</th><th>Return Date</th><th>Status</th></tr></thead>
        <tbody>
          {transactions.map((t, i) => (<tr key={i}><td>{t.bookTitle}</td><td>{t.username}</td><td>{t.borrowDate}</td><td>{t.returnDate}</td><td>{t.status}</td></tr>))}
          {transactions.length === 0 && <tr><td colSpan="5" style={{textAlign:'center'}}>No transactions found</td></tr>}
        </tbody>
      </table>
    </div>
  );

  // 6. ADMIN MANAGEMENT
  const renderAdminManagement = () => (
    <div className="admin-layout">
       <div className="table-card" style={{flex:2}}>
          <h2>Admins & Librarians</h2>
          <table className="custom-table">
            <thead><tr><th>Username</th><th>Role</th><th>Action</th></tr></thead>
            <tbody>
              {admins.map(a => (<tr key={a.id}><td>{a.username}</td><td>{a.role}</td><td>{a.role !== 'Admin' && <button className="btn-del-red" onClick={() => handleDeleteUser(a.id)}>Delete</button>}</td></tr>))}
            </tbody>
          </table>
       </div>
       <div className="table-card" style={{flex:1, height:'fit-content'}}>
          <h3>Add New Librarian</h3><div className="form-group"><label>Username</label><input className="input-field-light" value={newLibrarian.username} onChange={(e)=>setNewLibrarian({...newLibrarian, username:e.target.value})} /></div>
          <div className="form-group"><label>Password</label><input type="password" className="input-field-light" value={newLibrarian.password} onChange={(e)=>setNewLibrarian({...newLibrarian, password:e.target.value})} /></div><button className="btn-blue-block" onClick={handleCreateLibrarian}>Create Librarian</button>
       </div>
    </div>
  );

  return (
    <div className="main-container">
      {/* HEADER */}
      <header className="top-header">
        <div className="header-left"><span className="brand-icon">🏛️</span><div className="brand-name"><h1>Library</h1><h2>System</h2></div></div>
        <nav className="header-nav">
          <button className={`nav-btn ${activeTab==='dashboard'?'active':''}`} onClick={()=>setActiveTab('dashboard')}>{isStudent ? 'Book Collection' : 'Dashboard'}</button>
          {!isStudent && (<><button className={`nav-btn ${activeTab==='students' || activeTab==='student_profile' ?'active':''}`} onClick={()=>setActiveTab('students')}>Students</button><button className={`nav-btn ${activeTab==='overdue'?'active':''}`} onClick={()=>setActiveTab('overdue')}>Overdue Report</button><button className={`nav-btn ${activeTab==='transactions'?'active':''}`} onClick={()=>setActiveTab('transactions')}>All Transactions</button></>)}
          {isAdmin && (<button className={`nav-btn ${activeTab==='admin'?'active':''}`} onClick={()=>setActiveTab('admin')}>Admin Management</button>)}
          {isStudent && (<button className={`nav-btn ${activeTab==='profile'?'active':''}`} onClick={()=>setActiveTab('profile')}>My Profile</button>)}
        </nav>
        <div className="header-right"><span>Welcome, {user?.username}! ({user?.role})</span><button onClick={handleLogout} className="logout-btn">Log out</button></div>
      </header>

      {/* CONTENT SWITCHER */}
      <div className="content-area">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'students' && !isStudent && renderStudents()}
        {activeTab === 'student_profile' && renderStudentProfile()} {/* Unified Profile View */}
        {activeTab === 'overdue' && !isStudent && renderOverdue()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'admin' && isAdmin && renderAdminManagement()}
        {activeTab === 'profile' && isStudent && renderStudentProfile()} {/* Student uses same function */}
      </div>

      <footer className="footer"><p>© 2025 Library Management System.</p></footer>

      {/* --- CONFIRMATION MODALS --- */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content add-book-modal">
            <div className="modal-header"><h2>Add Book</h2></div>
            <div className="modal-body">
              <input placeholder="Title" value={newBook.title} onChange={(e)=>setNewBook({...newBook, title:e.target.value})} />
              <input placeholder="Author" value={newBook.author} onChange={(e)=>setNewBook({...newBook, author:e.target.value})} />
              <input placeholder="Category" value={newBook.category} onChange={(e)=>setNewBook({...newBook, category:e.target.value})} />
            </div>
            <div className="modal-footer"><button className="btn-save" onClick={handleSaveBook}>Save</button><button className="btn-cancel" onClick={()=>setShowAddModal(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
           <div className="modal-content delete-modal-content">
             <p className="delete-msg">Delete {selectedBook?.title}?</p>
             <div className="modal-footer center"><button className="btn-yes" onClick={confirmDelete}>Yes</button><button className="btn-no" onClick={()=>setShowDeleteModal(false)}>No</button></div>
           </div>
        </div>
      )}

      {showBorrowConfirm && (
        <div className="modal-overlay">
           <div className="modal-content delete-modal-content">
             <h2>Confirm Borrow</h2><p className="delete-msg">Do you want to borrow <b>{selectedBook?.title}</b>?</p>
             <div className="modal-footer center"><button className="btn-yes" style={{backgroundColor:'#4a56e2'}} onClick={confirmBorrow}>Yes, Borrow</button><button className="btn-no" onClick={()=>setShowBorrowConfirm(false)}>Cancel</button></div>
           </div>
        </div>
      )}

      {/* --- RETURN MODAL --- */}
      {showReturnConfirm && (
        <div className="modal-overlay">
           <div className="modal-content delete-modal-content">
             <h2>Confirm Return</h2><p className="delete-msg">Do you want to return <b>{selectedBook?.title}</b>?</p>
             <div className="modal-footer center"><button className="btn-yes" style={{backgroundColor:'#4a56e2'}} onClick={confirmReturn}>Yes, Return</button><button className="btn-no" onClick={()=>setShowReturnConfirm(false)}>Cancel</button></div>
           </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content history-modal">
             <h3>History for "{historyBookTitle}"</h3>
             {historyData.length > 0 ? (
               <table className="custom-table" style={{marginTop:'20px'}}>
                 <thead><tr><th>User</th><th>Borrow Date</th><th>Return Date</th><th style={{textAlign:'center'}}>Duration (Days)</th></tr></thead>
                 <tbody>
                   {historyData.map((record, index) => (
                      <tr key={index}><td>{record.username}</td><td>{record.borrowDate}</td><td>{record.returnDate}</td><td style={{textAlign:'center', fontWeight:'bold'}}>{record.duration}</td></tr>
                   ))}
                 </tbody>
               </table>
             ) : (<div className="no-history-msg" style={{margin:'40px 0', textAlign:'center', color:'#666'}}><p>No borrow history found for this book.</p></div>)}
             <div className="modal-footer center" style={{marginTop:'20px'}}><button className="btn-close-gray" style={{backgroundColor:'#ccc', border:'none', padding:'10px 30px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}} onClick={() => setShowHistoryModal(false)}>Close</button></div>
          </div>
        </div>
      )}

      {/* --- WELCOME MODAL --- */}
      {showWelcomeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign: 'center', width: '350px'}}>
             <div style={{margin: '10px 0 20px', color: '#6c63ff', fontSize: '50px'}}>
               <FaUserShield />
             </div>
             <h2 style={{margin: '0 0 10px'}}>Welcome Back!</h2>
             <h3 style={{margin: '0 0 20px', color: '#333'}}>{user.username}</h3>
             <p style={{color: '#666', marginBottom: '30px'}}>
               You have logged in successfully as <b>{user.role}</b>.
             </p>
             <button className="btn-blue-block" style={{margin: '0 auto', width: '100%', padding: '12px', fontSize: '16px'}} onClick={() => setShowWelcomeModal(false)}>Continue to Dashboard</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;