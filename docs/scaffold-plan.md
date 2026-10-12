# OpenInject Scaffold Plan — dari Decompile HTTP Custom v7.10.12

> **For Hermes:** Gunakan subagent-driven-development skill untuk implementasi task-by-task.

**Goal:** Dokumentasi fitur yang dapat di-scaffold ke OpenInject berdasarkan analisis decompile APK HTTP Custom, dengan prioritas pada dynamic pool & log viewer di LuCI.

**Architecture:** OpenInject (Go binary) + luci-app-openinject (LuCI JS) + mihomo TUN (fase 1). Referensi: HTTP Custom pakai dex2c (native .so) untuk logic inti, tapi struktur config dan JNI interface terbaca di DEX.

---

## Scaffold Points (dari decompile HC)

### 1. Import `.hc` Config File
- **Sumber:** `hc-unlock-bot/decrypt/pipeline.go` + `keys.go` — decryptor lengkap untuk format .hc v7.x
- **TokenMap** berisi 32 field: payload, proxy, sshField, sni, psiphon, v2rayConfig, dll
- **Fitur:** User import file `.hc` langsung via LuCI, openinject decrypt & parse ke `/etc/openinject.json`
- **Estimasi:** Medium — decryptor sudah ada, tinggal integrasi Go + LuCI upload

### 2. Dynamic Pool Sizing ⬅️ PRIORITAS
- **Sumber:** HC mengelola multiple SSH session secara dinamis (liblitevpn.so + libf2c.so)
- **Sekarang:** OpenInject pool=3 statis (flag `-pool 3`)
- **Fitur:** Auto-scale pool berdasarkan concurrent connection count. Tambah/shrink SSH master sesuai beban.
- **Estimasi:** Small-Medium — modifikasi `ssh.go` + `main.go`

### 3. Log Viewer di LuCI ⬅️ PRIORITAS
- **Sumber:** HC menampilkan log real-time (connection status, SSH events, payload inject, error)
- **Sekarang:** Log hanya via `logread` di terminal
- **Fitur:** Tab "Log" di LuCI yang menampilkan log openinject real-time via rpcd/ubus
- **Estimasi:** Small — rpcd method `getLogs` + LuCI JS view

### 4. Native TUN / Tun2socks (Fase 2)
- **Sumber:** HC pakai `libtun2socks.so` + `libhev-socks5-tunnel.so` untuk TUN→SOCKS5 native
- **Sekarang:** OpenInject pakai mihomo TUN (fase 1, sudah bekerja)
- **Fitur:** OpenInject manage TUN sendiri tanpa mihomo (Go tun2socks atau syscall TUN)
- **Estimasi:** Large — research + implement TUN device di Go

### 5. SlowDNS / DNS Tunneling
- **Sumber:** TokenMap field 28-31: `slowdnsEnabled`, `slowdnsServer`, `slowdnsPublickey`, `dnsResolver`
- **Fitur:** Transport cadangan via DNS tunneling untuk bypass DPI berat
- **Estimasi:** Large — protokol DNS tunnel berbeda dari SSH

### 6. V2Ray/Psiphon Support
- **Sumber:** TokenMap field 14-17, 24-27: `psiphon`, `psiphonPort`, `psiphon2`, `v2rayEnabled`, `v2rayConfig`
- **Fitur:** Multi-protocol support selain SSH
- **Estimasi:** Large — setiap protokol butuh implementasi sendiri

### 7. Config Protection / Lock
- **Sumber:** TokenMap field 2-6, 15, 21: `lockAllConfig`, `blockedByRoot`, `expiryTime`, `noteEnabled`, `notes`, `blockedByHwid`, `blockedByPassword`
- **Fitur:** Config share dengan expiry/HWID lock (untuk komersialisasi)
- **Estimasi:** Medium — crypto + identitas device

---

## Task: Dynamic Pool Sizing

**Objective:** SSH pool auto-scale berdasarkan concurrent connection count.

**Files:**
- Modify: `/home/agentuser/apps/openinject/ssh.go` — tambah `AutoPool` struct
- Modify: `/home/agentuser/apps/openinject/main.go` — replace `Init(static)` dengan `InitAuto(min, max)`
- Modify: `/home/agentuser/apps/openinject/injector.go` — panggil `pool.Grow()` saat concurrent naik

**Approach:**
1. Tambah `concurrent atomic.Int64` counter di `SSHManager`
2. Increment di awal `handleSOCKS`, decrement di akhir
3. Jika `concurrent > threshold * poolSize`, spawn SSH master baru (max cap)
4. Jika `concurrent < threshold * (poolSize-1)`, idle node di-close
5. Default: min=2, max=8, threshold=5 connections per node

**Verification:**
- `speedtest` dengan pool dinamis vs statis
- Log menampilkan `pool grown to N` / `pool shrunk to N`
- `netstat -ant | grep 104.17.3.81 | wc -l` menunjukkan jumlah master berubah

---

## Task: Log Viewer di LuCI

**Objective:** Tab "Log" di LuCI yang menampilkan log openinject real-time.

**Files:**
- Modify: `/home/agentuser/apps/luci-app-openinject/root/usr/libexec/rpcd/luci-openinject` — tambah method `getLogs`
- Modify: `/home/agentuser/apps/luci-app-openinject/htdocs/luci-static/resources/view/openinject/main.js` — tambah tab log
- Modify: `/home/agentuser/apps/openinject/ssh.go` atau `main.go` — write log ke `/tmp/openinject.log` (ring buffer)

**Approach:**
1. OpenInject write log ke `/tmp/openinject.log` (append, max 500 lines, auto-truncate)
2. rpcd method `getLogs`: `tail -n 100 /tmp/openinject.log`
3. LuCI JS: tab kedua "Log" dengan auto-refresh setiap 2 detik via `XHR.get`
4. Format log: `[HH:MM:SS] message` (sama seperti logread, tapi filtered)
5. Log yang ditampilkan: koneksi baru, SSH connect/disconnect, error, pool events

**Verification:**
- Buka LuCI → tab Log → muncul log real-time
- Buka speedtest → log menampilkan koneksi baru masuk
- Log auto-scroll ke bawah

---

## Prioritas Implementasi

1. **Dynamic Pool** — `ssh.go` + `main.go` (Go side)
2. **Log Viewer** — rpcd + LuCI JS (frontend side)
3. (Backlog) Import .hc config
4. (Backlog) Native TUN fase 2
5. (Backlog) SlowDNS
6. (Backlog) V2Ray/Psiphon
7. (Backlog) Config protection
