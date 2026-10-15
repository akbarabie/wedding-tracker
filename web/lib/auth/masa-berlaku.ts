// Lama tautan verifikasi email dan reset kata sandi berlaku, dalam teks untuk pengguna.
// Nilainya harus sama dengan pengaturan Email OTP Expiration di dashboard Supabase
// (Authentication, Providers, Email). Bawaan Supabase adalah 3600 detik, yaitu 1 jam.
// Bila pengaturan di dashboard diubah, ubah juga teks ini dan teks di template email.
export const MASA_BERLAKU_TAUTAN = '1 jam'
