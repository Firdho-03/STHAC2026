require('dotenv').config();
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.initTransporter();
  }

  initTransporter() {
    this.smtpUser = (process.env.SMTP_USER || '').trim();
    this.smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, ''); // Hapus spasi pada App Password
    this.showSim = (process.env.SHOW_OTP_SIMULATION || 'false').toLowerCase() === 'true';

    if (
      this.smtpUser &&
      this.smtpPass &&
      this.smtpPass !== 'isi_16_digit_app_password_disini'
    ) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass
        }
      });
    } else {
      this.transporter = null;
    }
  }

  async sendOtpEmail(toEmail, nama, otpCode, purpose = 'LOGIN') {
    this.initTransporter(); // Reload jika .env baru diubah
    const title = purpose === 'REGISTER'
      ? 'Verifikasi Pendaftaran Panitia STHAC 2026'
      : 'Kode Login Sekali Pakai (OTP) Panel Panitia STHAC';

    console.log('==========================================================');
    console.log(`📧 [OTP ${purpose}] Tujuan : ${toEmail} (${nama})`);
    console.log(`🔑 KODE OTP               : ${otpCode}`);
    console.log('==========================================================');

    // Jika SMTP belum diisi dengan benar, berikan peringatan jelas
    if (!this.transporter) {
      console.warn('⚠️  [PERINGATAN] SMTP_USER / SMTP_PASS di file .env belum diisi App Password Gmail!');
      return {
        sentViaSmtp: false,
        demoOtp: otpCode,
        message: 'Mode lokal (SMTP belum diatur di .env)'
      };
    }

    // Kirim email sungguhan ke Inbox penerima
    await this.transporter.sendMail({
      from: `"Panitia STHAC 2026" <${this.smtpUser}>`,
      to: toEmail,
      subject: `[${otpCode}] ${title}`,
      html: `
        <div style="font-family:'Inter',Arial,sans-serif;background:#03130C;color:#F2E0AC;padding:32px;border-radius:16px;border:1px solid #D9B45C;max-width:520px;margin:auto;">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="https://media.vibecoder.co.id/app-media/ilham/south-tangerang-hacup/230836bd-5988-4bad-8ea9-c1eda8d6d2c4.png" alt="STHAC" style="width:64px;height:64px;object-fit:contain;" />
            <h2 style="color:#D9B45C;margin:10px 0 4px 0;text-transform:uppercase;letter-spacing:1px;">SOUTH TANGERANG HORSEBACK ARCHERY CUP</h2>
            <small style="color:#94a3b8;">Sistem Keamanan One-Time Password (OTP)</small>
          </div>
          <p style="color:#e2e8f0;font-size:14px;line-height:1.6;">Halo <strong>${nama}</strong>,</p>
          <p style="color:#e2e8f0;font-size:14px;line-height:1.6;">Berikut adalah kode unik sekali pakai (OTP) Anda untuk <strong>${title}</strong>:</p>
          <div style="background:#082016;border:2px dashed #D9B45C;padding:18px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px;color:#F2E0AC;border-radius:12px;margin:24px 0;">
            ${otpCode}
          </div>
          <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;">
            * Kode ini hanya berlaku selama <strong>5 menit</strong> dan otomatis hangus setelah digunakan satu kali.<br/>
            * Jangan bagikan kode rahasia ini kepada siapa pun.
          </p>
        </div>
      `
    });

    console.log(`✅ [SMTP BERHASIL] Email OTP resmi telah dikirim ke kotak masuk ${toEmail}`);
    return {
      sentViaSmtp: true,
      demoOtp: this.showSim ? otpCode : null
    };
  }
}

module.exports = new EmailService();