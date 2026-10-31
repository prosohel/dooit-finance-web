'use server';

import { fetchWithAuth } from '@/services/serverApi';

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

// ── Devices ───────────────────────────────────────────────────────────────────

export async function getDevices(params = {}) {
  const res = await fetchWithAuth(`devices${qs(params)}`);
  return res.json();
}

export async function getMyDevices() {
  const res = await fetchWithAuth('devices/me');
  return res.json();
}

export async function getDeviceById(id) {
  const res = await fetchWithAuth(`devices/${id}`);
  return res.json();
}

export async function updateDeviceTrust(id, payload) {
  const res = await fetchWithAuth(`devices/${id}/trust`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Audit activity ────────────────────────────────────────────────────────────

export async function getAuditActivity(params = {}) {
  const res = await fetchWithAuth(`audit${qs(params)}`);
  return res.json();
}

export async function getAuditSummary() {
  const res = await fetchWithAuth('audit/summary');
  return res.json();
}
