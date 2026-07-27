/**
 * Client form <-> Firestore data mapping (mirror of blockForm.js).
 * Form fields are strings (bound to inputs); data fields are typed ('' → null).
 */

export function createEmptyClientForm() {
  return {
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    heightCm: '',
    dietaryNotes: '',
    notes: '',
  }
}

export function clientToForm(client) {
  return {
    name: client.name || '',
    email: client.email || '',
    phone: client.phone || '',
    birthDate: client.birthDate || '',
    heightCm: client.heightCm != null ? String(client.heightCm) : '',
    dietaryNotes: client.dietaryNotes || '',
    notes: client.notes || '',
  }
}

export function formToClientData(form) {
  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    birthDate: form.birthDate || null,
    heightCm: form.heightCm !== '' ? Number(form.heightCm) : null,
    dietaryNotes: form.dietaryNotes.trim() || null,
    notes: form.notes.trim() || null,
  }
}
