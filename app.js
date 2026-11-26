const app = document.querySelector("#app");
    const books = [];
    const navItems = [
      ["Beranda", "home"],
      ["Daftar Buku", "book"],
      ["Pinjam Buku", "borrow"],
      ["Pengembalian Buku", "return"],
      ["Buku Top", "star"],
      ["Daftar Guru", "teacher"],
      ["Daftar Siswa", "students"],
      ["Daftar Pinjam Buku", "list"]
    ];
    const students = [];
    const teachers = [];
    const loans = [];
    let activeNav = "Beranda";
    let username = "";
    let userRole = "";
    let userIdentifier = "";
    let isAdmin = false;
    let signupRole = "Siswa";
    let query = "";
    let category = "Semua Kategori";
    let bookView = "grid";
    let personType = "siswa";
    let editingPersonId = "";
    let accounts = [];
    let nextLoanNumber = 4;
    let dialogsInitialized = false;

    const icon = (name) => {
      const paths = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z"/>',
        logo: '<path d="M4 5.5c2.3-.8 4.4-.5 6 1v12c-1.6-1.5-3.7-1.8-6-1V5.5Zm16 0c-2.3-.8-4.4-.5-6 1v12c1.6-1.5 3.7-1.8 6-1V5.5Z"/><path d="M12 7v12"/>',
        book: '<path d="M4 5.5c2-.8 4-.5 6 1v12c-2-1.5-4-1.8-6-1v-12Zm16 0c-2-.8-4-.5-6 1v12c2-1.5 4-1.8 6-1v-12Z"/><path d="M12 7v12"/>',
        borrow: '<path d="M4 5h6a3 3 0 0 1 3 3v11H8a4 4 0 0 0-4 0V5Z"/><path d="M20 5h-4a3 3 0 0 0-3 3v11h3a4 4 0 0 1 4 0V5Z"/><path d="m8 10 2 2 4-4"/>',
        return: '<path d="M8 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3"/><path d="m10 9-4 4 4 4"/><path d="M6 13h10a4 4 0 0 0 0-8h-3"/>',
        star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
        teacher: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7" r="4"/><path d="M17 11a4 4 0 0 0 0-8M21 20v-1.5a4 4 0 0 0-3-3.9"/>',
        students: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Z"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1h-3"/>',
        list: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
        search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
        logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>'
      };
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
    };

    async function requestApi(path, options = {}) {
      const apiBase = location.port === "5500" ? `${location.protocol}//${location.hostname}:3000` : "";
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers },
        credentials: apiBase ? "include" : "same-origin"
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("Respons server bukan JSON. Pastikan server Node.js berjalan di port 3000.");
      }
      if (!response.ok) throw new Error(result.error || "Permintaan gagal.");
      return result;
    }

    function applyState(data) {
      books.splice(0, books.length, ...data.books);
      students.splice(0, students.length, ...data.students);
      teachers.splice(0, teachers.length, ...data.teachers);
      loans.splice(0, loans.length, ...data.loans);
      accounts = data.accounts;
      nextLoanNumber = data.nextLoanNumber;
    }

    function setCurrentUser(user) {
      username = user.name;
      userRole = user.role;
      userIdentifier = user.role === "Admin" ? "" : user.identifier;
      isAdmin = user.role === "Admin";
    }

    function renderAuth(mode = "login") {
      const signup = mode === "signup";
      app.innerHTML = `
        <section class="auth-screen">
          <aside class="auth-aside">
            <div class="brand">
              <span class="brand-mark">${icon("logo")}</span>
              <div>Perpustakaan Karya Guna 2 Bekasi<small>Kelola koleksi buku</small></div>
            </div>
            <div class="aside-content">
              <h1>Satu tempat.<br>Ribuan pengetahuan.</h1>
              <p>Temukan buku favoritmu dan jelajahi dunia baru melalui koleksi perpustakaan kami.</p>
              <div class="quote-card">
                <p>“Satu buku, satu pena, satu anak, dan satu guru dapat mengubah dunia.”</p>
                <strong>Koleksi buku terbaik</strong>
                <span>Temukan bacaan yang menginspirasi</span>
              </div>
            </div>
            <div class="aside-footer">Membaca hari ini, memimpin masa depan.</div>
          </aside>
          <section class="auth-main">
            <div class="auth-form-wrap">
              <span class="eyebrow">${signup ? "Mulai membaca" : "Selamat datang kembali"}</span>
              <h2>${signup ? "Buat akun baru" : "Masuk ke Pustaka"}</h2>
              <p class="form-intro">${signup ? "Daftar untuk menikmati semua layanan perpustakaan." : "Masuk untuk mengakses koleksi dan layanan perpustakaan."}</p>
              <form id="auth-form">
                ${signup ? `
                  <fieldset class="role-field">
                    <legend>Daftar sebagai</legend>
                    <div class="role-options">
                      <button class="role-choice ${signupRole === "Siswa" ? "selected" : ""}" type="button" data-signup-role="Siswa" aria-pressed="${signupRole === "Siswa"}">Siswa</button>
                      <button class="role-choice ${signupRole === "Guru" ? "selected" : ""}" type="button" data-signup-role="Guru" aria-pressed="${signupRole === "Guru"}">Guru</button>
                    </div>
                    <input id="account-role" type="hidden" name="role" value="${signupRole}">
                  </fieldset>
                  <div class="field"><label for="full-name">Nama</label><input id="full-name" name="name" autocomplete="name" placeholder="Masukkan nama lengkap" required></div>
                  <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" placeholder="nama@email.com" required></div>
                  <div class="field"><label id="identifier-label" for="account-identifier">${signupRole === "Guru" ? "NIP" : "NIS"}</label><input id="account-identifier" name="identifier" autocomplete="off" placeholder="Masukkan ${signupRole === "Guru" ? "NIP" : "NIS"}" required></div>
                  <div class="field"><label id="detail-label" for="account-detail">${signupRole === "Guru" ? "Jabatan" : "Kelas"}</label><input id="account-detail" name="detail" placeholder="${signupRole === "Guru" ? "Contoh: Guru Matematika" : "Contoh: XI IPA 1"}" required></div>
                  <div class="field"><label for="account-phone">Nomor telepon</label><input id="account-phone" name="phone" type="tel" autocomplete="tel" placeholder="Nomor telepon (opsional)"></div>
                ` : `<div class="field"><label for="username">Email atau NIS/NIP</label><input id="username" name="username" autocomplete="username" placeholder="Masukkan email atau NIS/NIP" required></div>`}
                <div class="field"><label for="password">Kata sandi</label><input id="password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="Masukkan kata sandi" minlength="8" required></div>
                ${!signup ? `
                  <div class="form-options"><label class="check-label"><input type="checkbox" name="remember"> Ingat saya</label><button class="text-button" type="button" id="forgot-password">Lupa kata sandi?</button></div>
                ` : ""}
                <button class="primary-button" type="submit">${signup ? "Buat akun" : "Masuk"}</button>
              </form>
              <p class="switch-auth">${signup ? "Sudah punya akun?" : "Belum punya akun?"} <button class="text-button" id="switch-auth">${signup ? "Masuk di sini" : "Daftar sekarang"}</button></p>
              ${!signup ? `<div class="auth-notice">Gunakan akun perpustakaan untuk melihat koleksi, meminjam buku, dan mengelola aktivitas membaca Anda.</div>` : ""}
              <p class="auth-note">© 2025 Perpustakaan Karya Guna 2 Bekasi</p>
            </div>
          </section>
        </section>`;

      document.querySelector("#switch-auth").addEventListener("click", () => renderAuth(signup ? "login" : "signup"));
      document.querySelectorAll("[data-signup-role]").forEach((button) => button.addEventListener("click", () => {
        signupRole = button.dataset.signupRole;
        document.querySelector("#account-role").value = signupRole;
        document.querySelectorAll("[data-signup-role]").forEach((choice) => {
          const selected = choice.dataset.signupRole === signupRole;
          choice.classList.toggle("selected", selected);
          choice.setAttribute("aria-pressed", String(selected));
        });
        const isTeacher = signupRole === "Guru";
        document.querySelector("#identifier-label").textContent = isTeacher ? "NIP" : "NIS";
        document.querySelector("#account-identifier").placeholder = `Masukkan ${isTeacher ? "NIP" : "NIS"}`;
        document.querySelector("#detail-label").textContent = isTeacher ? "Jabatan" : "Kelas";
        document.querySelector("#account-detail").placeholder = isTeacher ? "Contoh: Guru Matematika" : "Contoh: XI IPA 1";
      }));
      document.querySelector("#auth-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          if (signup) {
            const result = await requestApi("/api/signup", {
              method: "POST",
              body: JSON.stringify({
                role: data.get("role"),
                name: data.get("name").toString().trim(),
                email: data.get("email").toString().trim(),
                identifier: data.get("identifier").toString().trim(),
                detail: data.get("detail").toString().trim(),
                phone: data.get("phone").toString().trim(),
                password: data.get("password").toString()
              })
            });
            setCurrentUser(result.user);
            applyState(result.data);
          } else {
            const result = await requestApi("/api/login", {
              method: "POST",
              body: JSON.stringify({
                login: data.get("username").toString().trim(),
                password: data.get("password").toString()
              })
            });
            setCurrentUser(result.user);
            applyState(await requestApi("/api/data"));
          }
          activeNav = "Beranda";
          renderApp();
        } catch (error) {
          console.error("Gagal memproses login atau pendaftaran:", error);
          alert(error.message);
        }
      });
      const forgotButton = document.querySelector("#forgot-password");
      if (forgotButton) forgotButton.addEventListener("click", () => alert("Silakan hubungi petugas perpustakaan untuk bantuan mengatur ulang kata sandi."));
    }

    function renderAdminSetup() {
      app.innerHTML = `<section class="auth-screen"><aside class="auth-aside"><div class="brand"><span class="brand-mark">${icon("logo")}</span><div>Perpustakaan Karya Guna 2 Bekasi<small>Setup administrator lokal</small></div></div><div class="aside-content"><h1>Siapkan Admin.</h1><p>Buat akun Admin pertama untuk mengelola seluruh data perpustakaan.</p></div><div class="aside-footer">Server hanya dapat diakses dari komputer ini.</div></aside><section class="auth-main"><div class="auth-form-wrap"><span class="eyebrow">Setup pertama</span><h2>Buat akun Admin</h2><p class="form-intro">Kredensial disimpan sebagai hash di database JSON lokal.</p><form id="admin-setup-form"><div class="field"><label for="admin-username">Nama pengguna Admin</label><input id="admin-username" name="username" autocomplete="username" minlength="3" required></div><div class="field"><label for="admin-password">Kata sandi</label><input id="admin-password" name="password" type="password" autocomplete="new-password" minlength="12" required></div><div class="field"><label for="admin-password-confirm">Ulangi kata sandi</label><input id="admin-password-confirm" name="passwordConfirm" type="password" autocomplete="new-password" minlength="12" required></div><button class="primary-button" type="submit">Buat Admin</button></form></div></section></section>`;
      document.querySelector("#admin-setup-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const password = data.get("password").toString();
        if (password !== data.get("passwordConfirm").toString()) {
          alert("Konfirmasi kata sandi tidak sama.");
          return;
        }
        try {
          const result = await requestApi("/api/admin/setup", {
            method: "POST",
            body: JSON.stringify({ username: data.get("username").toString().trim(), password })
          });
          setCurrentUser(result.user);
          applyState(result.data);
          renderApp();
        } catch (error) {
          console.error("Gagal membuat akun Admin:", error);
          alert(error.message);
        }
      });
    }

    function renderServerError(error) {
      app.innerHTML = `<section class="auth-main"><div class="auth-form-wrap"><span class="eyebrow">Server lokal</span><h2>Server belum tersedia</h2><p class="form-intro">${escapeHtml(error.message)}<br>Jalankan <code>node server.js</code>, lalu buka kembali halaman ini.</p><button class="primary-button" id="retry-server">Coba lagi</button></div></section>`;
      document.querySelector("#retry-server").addEventListener("click", initialize);
    }

    function renderApp() {
      app.innerHTML = `
        <section class="app-screen">
          <aside class="sidebar">
            <div class="brand">
              <span class="brand-mark">${icon("logo")}</span>
              <div>Perpustakaan<br><span style="color:#19cb91">Karya Guna 2</span><br>Bekasi<small>♧ Kelola koleksi buku</small></div>
            </div>
            <nav class="nav-list" aria-label="Navigasi utama">
              ${navItems.filter(([label]) => {
                if (isAdmin) return true;
                if (userRole === "Siswa") return label !== "Daftar Guru" && label !== "Daftar Siswa";
                if (userRole === "Guru") return label !== "Daftar Guru";
                return true;
              }).map(([label, symbol]) => `<button class="nav-item ${activeNav === label ? "active" : ""}" data-nav="${label}">${icon(symbol)}<span>${label}</span></button>`).join("")}
            </nav>
            <div class="sidebar-bottom">Perpustakaan Karya Guna 2 Bekasi<br>Kelola koleksi dan aktivitas peminjaman.</div>
          </aside>
          <section class="main-area">
            <header class="topbar">
              <div><p>Halo, ${escapeHtml(username)}</p><h1>${activeNav}</h1></div>
              <div class="user-area">
                <span class="avatar">${escapeHtml(username.slice(0, 1).toUpperCase())}</span>
                <div><div class="user-name">${escapeHtml(username)}</div><div class="user-role">${escapeHtml(userRole)}${userIdentifier ? ` · ${userRole === "Guru" ? "NIP" : "NIS"} ${escapeHtml(userIdentifier)}` : ""}</div></div>
                <button class="logout-button" id="logout">${icon("logout")} Keluar</button>
              </div>
            </header>
            <main class="content" id="page-content">${pageContent()}</main>
          </section>
        </section>`;

      document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
        activeNav = button.dataset.nav;
        query = "";
        category = "Semua Kategori";
        renderApp();
      }));
      document.querySelector("#logout").addEventListener("click", async () => {
        try {
          await requestApi("/api/logout", { method: "POST" });
        } catch (error) {
          console.error("Gagal mengakhiri sesi:", error);
          alert(error.message);
        }
        username = "";
        userRole = "";
        userIdentifier = "";
        isAdmin = false;
        renderAuth("login");
      });
      bindPageEvents();
    }

    function pageContent() {
      const pages = {
        "Beranda": renderDashboard,
        "Daftar Buku": renderBookPage,
        "Pinjam Buku": renderBorrowPage,
        "Pengembalian Buku": renderReturnPage,
        "Buku Top": renderPopularPage,
        "Daftar Guru": () => renderPeoplePage("guru"),
        "Daftar Siswa": () => renderPeoplePage("siswa"),
        "Daftar Pinjam Buku": renderLoansPage
      };
      return (pages[activeNav] || renderDashboard)();
    }

    function renderDashboard() {
      const available = books.reduce((total, book) => total + book.stock, 0);
      const activeLoans = loans.filter((loan) => loan.status === "Dipinjam").length;
      const bars = [38, 63, 48, 80, 57, 91, 69];
      return `<div class="page-stack">
        <section class="metric-grid">
          ${metric("Total Buku", books.length, "Judul dalam koleksi")}
          ${metric("Buku Tersedia", available, "Siap untuk dipinjam")}
          ${metric("Sedang Dipinjam", activeLoans, "Transaksi aktif")}
          ${metric("Anggota", students.length + teachers.length, "Guru dan siswa terdaftar")}
        </section>
        <section class="two-column">
          <article class="content-card">
            <div class="content-card-head"><div><h2>Aktivitas Peminjaman</h2><p>Ringkasan peminjaman buku selama 7 bulan terakhir</p></div><span class="status-pill">Tahun ini</span></div>
            <div class="chart-area">${bars.map((height, index) => `<div class="chart-column"><div class="chart-bar" style="height:${height}%"></div>${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul"][index]}</div>`).join("")}</div>
            <div class="chart-caption">Jumlah peminjaman per bulan</div>
          </article>
          <article class="content-card">
            <div class="content-card-head"><div><h2>Buku Populer</h2><p>Koleksi pilihan pembaca</p></div><button class="small-action" data-go="Buku Top">Lihat semua</button></div>
            <div class="top-book-list">${books.slice(0, 4).map((book, index) => `<div class="top-book-row"><span class="rank-number">${index + 1}</span><div><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.category)} · ${book.stock} tersedia</span></div></div>`).join("")}</div>
          </article>
        </section>
        <article class="content-card">
          <div class="content-card-head"><div><h2>Peminjaman Terbaru</h2><p>Aktivitas terbaru di perpustakaan</p></div><button class="small-action" data-go="Daftar Pinjam Buku">Lihat semua</button></div>
          ${loanTable(loans.slice(0, 4), false)}
        </article>
      </div>`;
    }

    function metric(label, value, note) {
      return `<article class="metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-foot">${note}</div></article>`;
    }

    function renderBookPage() {
      const categories = [...new Set(books.map((book) => book.category))].sort();
      return `<section class="catalog-panel" aria-label="Koleksi buku">
        <div class="panel-heading"><div><h2>Koleksi Buku</h2><p id="book-count">${books.length} judul tersedia di katalog</p></div>${isAdmin ? `<button class="add-button" id="add-book">＋ Tambah Buku</button>` : ""}</div>
        <div class="toolbar">
          <label class="search-box">${icon("search")}<input id="book-search" type="search" placeholder="Cari judul, penulis, atau kategori..." aria-label="Cari buku" value="${escapeHtml(query)}"></label>
          <select id="category-filter" aria-label="Filter kategori"><option>Semua Kategori</option>${categories.map((item) => `<option ${category === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>
          <div class="view-switch" aria-label="Tampilan buku"><button class="${bookView === "grid" ? "selected" : ""}" data-book-view="grid">Kartu</button><button class="${bookView === "table" ? "selected" : ""}" data-book-view="table">Tabel</button></div>
        </div>
        <div id="book-results"></div>
      </section>`;
    }

    function renderBookResults() {
      const results = document.querySelector("#book-results");
      if (!results) return;
      const filtered = books.filter((book) => `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(query) && (category === "Semua Kategori" || book.category === category));
      document.querySelector("#book-count").textContent = `${filtered.length} judul tersedia di katalog`;
      if (bookView === "table") {
        results.innerHTML = filtered.length ? `<div class="table-wrap">${table(["Judul Buku", "Penulis", "Kategori", "Tersedia"], filtered.map((book) => [escapeHtml(book.title), escapeHtml(book.author), escapeHtml(book.category), `${book.stock} buku`]))}</div>` : emptyMessage();
        return;
      }
      results.innerHTML = filtered.length ? `<div class="book-grid">${filtered.map((book) => bookCard(book)).join("")}</div>` : emptyMessage();
    }

    function bookCard(book, rank) {
      return `<article class="book-card">${book.image ? `<img class="book-cover" src="${book.image}" alt="Sampul buku ${escapeHtml(book.title)}">` : `<div class="book-cover" style="display:grid;place-items:center;color:#648278;font-size:13px">Sampul buku</div>`}
        <div class="book-info">${rank ? `<span class="category-tag">#${rank} Populer</span>` : `<span class="category-tag">${escapeHtml(book.category)}</span>`}<h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.author)}</p><span class="stock-tag">${book.stock} tersedia</span></div></article>`;
    }

    function renderBorrowPage() {
      const availableBooks = books.filter((book) => book.stock > 0);
      return `<div class="page-stack"><div class="two-column">
        ${isAdmin ? `<section class="content-card form-card"><h2>Formulir Peminjaman</h2><p>Isi data peminjam dan buku yang akan dipinjam.</p>
          <form id="borrow-form"><div class="form-grid">
            <div class="field"><label for="borrower">Nama peminjam</label><select id="borrower" name="borrower" required>${students.length ? `<optgroup label="Siswa">${students.map((student) => `<option value="${escapeHtml(`siswa:${student.id}`)}">${escapeHtml(student.name)} — ${escapeHtml(student.id)}</option>`).join("")}</optgroup>` : ""}${teachers.length ? `<optgroup label="Guru">${teachers.map((teacher) => `<option value="${escapeHtml(`guru:${teacher.id}`)}">${escapeHtml(teacher.name)} — ${escapeHtml(teacher.id)}</option>`).join("")}</optgroup>` : ""}</select></div>
            <div class="field"><label for="borrow-book">Pilih buku</label><select id="borrow-book" name="bookTitle" required>${availableBooks.map((book) => `<option value="${escapeHtml(book.title)}">${escapeHtml(book.title)} (${book.stock} tersedia)</option>`).join("")}</select></div>
            <div class="field"><label for="borrow-date">Tanggal pinjam</label><input id="borrow-date" name="date" type="date" value="${today()}" required></div>
            <div class="field"><label for="due-date">Batas pengembalian</label><input id="due-date" name="dueDate" type="date" value="${dateAfter(7)}" required></div>
          </div><button class="primary-button" type="submit">Catat Peminjaman</button></form>
        </section>` : `<aside class="notice-card"><strong>Peminjaman dikelola Admin</strong>Hubungi petugas perpustakaan untuk mencatat peminjaman buku.</aside>`}
        <aside class="notice-card"><strong>Informasi peminjaman</strong>Masa peminjaman standar adalah 7 hari. Pastikan data peminjam (siswa/guru) dan judul buku sudah benar sebelum menyimpan transaksi.</aside>
      </div>
      <article class="content-card"><div class="content-card-head"><div><h2>Peminjaman Aktif</h2><p>Daftar pinjaman yang belum dikembalikan</p></div></div>${loanTable(loans.filter((loan) => loan.status === "Dipinjam"), false)}</article></div>`;
    }

    function renderReturnPage() {
      const active = loans.filter((loan) => loan.status === "Dipinjam");
      return `<div class="page-stack">
        <article class="content-card"><div class="content-card-head"><div><h2>Pengembalian Buku</h2><p>Pilih transaksi untuk mencatat buku yang sudah dikembalikan.</p></div><span class="status-pill">${active.length} pinjaman aktif</span></div>
          ${active.length ? loanTable(active, isAdmin) : emptyMessage("Tidak ada buku yang menunggu pengembalian.")}
        </article>
        <aside class="notice-card"><strong>Proses pengembalian</strong>Setelah buku dikembalikan, status transaksi akan diperbarui dan jumlah buku tersedia akan bertambah otomatis.</aside>
      </div>`;
    }

    function renderPopularPage() {
      const popular = [...books].sort((a, b) => b.stock - a.stock);
      return `<div class="page-stack"><section class="metric-grid">
          ${metric("Koleksi Populer", popular.length, "Judul yang paling sering dipilih")}
          ${metric("Kategori", new Set(books.map((book) => book.category)).size, "Kategori buku tersedia")}
          ${metric("Total Tersedia", books.reduce((sum, book) => sum + book.stock, 0), "Eksemplar di perpustakaan")}
          ${metric("Pilihan Minggu Ini", popular[0] ? popular[0].title : "-", "Buku dengan stok terbanyak")}
        </section><div class="book-grid">${popular.map((book, index) => bookCard(book, index + 1)).join("")}</div></div>`;
    }

    function renderPeoplePage(type) {
      const list = type === "guru" ? teachers : students;
      const title = type === "guru" ? "Daftar Guru" : "Daftar Siswa";
      const detailLabel = type === "guru" ? "Jabatan" : "Kelas";
      return `<section class="content-card">
        <div class="content-card-head"><div><h2>${title}</h2><p>${list.length} anggota terdaftar</p></div>${isAdmin ? `<button class="add-button" id="add-person">＋ Tambah ${type === "guru" ? "Guru" : "Siswa"}</button>` : ""}</div>
        <div class="toolbar"><label class="search-box">${icon("search")}<input id="people-search" type="search" placeholder="Cari nama atau nomor anggota..." aria-label="Cari anggota"></label></div>
        <div id="people-results"></div>
      </section>`;
    }

    function renderPeopleResults(type) {
      const results = document.querySelector("#people-results");
      if (!results) return;
      const list = type === "guru" ? teachers : students;
      const detailLabel = type === "guru" ? "Jabatan" : "Kelas";
      const needle = (document.querySelector("#people-search")?.value || "").trim().toLowerCase();
      const filtered = list.filter((person) => `${person.id} ${person.name} ${person.detail} ${person.phone} ${person.email || ""}`.toLowerCase().includes(needle));
      results.innerHTML = filtered.length ? `<div class="table-wrap">${table([type === "guru" ? "NIP" : "NIS", "Nama Lengkap", detailLabel, "Email akun", "Telepon", ...(isAdmin ? ["Aksi"] : [])], filtered.map((person) => [
        escapeHtml(person.id),
        escapeHtml(person.name),
        escapeHtml(person.detail),
        escapeHtml(person.email || "—"),
        escapeHtml(person.phone || "—"),
        ...(isAdmin ? [`<button class="small-action" data-edit-person="${escapeHtml(person.id)}">Ubah</button> <button class="small-action" data-delete-person="${escapeHtml(person.id)}">Hapus</button>`] : [])
      ]))}</div>` : emptyMessage("Data anggota tidak ditemukan.");
    }

    function renderLoansPage() {
      return `<section class="content-card"><div class="content-card-head"><div><h2>Riwayat Peminjaman</h2><p>${loans.length} transaksi tercatat</p></div><span class="status-pill">${loans.filter((loan) => loan.status === "Dipinjam").length} aktif</span></div>
        <div class="toolbar"><label class="search-box">${icon("search")}<input id="loan-search" type="search" placeholder="Cari nama, judul buku, atau nomor transaksi..." aria-label="Cari transaksi"></label>
        <select id="loan-status" aria-label="Filter status"><option>Semua Status</option><option>Dipinjam</option><option>Dikembalikan</option></select></div>
        <div id="loan-results"></div>
      </section>`;
    }

    function renderLoanResults() {
      const results = document.querySelector("#loan-results");
      if (!results) return;
      const needle = (document.querySelector("#loan-search")?.value || "").trim().toLowerCase();
      const status = document.querySelector("#loan-status")?.value || "Semua Status";
      const filtered = loans.filter((loan) => `${loan.id} ${loan.borrower} ${loan.bookTitle}`.toLowerCase().includes(needle) && (status === "Semua Status" || loan.status === status));
      results.innerHTML = filtered.length ? loanTable(filtered, false, isAdmin) : emptyMessage("Transaksi tidak ditemukan.");
    }

    function loanTable(items, allowReturn, allowDelete = false) {
      if (!items.length) return emptyMessage("Belum ada data peminjaman.");
      const rows = items.map((loan) => [
        escapeHtml(loan.id),
        escapeHtml(loan.borrower),
        escapeHtml(loan.bookTitle),
        formatDate(loan.date),
        formatDate(loan.dueDate),
        `<span class="status-pill ${loan.status === "Dikembalikan" ? "muted" : ""}">${loan.status}</span>`,
        ...(allowReturn ? [loan.status === "Dipinjam" ? `<button class="small-action" data-return-loan="${escapeHtml(loan.id)}">Konfirmasi</button>` : "—"] : []),
        ...(allowDelete ? [`<button class="small-action" data-delete-loan="${escapeHtml(loan.id)}">Hapus</button>`] : [])
      ]);
      const headers = ["No. Transaksi", "Peminjam", "Judul Buku", "Tanggal Pinjam", "Batas Kembali", "Status"];
      if (allowReturn) headers.push("Aksi");
      if (allowDelete) headers.push("Aksi");
      return `<div class="table-wrap">${table(headers, rows)}</div>`;
    }

    function table(headers, rows) {
      return `<table class="data-table"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    }

    function emptyMessage(message = "Tidak ada data yang dapat ditampilkan.") {
      return `<div class="empty-state">${message}</div>`;
    }

    function bindPageEvents() {
      document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => {
        activeNav = button.dataset.go;
        renderApp();
      }));
      const addBookButton = document.querySelector("#add-book");
      if (addBookButton) addBookButton.addEventListener("click", () => document.querySelector("#add-book-dialog").showModal());
      const searchBooks = document.querySelector("#book-search");
      if (searchBooks) searchBooks.addEventListener("input", (event) => {
        query = event.target.value.trim().toLowerCase();
        renderBookResults();
      });
      const categoryFilter = document.querySelector("#category-filter");
      if (categoryFilter) categoryFilter.addEventListener("change", (event) => {
        category = event.target.value;
        renderBookResults();
      });
      document.querySelectorAll("[data-book-view]").forEach((button) => button.addEventListener("click", () => {
        bookView = button.dataset.bookView;
        renderBookResults();
        document.querySelectorAll("[data-book-view]").forEach((item) => item.classList.toggle("selected", item.dataset.bookView === bookView));
      }));
      const borrowForm = document.querySelector("#borrow-form");
      if (borrowForm) borrowForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(borrowForm);
        const [borrowerType, ...borrowerIdParts] = String(data.get("borrower") || "").split(":");
        const borrowerId = borrowerIdParts.join(":");
        const borrowerList = borrowerType === "guru" ? teachers : borrowerType === "siswa" ? students : [];
        const borrower = borrowerList.find((item) => item.id === borrowerId);
        const book = books.find((item) => item.title === data.get("bookTitle") && item.stock > 0);
        if (!borrower || !book) {
          alert("Data peminjam atau ketersediaan buku berubah. Muat ulang pilihan dan coba lagi.");
          return;
        }
        const before = snapshotData();
        book.stock -= 1;
        loans.unshift({ id: `P-2026-${String(nextLoanNumber++).padStart(3, "0")}`, borrower: borrower.name, borrowerType: borrowerType === "guru" ? "Guru" : "Siswa", ...(borrowerType === "guru" ? { teacherId: borrower.id } : { studentId: borrower.id }), bookTitle: book.title, date: data.get("date"), dueDate: data.get("dueDate"), status: "Dipinjam" });
        if (!(await saveChanges(before))) return;
        renderApp();
      });
      document.querySelectorAll("[data-return-loan]").forEach((button) => button.addEventListener("click", async () => {
        const loan = loans.find((item) => item.id === button.dataset.returnLoan);
        if (!loan || loan.status !== "Dipinjam") return;
        const before = snapshotData();
        loan.status = "Dikembalikan";
        const book = books.find((item) => item.title === loan.bookTitle);
        if (book) book.stock += 1;
        if (!(await saveChanges(before))) return;
        renderApp();
      }));
      const peopleSearch = document.querySelector("#people-search");
      if (peopleSearch) {
        const type = activeNav === "Daftar Guru" ? "guru" : "siswa";
        peopleSearch.addEventListener("input", () => renderPeopleResults(type));
        const addPersonButton = document.querySelector("#add-person");
        if (addPersonButton) addPersonButton.addEventListener("click", () => openPersonDialog(type));
        document.querySelector("#people-results").addEventListener("click", async (event) => {
          const editButton = event.target.closest("[data-edit-person]");
          if (editButton) {
            const list = type === "guru" ? teachers : students;
            const person = list.find((item) => item.id === editButton.dataset.editPerson);
            if (person) openPersonDialog(type, person);
            return;
          }
          const deleteButton = event.target.closest("[data-delete-person]");
          if (!deleteButton) return;
          const list = type === "guru" ? teachers : students;
          const index = list.findIndex((item) => item.id === deleteButton.dataset.deletePerson);
          if (index < 0 || !confirm(`Hapus data ${type === "guru" ? "guru" : "siswa"} ini? Akun yang terhubung juga akan dihapus.`)) return;
          const before = snapshotData();
          const [removed] = list.splice(index, 1);
          if (removed.accountId) accounts = accounts.filter((account) => account.id !== removed.accountId);
          if (!(await saveChanges(before))) return;
          renderApp();
        });
        renderPeopleResults(type);
      }
      const loanSearch = document.querySelector("#loan-search");
      if (loanSearch) {
        loanSearch.addEventListener("input", renderLoanResults);
        document.querySelector("#loan-status").addEventListener("change", renderLoanResults);
        document.querySelector("#loan-results").addEventListener("click", async (event) => {
          const deleteButton = event.target.closest("[data-delete-loan]");
          if (!deleteButton) return;
          const index = loans.findIndex((loan) => loan.id === deleteButton.dataset.deleteLoan);
          if (index < 0) return;
          const loan = loans[index];
          if (!confirm(`Hapus transaksi ${loan.id}?${loan.status === "Dipinjam" ? " Stok buku akan dikembalikan." : ""}`)) return;
          const before = snapshotData();
          if (loan.status === "Dipinjam") {
            const book = books.find((item) => item.title === loan.bookTitle);
            if (!book) {
              alert("Buku untuk transaksi ini tidak ditemukan. Transaksi tidak dihapus agar stok tetap akurat.");
              return;
            }
            book.stock += 1;
          }
          loans.splice(index, 1);
          if (!(await saveChanges(before))) return;
          renderApp();
        });
        renderLoanResults();
      }
    }

    function setupDialogs() {
      document.querySelector("#cancel-add").addEventListener("click", () => document.querySelector("#add-book-dialog").close());
      document.querySelector("#add-book-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const before = snapshotData();
        books.unshift({ title: data.get("title").toString().trim(), author: data.get("author").toString().trim(), category: data.get("category").toString().trim(), stock: Number(data.get("stock")), image: "" });
        if (!(await saveChanges(before))) return;
        category = "Semua Kategori";
        form.reset();
        document.querySelector("#add-book-dialog").close();
        renderApp();
      });
      document.querySelector("#cancel-record").addEventListener("click", () => document.querySelector("#record-dialog").close());
      document.querySelector("#record-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const list = personType === "guru" ? teachers : students;
        const identifier = data.get("identifier").toString().trim();
        const name = data.get("name").toString().trim();
        const email = data.get("email").toString().trim();
        const detail = data.get("detail").toString().trim();
        const phone = data.get("phone").toString().trim();
        const existing = editingPersonId ? list.find((person) => person.id === editingPersonId) : null;
        const linkedAccount = existing && accounts.find((account) => account.id === existing.accountId);
        const duplicateIdentifier = list.some((person) => person.id.toLowerCase() === identifier.toLowerCase() && person !== existing)
          || accounts.some((account) => account.identifier.toLowerCase() === identifier.toLowerCase() && account !== linkedAccount);
        const duplicateEmail = email && accounts.some((account) => account.email.toLowerCase() === email.toLowerCase() && account !== linkedAccount);
        if (duplicateIdentifier || duplicateEmail) {
          alert(duplicateIdentifier ? `Nomor ${personType === "guru" ? "NIP" : "NIS"} sudah digunakan.` : "Email sudah digunakan.");
          return;
        }
        const before = snapshotData();
        const personData = { id: identifier, name, detail, phone, email };
        if (existing) Object.assign(existing, personData);
        else list.push(personData);
        if (linkedAccount) Object.assign(linkedAccount, { identifier, name, email, detail, phone });
        if (!(await saveChanges(before))) return;
        editingPersonId = "";
        form.reset();
        document.querySelector("#record-dialog").close();
        renderApp();
      });
    }

    function openPersonDialog(type, person = null) {
      personType = type;
      editingPersonId = person ? person.id : "";
      const isTeacher = type === "guru";
      const identifierLabel = isTeacher ? "NIP" : "NIS";
      document.querySelector("#record-dialog-title").textContent = `${person ? "Ubah" : "Tambah"} ${isTeacher ? "Guru" : "Siswa"}`;
      document.querySelector("#record-dialog-fields").innerHTML = `<div class="field"><label for="person-identifier">${identifierLabel}</label><input id="person-identifier" name="identifier" value="${escapeHtml(person ? person.id : "")}" required></div><div class="field"><label for="person-name">Nama lengkap</label><input id="person-name" name="name" value="${escapeHtml(person ? person.name : "")}" required></div><div class="field"><label for="person-detail">${isTeacher ? "Jabatan" : "Kelas"}</label><input id="person-detail" name="detail" value="${escapeHtml(person ? person.detail : "")}" required></div><div class="field"><label for="person-email">Email akun</label><input id="person-email" name="email" type="email" value="${escapeHtml(person ? person.email || "" : "")}"></div><div class="field"><label for="person-phone">Nomor telepon</label><input id="person-phone" name="phone" type="tel" value="${escapeHtml(person ? person.phone || "" : "")}"></div>`;
      document.querySelector("#record-dialog").showModal();
    }

    async function persistData() {
      if (!isAdmin) throw new Error("Hanya Admin yang dapat mengubah data perpustakaan.");
      const data = await requestApi("/api/data", {
        method: "PUT",
        body: JSON.stringify({
        books,
        students,
        teachers,
        loans,
        accounts,
        nextLoanNumber
        })
      });
      applyState(data);
    }

    function snapshotData() {
      return JSON.stringify({ books, students, teachers, loans, accounts, nextLoanNumber });
    }

    async function saveChanges(snapshot) {
      try {
        await persistData();
        return true;
      } catch (error) {
        applyState(JSON.parse(snapshot));
        console.error("Gagal menyimpan perubahan:", error);
        alert(error.message);
        return false;
      }
    }

    function today() {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function dateAfter(days) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function formatDate(value) {
      if (!value) return "—";
      return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
    }

    async function initialize() {
      if (!dialogsInitialized) {
        setupDialogs();
        dialogsInitialized = true;
      }
      try {
        const status = await requestApi("/api/status");
        if (status.setupRequired) {
          renderAdminSetup();
          return;
        }
        if (!status.user) {
          renderAuth("login");
          return;
        }
        setCurrentUser(status.user);
        applyState(await requestApi("/api/data"));
        renderApp();
      } catch (error) {
        console.error("Gagal menginisialisasi aplikasi:", error);
        renderServerError(error);
      }
    }

    initialize();

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      })[character]);
    }
  