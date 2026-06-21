/**
 * VendorBridge Email Service
 * Uses Nodemailer with Ethereal (auto test-account) for development.
 * Replace createTestAccount() + transport with real SMTP for production.
 */
const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 to prevent ENETUNREACH errors on servers without IPv6 routing (like Render)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('\n📧 Using production SMTP settings:', process.env.SMTP_HOST);
    
    // PERMANENT FIX: Resolve IPv4 manually because Render blocks outbound IPv6
    const { promises: dnsPromises } = require('dns');
    const { address } = await dnsPromises.lookup(process.env.SMTP_HOST, { family: 4 });

    _transporter = nodemailer.createTransport({
      host: address, // Connect directly to the IPv4 address
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        servername: process.env.SMTP_HOST // Keep TLS happy by sending the real hostname
      }
    });
    return _transporter;
  }

  // Auto-create a free Ethereal test account (no config needed for dev).
  // Every email generates a preview URL logged to the console.
  const testAccount = await nodemailer.createTestAccount();
  console.log('\\n📧 Ethereal email account ready (DEVELOPMENT MODE):');
  console.log('   User:', testAccount.user);
  console.log('   Pass:', testAccount.pass);
  console.log('   Preview emails at: https://ethereal.email/login\\n');

  _transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  return _transporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base HTML shell
