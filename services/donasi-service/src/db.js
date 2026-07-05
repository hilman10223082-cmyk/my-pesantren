// db.js
// "Database-per-service" sederhana berbasis file JSON (lihat SRS 6.1).
// Setiap microservice punya basis datanya sendiri dan TIDAK PERNAH
// mengakses file data service lain secara langsung — satu-satunya cara
// bertukar data adalah lewat REST API (API Gateway) atau message broker.
//
// Catatan: untuk produksi, ganti implementasi ini dengan PostgreSQL/MongoDB
// per service tanpa mengubah kontrak fungsi (read/write/all) di bawah.

const fs = require('fs');
const path = require('path');

function createStore(fileName) {
  const filePath = path.join(__dirname, '..', '..', '..', 'data', fileName);

  function ensureFile() {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
  }

  function all() {
    ensureFile();
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  function save(records) {
    ensureFile();
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
  }

  function insert(record) {
    const records = all();
    const withId = { id: record.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...record };
    records.push(withId);
    save(records);
    return withId;
  }

  function update(id, patch) {
    const records = all();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    records[idx] = { ...records[idx], ...patch };
    save(records);
    return records[idx];
  }

  function findBy(predicate) {
    return all().filter(predicate);
  }

  return { all, insert, update, findBy };
}

module.exports = { createStore };
