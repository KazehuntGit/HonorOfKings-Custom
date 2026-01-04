
// Menggunakan LocalStorage sebagai penyimpanan utama karena batas ukuran Cookie (4KB) 
// terlalu kecil untuk menyimpan data roster dan match history lengkap.
// Nama fungsi tetap dipertahankan untuk menjaga kompatibilitas dengan App.tsx.

export const setCookie = (name: string, value: string, days = 30) => {
  try {
    localStorage.setItem(name, value);
  } catch (e) {
    console.error("Failed to save to LocalStorage", e);
  }
};

export const getCookie = (name: string): string | null => {
  try {
    return localStorage.getItem(name);
  } catch (e) {
    return null;
  }
};

export const eraseCookie = (name: string) => {
  try {
    localStorage.removeItem(name);
  } catch (e) {
    console.error("Failed to remove from LocalStorage", e);
  }
};
