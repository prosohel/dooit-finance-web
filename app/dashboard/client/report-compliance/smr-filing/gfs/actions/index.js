'use server'

import { fetchWithAuth } from '@/services/serverApi';
import { draftCaseReport } from '@/app/dashboard/client/monitoring-and-cases/case-manager/actions';

export const createGFS = async (formData) => {
  const response = await fetchWithAuth('gfs-report/new', {
    method: 'POST',
    body: JSON.stringify(formData)
  })
  return response.json();
}

export const updateGFS = async (formData) => {
  const { id, ...data } = formData;
  console.log('formdata', id)
  const response = await fetchWithAuth(`gfs-report/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return response.json();
}
export const getGFSById = async (id) => {
  const response = await fetchWithAuth(`gfs-report/${id}`);
  return response.json();
}

export const getGFSList = async () => {
  const response = await fetchWithAuth('gfs-report');
  return response.json();
}

// Draft this case's GFS — our activity figures, counterparties and evidence
// plus the AI's suspicion summary. Returns OUR GFS document.
export const draftGfsReport = async (ref, opts) => draftCaseReport(ref, 'gfs', opts)