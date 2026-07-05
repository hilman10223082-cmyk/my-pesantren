# My Pesantren

Aplikasi pendukung administrasi dan akademik pesantren, dibangun dengan
arsitektur **microservices terdistribusi** sesuai *Software Requirements
Specification (SRS) v1.0* — Mata Kuliah Pemrosesan Data Terdistribusi.

Sistem terdiri atas 5 modul utama yang berjalan sebagai layanan independen
dengan basis data masing-masing (*database-per-service*): **Presensi**,
**Pembayaran**, **Perizinan**, **Tahfidz**, dan **Donasi**.

> Status: implementasi awal/prototipe untuk keperluan UAS. Lihat bagian
> [Batasan Implementasi](#batasan-implementasi--tbd) untuk hal-hal yang
> masih disederhanakan dibanding rencana produksi di SRS.

## Arsitektur

```
        [ Aplikasi Wali Santri ]     [ Aplikasi Pengurus ]
                     \\                    /
                      \\                  /
                     [      API Gateway      ]
                                |
   -----------------------------------------------------------
   |          |            |            |            |
[Presensi] [Pembayaran] [Perizinan] [Tahfidz]     [Donasi]
   |          |            |            |            |
 [DB1]      [DB2]        [DB3]        [DB4]        [DB5]
   -----------------------------------------------------------
                                |
                    [ Message Broker (RabbitMQ) ]
                                |
                      [ Notifikasi Service ]
```

Prinsip desain (mengikuti SRS Bab 6):

| Aspek | Penerapan |
|---|---|
| **Distribusi data** (6.1) | Functional partitioning — setiap modul punya basis data sendiri (`data/<modul>.json`), tidak saling akses langsung |
| **Replikasi & konsistensi** (6.2) | Pembayaran = strong consistency (tulis ke store utama + backup secara sinkron sebelum respons dikirim). Presensi & Tahfidz = eventual consistency |
| **Sharding** (6.3) | Setiap record membawa `id_pesantren` sebagai partition key, disiapkan untuk skenario multi-tenant |
| **Message broker** (6.4) | RabbitMQ (topic exchange `mypesantren.events`) untuk komunikasi asinkron non-blocking antar layanan |
| **Fault isolation** (NFR-03) | Kegagalan satu service/broker tidak menjatuhkan service lain — API Gateway mengembalikan `503` untuk service yang down tanpa crash |

## Struktur Folder

```
my-pesantren/
├── api-gateway/                 # Single entry point, proxy ke semua service
│   ├── src/index.js
│   ├── Dockerfile
│   └── package.json
├── services/
│   ├── presensi-service/        # FR-01, FR-02, FR-03
│   ├── pembayaran-service/      # FR-04, FR-05, FR-06
│   ├── perizinan-service/       # FR-07, FR-08, FR-09
│   ├── tahfidz-service/         # FR-10, FR-11
│   ├── donasi-service/          # FR-12, FR-13
│   └── notifikasi-service/      # Consumer event -> simulasi FCM/WhatsApp API
│       └── src/
│           ├── index.js
│           ├── routes.js        # (tidak ada di tahfidz/donasi — tanpa event)
│           ├── db.js            # file-based store per service
│           └── broker.js        # wrapper RabbitMQ (amqplib), fail-soft
├── data/                        # Basis data tiap service (file JSON, di-gitignore)
├── docs/                        # Dokumen pendukung (letakkan SRS di sini)
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Menjalankan Proyek

### Opsi A — Docker Compose (direkomendasikan)

Membutuhkan Docker & Docker Compose terpasang.

```bash
docker-compose up --build
```

Ini akan menjalankan RabbitMQ, keenam service, dan API Gateway di
`http://localhost:4000`. Management UI RabbitMQ ada di
`http://localhost:15672` (guest/guest).

### Opsi B — Manual (per service, tanpa Docker)

Setiap service adalah proyek Node.js berdiri sendiri.

```bash
# 1. Jalankan RabbitMQ secara lokal (atau lewat Docker saja):
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine

# 2. Install & jalankan tiap service (buka terminal terpisah untuk masing-masing)
cd services/presensi-service   && npm install && npm start   # port 4001
cd services/pembayaran-service && npm install && npm start   # port 4002
cd services/perizinan-service  && npm install && npm start   # port 4003
cd services/tahfidz-service    && npm install && npm start   # port 4004
cd services/donasi-service     && npm install && npm start   # port 4005
cd services/notifikasi-service && npm install && npm start   # port 4006
cd api-gateway                 && npm install && npm start   # port 4000
```

> Catatan: proses pembuatan repo ini dilakukan di lingkungan sandbox tanpa
> akses jaringan, sehingga `npm install` dan eksekusi end-to-end **belum
> sempat dijalankan/diverifikasi di sini**. Struktur kode dan dependency
> sudah lengkap di setiap `package.json` — jalankan langkah di atas di
> mesin kamu untuk memverifikasi.

## Referensi API (lewat API Gateway, `http://localhost:4000`)

### Presensi — `/api/presensi`
| Method | Endpoint | Keterangan | FR |
|---|---|---|---|
| POST | `/api/presensi` | Catat kehadiran `{id_santri, tanggal, status, kelas}` | FR-01, FR-02 |
| GET | `/api/presensi?id_santri=` | Daftar presensi | — |
| GET | `/api/presensi/rekap/:bulan` | Rekap bulanan (format `YYYY-MM`) | FR-03 |

### Pembayaran — `/api/pembayaran`
| Method | Endpoint | Keterangan | FR |
|---|---|---|---|
| POST | `/api/pembayaran` | Catat transaksi `{id_santri, nominal, metode}` (strong consistency + replikasi backup) | FR-04, FR-05 |
| GET | `/api/pembayaran/riwayat/:id_santri` | Riwayat transaksi santri | FR-06 |

### Perizinan — `/api/perizinan`
| Method | Endpoint | Keterangan | FR |
|---|---|---|---|
| POST | `/api/perizinan` | Ajukan izin `{id_santri, jenis_izin, keterangan}` | FR-07 |
| PUT | `/api/perizinan/:id/keputusan` | Setujui/tolak `{keputusan: "disetujui"|"ditolak"}` | FR-08, FR-09 |
| GET | `/api/perizinan?id_santri=` | Daftar pengajuan izin | — |

### Tahfidz — `/api/tahfidz`
| Method | Endpoint | Keterangan | FR |
|---|---|---|---|
| POST | `/api/tahfidz` | Catat setoran `{id_santri, surah, jumlah_ayat, verified_by}` | FR-10 |
| GET | `/api/tahfidz/rekap/:id_santri?hanya_terverifikasi=true` | Rekap hafalan (untuk beasiswa/seleksi) | FR-11 |

### Donasi — `/api/donasi`
| Method | Endpoint | Keterangan | FR |
|---|---|---|---|
| POST | `/api/donasi` | Catat donasi `{nama_donatur, nominal, peruntukan, anonim}` | FR-12 |
| GET | `/api/donasi/laporan` | Laporan transparansi donasi | FR-13 |

### Notifikasi — `/api/notifikasi`
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/notifikasi` | Log notifikasi yang sudah "terkirim" (simulasi FCM/WhatsApp) |

## Batasan Implementasi & TBD

Sesuai Appendix C pada SRS, dan penyederhanaan yang sengaja dibuat agar
prototipe ini mudah dijalankan tanpa infrastruktur berat:

- **Payment gateway** belum diintegrasikan dengan penyedia sungguhan (TBD-1) — endpoint pembayaran saat ini langsung menandai transaksi `berhasil`.
- **Basis data** memakai file JSON per service sebagai simulasi *database-per-service*, bukan PostgreSQL/MongoDB sungguhan. Kontrak fungsi di `db.js` (`insert/update/findBy/all`) dirancang agar mudah diganti ke DB asli tanpa mengubah `routes.js`.
- **Kebijakan retensi data** (TBD-2) dan **disaster recovery lintas region** (TBD-3) belum diimplementasikan.
- Autentikasi & *role-based access control* (NFR-05) belum diterapkan — perlu ditambahkan sebelum dipakai lebih dari sekadar demo.
- Enkripsi in-transit disarankan lewat TLS di reverse proxy/ingress saat deploy (NFR-04); belum dikonfigurasi di compose file ini.

## Lisensi

Proyek tugas akademik — Mata Kuliah Pemrosesan Data Terdistribusi.
