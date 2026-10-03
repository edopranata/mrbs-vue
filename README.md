# MRBS Frontend — Meeting Room Booking System

Aplikasi web (SPA) untuk pemesanan ruang rapat kantor, dibangun dengan **Vue 3**, **Vite**,
**Pinia**, **Vue Router**, dan **Tailwind CSS 4**. Backend (Laravel API) ada di repository
terpisah: [edopranata/mrbs-backend](https://github.com/edopranata/mrbs-backend).

## Fitur

- **Dashboard**: status setiap ruangan saat ini (kosong/dipakai), booking saya berikutnya, dan
  statistik pemakaian ruangan untuk admin.
- **Jadwal Ruangan** dengan tampilan Hari, Minggu, dan Bulan (lihat di bawah).
- **Buat booking** dengan cek ketersediaan real-time setiap ruangan, jenis rapat
  (Internal/Eksternal), dan **booking berulang mingguan**.
- **Booking Saya**: daftar booking mendatang, riwayat, dan yang dibatalkan.
- **Ruangan**: daftar ruang rapat per lantai beserta kapasitas & fasilitas.
- **Admin**: **Semua Booking** (pantauan booking hari ini yang sedang berlangsung & akan datang,
  diperbarui otomatis), manajemen ruangan & user.
- **System Admin**: menu **Pengaturan** (nama aplikasi, jam operasional, interval slot, aturan
  booking).
- Tampilan responsif (desktop sampai HP) dengan animasi halus; animasi otomatis dimatikan bila
  *reduce motion* aktif di sistem operasi.

## Halaman Jadwal Ruangan

- **Hari**: kolom = ruangan (`NAMA [Lt X] (kapasitas)`), baris = slot 30 menit.
  **Klik** slot kosong untuk membuka dialog *Buat Booking* (durasi default 1 jam), atau
  **seret (drag)** beberapa slot untuk memilih rentang jam sekaligus. Di HP/tablet cukup tap.
- **Minggu**: satu ruangan, kolom = 7 hari (Minggu–Sabtu). Pilih ruangan lewat dropdown.
- **Bulan**: kalender bulanan, bisa difilter per ruangan. Klik tanggal untuk membuka tampilan hari.
- Kalender kecil di kiri (2 bulan) untuk lompat ke tanggal tertentu.
- Warna blok menunjukkan jenis rapat: **Internal** (hijau) dan **Eksternal** (toska). Booking
  milik Anda diberi bingkai ungu. Slot yang sudah lewat diarsir dan tidak bisa dipilih.

## Menjalankan di lokal

Kebutuhan: Node.js ≥ 20 dan backend [mrbs-backend](https://github.com/edopranata/mrbs-backend)
yang berjalan di `http://127.0.0.1:8000`.

```bash
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

Saat development, Vite meneruskan request `/api/*` ke backend, jadi tidak perlu konfigurasi CORS.

| Variabel | Default | Keterangan |
|---|---|---|
| `VITE_BACKEND_URL` | `http://127.0.0.1:8000` | Tujuan proxy `/api` saat `npm run dev` |
| `VITE_API_URL` | `/api` | Base URL API yang dipanggil browser. Isi URL lengkap bila backend berada di domain lain, misal `https://api.domain-anda/api` |

## Akun default

Login memakai **username** (tidak peka huruf besar/kecil), bukan email.

| Level | Username | Password |
|---|---|---|
| System Admin | `sysadmin` | `password` |
| Admin | `admin` | `password` |
| User | `user` | `password` |

> **Ganti password akun-akun ini** (menu Profil) sebelum aplikasi dipakai di kantor. Menjalankan
> ulang seeder tidak menimpa akun yang sudah ada.

## Aplikasi terpasang (PWA)

Aplikasi bisa di-install di desktop (Chrome/Edge) dan HP:

- **Android / desktop**: tombol **Install Aplikasi** di sidebar atau halaman login (atau ikon install
  di address bar browser).
- **iPhone / iPad**: buka di Safari → **Bagikan** → **Tambah ke Layar Utama** (tombol di aplikasi
  menampilkan langkahnya).

Cara kerja:

- `sw.js` dibuat otomatis saat build (template `pwa/sw-template.js`, plugin `mrbsServiceWorker` di
  `vite.config.js`). Tampilan aplikasi (HTML, JS, CSS, ikon) disimpan di perangkat, sedangkan request
  `/api` **selalu** ke server sehingga data jadwal tidak pernah usang.
- Saat koneksi ke server terputus, aplikasi tetap terbuka dan menampilkan pemberitahuan; pengguna
  tidak di-logout.
- Setelah deploy, aplikasi menampilkan **"Versi baru tersedia → Muat ulang"**.
- Service worker hanya aktif pada hasil build (bukan `npm run dev`) dan butuh HTTPS (kecuali localhost).
- Ikon ada di `public/icons/`. Pada build Laravel, manifest disajikan backend di
  `/manifest.webmanifest` sehingga nama aplikasi mengikuti menu Pengaturan.

## Build ke backend Laravel (satu domain)

```bash
npm run build:laravel       # hasil build -> ../backend/public/app
```

Aset dimuat dari `/app/…`, sedangkan URL halaman tetap di root (`/`, `/jadwal`, …). Backend
[mrbs-backend](https://github.com/edopranata/mrbs-backend) sudah menyiapkan route dan `.htaccess`
agar semua URL halaman menampilkan `public/app/index.html`. Folder tujuan bisa diubah lewat
`LARAVEL_APP_DIR` di `.env`.

## Build & deploy

```bash
npm run build               # hasil di folder dist/
```

Sajikan folder `dist` sebagai static site. Semua path yang tidak dikenal harus di-*fallback* ke
`index.html` (SPA history mode). Contoh Nginx bila frontend dan API berada di domain yang sama:

```nginx
server {
    server_name mrbs.kantor.co.id;
    root /var/www/mrbs-vue/dist;

    location /api {
        root /var/www/mrbs-backend/public;
        try_files $uri /index.php?$query_string;
    }
    location ~ ^/index\.php$ {
        root /var/www/mrbs-backend/public;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location / {
        try_files $uri /index.html;
    }
}
```

## Struktur kode penting

```
src/
  components/TimeGrid.vue             # grid jam × ruangan/hari, klik & seret untuk booking
  components/MonthView.vue            # kalender bulanan
  components/MiniCalendar.vue         # kalender kecil di sisi kiri jadwal
  components/BookingFormModal.vue     # form booking, cek ketersediaan, booking berulang
  components/BookingDetailModal.vue   # detail, ubah, batalkan (satu / seri), hapus
  views/                              # halaman (dashboard, jadwal, booking saya, ruangan, profil)
  views/admin/                        # semua booking, manajemen user, pengaturan
  stores/                             # Pinia: auth, settings, ui, bookingModal
  router/index.js                     # guard login, level admin & system admin
  lib/                                # klien API (axios), format tanggal, animasi
```
