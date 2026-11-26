# Perpustakaan Karya Guna 2 Bekasi

## Menjalankan server lokal

Persyaratan: Node.js 18 atau lebih baru. Tidak perlu memasang paket tambahan.

1. Buka PowerShell di folder proyek.
2. Jalankan `node server.js`.
3. Buka `http://127.0.0.1:3000` di browser.
4. Saat pertama kali dibuka, buat akun Admin. Kata sandi Admin minimal 12 karakter.
5. Setelah setup, Admin masuk menggunakan nama pengguna dan kata sandi yang dibuat.

Tekan `Ctrl+C` di PowerShell untuk menghentikan server. Untuk mengganti port, jalankan `$env:PORT=3001; node server.js`, lalu buka `http://127.0.0.1:3001`.

Jika memakai ekstensi VS Code Live Server, biarkan server Node.js tetap berjalan di port 3000 dan buka `http://127.0.0.1:5500/index.html`. Login dan pendaftaran Guru/Siswa akan menggunakan API di port 3000.

## File aplikasi dan data

- `styles.css`: gaya tampilan.
- `app.js`: antarmuka, login, dan pemanggilan API.
- `server.js`: server lokal, autentikasi, dan API.
- `data.json`: database lokal berisi buku, anggota, transaksi, dan akun. File ini dibuat saat data pertama kali disimpan dan tidak disertakan di Git.
- `data.example.json`: data awal kosong yang digunakan saat `data.json` belum tersedia.

Server hanya menerima koneksi dari komputer lokal. Simpan salinan `data.json` secara berkala dan jangan mengunggah atau membagikan file tersebut karena berisi data akun dan anggota.