// ─────────────────────────────────────────────────────────────────────────────
function base(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;background:#F7F6F2;color:#121212}
.wrap{max-width:600px;margin:40px auto;padding:0 20px 60px}
.card{background:#fff;border:1.5px solid #E7E5DE;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px -14px rgba(18,18,18,.14)}
.hdr{background:#121212;padding:26px 34px;display:flex;align-items:center;gap:14px}
.hdr-logo{width:42px;height:42px;border-radius:10px;background:#fff;color:#121212;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:21px;line-height:1;flex:none}
.hdr-txt b{display:block;font-size:17px;font-weight:800;letter-spacing:-.02em;color:#fff}
.hdr-txt span{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.bdy{padding:34px 36px}
.badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;border-radius:999px;padding:5px 13px;margin-bottom:18px}
.badge-red{background:#FBEAE7;color:#E11900}
.badge-green{background:#E7F4EC;color:#0B8A4B}
.badge-amber{background:#F8EEDF;color:#B45309}
h1{font-size:23px;font-weight:800;letter-spacing:-.02em;color:#121212;margin-bottom:12px;line-height:1.25}
p{font-size:14.5px;color:#71706A;line-height:1.75;margin-bottom:14px}
p b{color:#121212}
.box{background:#F7F6F2;border:1.5px solid #E7E5DE;border-radius:14px;padding:20px 22px;margin:22px 0}
.row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px dotted #E7E5DE;font-size:13.5px;gap:12px}
.row:last-child{border:none;padding-bottom:0}
.lbl{font-weight:700;color:#A3A29B;font-size:10px;letter-spacing:.12em;text-transform:uppercase;flex:none}
.val{font-weight:700;color:#121212;text-align:right}
.chain{display:flex;margin:18px 0}
.chain span{font-size:10.5px;font-weight:700;letter-spacing:.1em;padding:7px 12px;border:1.5px solid #E7E5DE;background:#fff;color:#121212}
.chain span:first-child{border-radius:999px 0 0 999px}
.chain span:last-child{border-radius:0 999px 999px 0;background:#121212;color:#fff;border-color:#121212}
.chain span+span{margin-left:-1.5px}
.cta{display:inline-block;background:#121212;color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;margin:10px 0 24px;letter-spacing:-.01em}
.otp-box{font-size:38px;font-weight:900;letter-spacing:.18em;color:#E11900;font-family:'Courier New',monospace;text-align:center;background:#FBEAE7;border-radius:14px;padding:18px 24px;margin:22px 0;border:1.5px dashed #E11900}
.warning{background:#FBEAE7;border:1.5px solid #F3C5BD;border-radius:12px;padding:14px 18px;font-size:13px;color:#E11900;margin-top:18px}
.ftr{padding:22px 36px;background:#FBFAF7;border-top:1.5px solid #E7E5DE;font-size:12px;color:#A3A29B;line-height:1.65}
.ftr b{color:#71706A}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <div class="hdr-logo">V</div>
      <div class="hdr-txt">
        <b>VendorBridge</b>
        <span>Procurement ERP</span>
      </div>
    </div>
    <div class="bdy">${body}</div>
    <div class="ftr">
      This email was sent by <b>VendorBridge Procurement ERP</b>.<br>
      If you did not take this action, you can safely ignore this email.<br><br>
      <span style="color:#C5C3BB">© ${new Date().getFullYear()} VendorBridge · All rights reserved</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role helpers
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_ICONS = { officer: '📋', manager: '✅', vendor: '🏭', admin: '⚙️' };
const ROLE_ACCESS = {
  officer: 'Create RFQs · Compare Quotes · POs · Invoices',
  manager: 'Approvals · RFQ Overview · Reports',
  vendor: 'RFQ Invitations · Submit Quotes · Track POs',
  admin: 'Full System Access · Users · Audit Logs',
};
const ROLE_DESC = {
  officer: 'You can create and manage Requests for Quotation, compare vendor quotations side-by-side, generate Purchase Orders, and process GST invoices through the full procurement lifecycle.',
  manager: 'You can review and approve procurement requests, oversee the approval workflow, and access comprehensive spending reports and analytics.',
  vendor: 'You can respond to RFQ invitations from VendorBridge Corp, submit competitive quotations, and track the status of your Purchase Orders in real time.',
  admin: 'You have full administrative access — manage all users, vendors, system settings and audit logs across the entire VendorBridge platform.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Welcome email (sent on signup)
// ─────────────────────────────────────────────────────────────────────────────
async function sendWelcomeEmail({ to, name, role, label }) {
  const icon = ROLE_ICONS[role] || '👤';
  const now = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });

  const body = `
    <div class="badge badge-red">✓ Account Activated</div>
    <h1>Welcome to VendorBridge,<br>${name.split(' ')[0]}!</h1>
    <p>Your <b>VendorBridge Procurement ERP</b> account has been successfully created and is ready to use. Here are your account details:</p>

    <div class="box">
      <div class="row"><span class="lbl">Full Name</span><span class="val">${name}</span></div>
      <div class="row"><span class="lbl">Email</span><span class="val">${to}</span></div>
      <div class="row"><span class="lbl">Position</span><span class="val">${icon} ${label}</span></div>
      <div class="row"><span class="lbl">Access Level</span><span class="val">${ROLE_ACCESS[role] || 'Standard Access'}</span></div>
      <div class="row"><span class="lbl">Account Since</span><span class="val">${now}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val" style="color:#0B8A4B">● Active &amp; Ready</span></div>
    </div>

    <p>${ROLE_DESC[role] || 'Access the VendorBridge platform to manage your procurement workflow.'}</p>

    <p>Your complete procurement pipeline, from end to end:</p>
    <div class="chain">
      <span>RFQ</span><span>QUOTE</span><span>COMPARE</span><span>APPROVE</span><span>PO</span><span>INVOICE ✓</span>
    </div>

    <a class="cta" href="http://localhost:5173">Open VendorBridge →</a>

    <p style="font-size:13px;color:#A3A29B">If you have any questions or need help getting started, contact your system administrator.</p>
  `;

  return _send({
    to,
    subject: `Welcome to VendorBridge — ${label} Account Activated 🎉`,
    html: base('Welcome to VendorBridge', body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Forgot-password OTP email
// ─────────────────────────────────────────────────────────────────────────────
async function sendOtpEmail({ to, otp }) {
  const formatted = otp.slice(0, 3) + ' ' + otp.slice(3); // e.g. "428 916"

  const body = `
    <div class="badge badge-amber">🔐 Password Reset</div>
    <h1>Reset Your Password</h1>
    <p>We received a request to reset the password for your <b>VendorBridge</b> account associated with <b>${to}</b>.</p>
    <p>Enter the 6-digit code below in the app to proceed:</p>

    <div class="otp-box">${formatted}</div>

    <p>This code is valid for <b>10 minutes</b>. Do not share it with anyone.</p>

    <div class="warning">
      ⚠️ <b>Didn't request this?</b><br>
      If you did not request a password reset, ignore this email. Your password will not change.
    </div>
  `;

  return _send({
    to,
    subject: 'VendorBridge — Your Password Reset Code',
    html: base('Password Reset Code', body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Password-updated notification email
// ─────────────────────────────────────────────────────────────────────────────
async function sendPasswordUpdatedEmail({ to, name }) {
  const now = new Date().toLocaleString('en-IN', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  });

  const body = `
    <div class="badge badge-green">✓ Password Updated</div>
    <h1>Your Password Has Been Changed</h1>
    <p>Hi <b>${name}</b>, this is a confirmation that the password for your VendorBridge account was successfully updated.</p>

    <div class="box">
      <div class="row"><span class="lbl">Account</span><span class="val">${to}</span></div>
      <div class="row"><span class="lbl">Changed On</span><span class="val">${now}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val" style="color:#0B8A4B">✓ Secured</span></div>
    </div>

    <p>You can now sign in with your new password.</p>
    <a class="cta" href="http://localhost:5173">Sign in to VendorBridge →</a>

    <div class="warning">
      ⚠️ <b>Didn't change your password?</b><br>
      If you did not make this change, contact your system administrator immediately and secure your account.
    </div>
  `;

  return _send({
    to,
    subject: 'VendorBridge — Your Password Has Been Updated',
    html: base('Password Updated', body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal send helper
// ─────────────────────────────────────────────────────────────────────────────
async function _send({ to, subject, html }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"VendorBridge ERP" <noreply@vendorbridge.in>',
      to, subject, html,
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`\n📧 Email preview → ${preview}\n`);
    return { ok: true, messageId: info.messageId, preview };
  } catch (err) {
    console.error('❌ Email error:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendWelcomeEmail, sendOtpEmail, sendPasswordUpdatedEmail };
