import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOGO = "https://vojhptlreurutrzftatn.supabase.co/storage/v1/object/public/staff-photos/school-logo.png";
const SCHOOL = "St. Mary's High School";
const MOTTO = "Excellence & Integrity";

async function sendSingle(gmailEmail: string, gmailAppPassword: string, to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: gmailEmail, password: gmailAppPassword },
    },
  });
  await client.send({
    from: `${SCHOOL} <${gmailEmail}>`,
    to,
    subject,
    html,
  });
  await client.close();
}

async function sendWithRetry(gmailEmail: string, gmailAppPassword: string, to: string, subject: string, html: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await sendSingle(gmailEmail, gmailAppPassword, to, subject, html);
      return;
    } catch (e) {
      console.error(`SMTP attempt ${attempt + 1} failed for ${to}:`, e);
      if (attempt === retries) throw e;
      // Wait before retry (500ms, 1000ms)
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

async function sendEmail(gmailEmail: string, gmailAppPassword: string, to: string | string[], subject: string, html: string) {
  if (Array.isArray(to)) {
    let sent = 0, failed = 0;
    for (const addr of to) {
      try {
        await sendWithRetry(gmailEmail, gmailAppPassword, addr, subject, html);
        sent++;
      } catch { failed++; }
    }
    return { sent, failed };
  } else {
    await sendWithRetry(gmailEmail, gmailAppPassword, to, subject, html);
    return { sent: 1, failed: 0 };
  }
}

// Build email - keep lines SHORT to avoid =20 quoted-printable encoding
function wrap(content: string): string {
  const yr = new Date().getFullYear();
  return [
    '<!DOCTYPE html><html><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width">',
    '</head><body style="margin:0;padding:0;',
    'background:#f4f6f9;',
    'font-family:Arial,sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0"',
    ' style="background:#f4f6f9;padding:40px 20px;">',
    '<tr><td align="center">',
    '<table width="600" cellpadding="0" cellspacing="0"',
    ' style="background:#fff;border-radius:16px;',
    'overflow:hidden;',
    'box-shadow:0 4px 24px rgba(0,0,0,0.08);">',
    // Header
    '<tr><td style="background:#0a3d62;',
    'padding:30px 40px 24px;text-align:center;">',
    `<img src="${LOGO}" alt="Logo"`,
    ' width="80" height="80"',
    ' style="display:block;margin:0 auto 12px;',
    'border-radius:50%;',
    'border:3px solid rgba(255,255,255,0.3);',
    'object-fit:cover;" />',
    `<h1 style="color:#fff;font-size:22px;`,
    'font-weight:700;margin:0 0 4px;">',
    `${SCHOOL}</h1>`,
    `<p style="color:#b8d4e8;font-size:13px;`,
    `font-style:italic;margin:0;">${MOTTO}</p>`,
    '</td></tr>',
    // Color bar
    '<tr><td style="height:4px;',
    'background:linear-gradient(90deg,',
    '#e74c3c,#f39c12,#27ae60,#3498db);',
    '"></td></tr>',
    // Content
    '<tr><td style="padding:40px;">',
    content,
    '</td></tr>',
    // Footer
    '<tr><td style="background:#f8f9fa;',
    'padding:24px 40px;text-align:center;',
    'border-top:1px solid #eee;">',
    `<p style="color:#999;font-size:12px;`,
    `margin:0 0 4px;">&copy; ${yr} ${SCHOOL}</p>`,
    `<p style="color:#bbb;font-size:11px;`,
    `margin:0;font-style:italic;">${MOTTO}</p>`,
    '<p style="color:#ccc;font-size:10px;',
    'margin:8px 0 0;">',
    'Automated message. Do not reply.</p>',
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('\n');
}

function otpContent(otp: string, name?: string): string {
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Email Verification</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 8px;',
    'text-align:center;">',
    name ? `Hello <strong>${name}</strong>,` : 'Hello,',
    '</p>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `Use the code below to complete your registration.`,
    '</p>',
    // OTP display box
    '<div style="background:#0a3d62;',
    'border-radius:16px;padding:32px;',
    'text-align:center;',
    'max-width:320px;margin:0 auto 16px;">',
    '<p style="color:#b8d4e8;font-size:13px;',
    'margin:0 0 12px;letter-spacing:1px;',
    'text-transform:uppercase;">',
    'Verification Code</p>',
    '<p style="color:#fff;font-size:42px;',
    'font-weight:800;letter-spacing:12px;',
    `margin:0;font-family:monospace;">${otp}</p>`,
    '</div>',
    // Copyable code
    '<div style="text-align:center;margin:0 0 24px;">',
    '<p style="color:#888;font-size:12px;',
    'margin:0 0 6px;">',
    'Select and copy the code below:</p>',
    '<table cellpadding="0" cellspacing="0"',
    ' style="margin:0 auto;">',
    '<tr><td style="background:#f8f9fa;',
    'border:2px dashed #0a3d62;',
    'border-radius:8px;padding:12px 28px;">',
    '<span style="font-family:monospace;',
    'font-size:28px;font-weight:800;',
    'letter-spacing:8px;color:#0a3d62;">',
    `${otp}</span>`,
    '</td></tr></table>',
    '</div>',
    // Warning
    '<div style="background:#fff8e1;',
    'border:1px solid #ffe082;',
    'border-radius:12px;padding:16px;',
    'margin-bottom:24px;">',
    '<p style="color:#666;font-size:13px;',
    'line-height:1.6;margin:0;">',
    '<strong style="color:#f57f17;">',
    '&#9201; Important:</strong><br/>',
    '&#8226; Expires in <strong>10 minutes</strong><br/>',
    '&#8226; Do not share this code<br/>',
    '&#8226; Ignore if you did not request this',
    '</p></div>',
  ].join('\n');
}

function resetContent(link: string): string {
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Password Reset</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    'Click the button below to set a new password.',
    '</p>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 32px;">',
    `<a href="${link}"`,
    ' style="display:inline-block;',
    'background:#0a3d62;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128273; Reset My Password</a>',
    '</td></tr></table>',
    '<div style="background:#f8f9fa;',
    'border:1px solid #e9ecef;',
    'border-radius:12px;padding:20px;',
    'margin-bottom:24px;">',
    '<p style="color:#666;font-size:13px;',
    'line-height:1.6;margin:0;">',
    '<strong style="color:#e74c3c;">',
    '&#9888; Security Notice:</strong><br/>',
    '&#8226; Link expires in <strong>24 hours</strong><br/>',
    '&#8226; If you didn\'t request this, ignore it<br/>',
    '&#8226; Never share this link',
    '</p></div>',
    '<div style="background:#f0f4f8;',
    'border-radius:8px;padding:16px;',
    'text-align:center;">',
    '<p style="color:#888;font-size:12px;',
    'margin:0 0 8px;">',
    'Can\'t click? Copy this link:</p>',
    '<p style="color:#0a3d62;font-size:11px;',
    'word-break:break-all;margin:0;',
    `font-family:monospace;">${link}</p>`,
    '</div>',
  ].join('\n');
}

function resultsContent(portalUrl: string): string {
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Results Published!</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `${SCHOOL} has released report cards.`,
    ' You can now view academic results.',
    '</p>',
    '<div style="background:#0a3d62;',
    'border-radius:16px;padding:32px;',
    'text-align:center;margin:0 auto 24px;">',
    '<p style="color:#fff;font-size:20px;',
    'font-weight:700;margin:0 0 8px;">',
    'Report Cards Are Live</p>',
    '<p style="color:#b8d4e8;font-size:13px;',
    'margin:0;">Log in to view grades,',
    ' positions, and comments.</p>',
    '</div>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 24px;">',
    `<a href="${portalUrl}"`,
    ' style="display:inline-block;',
    'background:#27ae60;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128202; View Results Now</a>',
    '</td></tr></table>',
    '<div style="background:#f0f4f8;',
    'border-radius:8px;padding:16px;',
    'text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'Contact school admin for questions.</p>',
    '</div>',
  ].join('\n');
}

function receiptContent(data: {
  studentName: string;
  receiptNumber: string;
  academicYear: number;
  term: string;
  amountDue: number;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  className?: string;
}): string {
  const balance = data.amountDue - data.amountPaid;
  const isPaid = balance <= 0;
  const termLabel = data.term.replace('_', ' ').toUpperCase();
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Payment Receipt</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `Dear <strong>${data.studentName}</strong>,`,
    ' your fee payment has been recorded.',
    '</p>',
    // Receipt card
    '<div style="background:#f8f9fa;',
    'border:1px solid #e9ecef;',
    'border-radius:12px;padding:24px;',
    'margin-bottom:24px;">',
    // Receipt number
    '<div style="text-align:center;',
    'margin-bottom:16px;">',
    '<p style="color:#888;font-size:11px;',
    'text-transform:uppercase;',
    'letter-spacing:1px;margin:0 0 4px;">',
    'Receipt Number</p>',
    '<p style="color:#0a3d62;font-size:20px;',
    'font-weight:800;letter-spacing:2px;',
    `font-family:monospace;margin:0;">${data.receiptNumber}</p>`,
    '</div>',
    // Details grid
    '<table width="100%" cellpadding="0"',
    ' cellspacing="0" style="font-size:14px;">',
    '<tr><td style="padding:8px 0;color:#888;">',
    'Student</td>',
    '<td style="padding:8px 0;text-align:right;',
    `font-weight:600;">${data.studentName}</td></tr>`,
    data.className ? [
      '<tr><td style="padding:8px 0;color:#888;">',
      'Class</td>',
      '<td style="padding:8px 0;text-align:right;',
      `font-weight:600;">${data.className}</td></tr>`,
    ].join('\n') : '',
    '<tr><td style="padding:8px 0;color:#888;">',
    'Year / Term</td>',
    '<td style="padding:8px 0;text-align:right;',
    `font-weight:600;">${data.academicYear} &mdash; ${termLabel}</td></tr>`,
    '<tr><td style="padding:8px 0;color:#888;">',
    'Payment Method</td>',
    '<td style="padding:8px 0;text-align:right;',
    `font-weight:600;">${data.paymentMethod}</td></tr>`,
    '<tr><td style="padding:8px 0;color:#888;">',
    'Date &amp; Time</td>',
    '<td style="padding:8px 0;text-align:right;',
    `font-weight:600;">${data.paymentDate}</td></tr>`,
    '</table>',
    // Divider
    '<hr style="border:none;border-top:1px dashed #ccc;',
    'margin:12px 0;" />',
    // Amounts
    '<table width="100%" cellpadding="0"',
    ' cellspacing="0" style="font-size:14px;">',
    '<tr><td style="padding:6px 0;color:#888;">',
    'Total Due</td>',
    '<td style="padding:6px 0;text-align:right;',
    `font-weight:600;">$${data.amountDue.toFixed(2)}</td></tr>`,
    '<tr><td style="padding:6px 0;color:#888;">',
    'Amount Paid</td>',
    '<td style="padding:6px 0;text-align:right;',
    'font-weight:600;color:#16a34a;">',
    `$${data.amountPaid.toFixed(2)}</td></tr>`,
    '<tr><td style="padding:10px 0;',
    'border-top:2px solid #333;font-weight:700;">',
    'Balance</td>',
    '<td style="padding:10px 0;text-align:right;',
    'border-top:2px solid #333;font-weight:700;',
    `color:${isPaid ? '#16a34a' : '#dc2626'};">`,
    `$${balance.toFixed(2)}</td></tr>`,
    '</table>',
    '</div>',
    // Status badge
    isPaid ? [
      '<div style="text-align:center;margin:0 0 24px;">',
      '<span style="display:inline-block;',
      'border:3px solid #16a34a;color:#16a34a;',
      'font-size:16px;font-weight:800;',
      'letter-spacing:4px;padding:6px 24px;',
      'border-radius:8px;text-transform:uppercase;">',
      'Paid in Full</span></div>',
    ].join('\n') : [
      '<div style="background:#fff8e1;',
      'border:1px solid #ffe082;',
      'border-radius:12px;padding:16px;',
      'margin-bottom:24px;text-align:center;">',
      '<p style="color:#f57f17;font-size:14px;',
      'font-weight:600;margin:0;">',
      `Outstanding Balance: $${balance.toFixed(2)}</p>`,
      '</div>',
    ].join('\n'),
    '<div style="text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'This is an automated receipt.',
    ' Contact school admin for queries.</p>',
    '</div>',
  ].join('\n');
}

function parentLinkContent(data: any): string {
  const { parentName, studentName, role, className, date } = data;
  const isParentView = role === 'parent';
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">',
    '&#128279; Parent-Student Link Confirmed</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    isParentView
      ? `You have successfully linked to <strong>${studentName}</strong>'s account.`
      : `<strong>${parentName}</strong> has linked to your account as a parent/guardian.`,
    '</p>',
    // Info card
    '<div style="background:#f0f7ff;',
    'border:1px solid #d0e3f7;',
    'border-radius:12px;padding:24px;',
    'margin:0 0 24px;">',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td style="padding:8px 0;color:#666;',
    'font-size:14px;">Parent/Guardian:</td>',
    `<td style="padding:8px 0;color:#2c3e50;`,
    `font-size:14px;font-weight:600;`,
    `text-align:right;">${parentName}</td></tr>`,
    '<tr><td style="padding:8px 0;color:#666;',
    'font-size:14px;">Student:</td>',
    `<td style="padding:8px 0;color:#2c3e50;`,
    `font-size:14px;font-weight:600;`,
    `text-align:right;">${studentName}</td></tr>`,
    className ? [
      '<tr><td style="padding:8px 0;color:#666;',
      'font-size:14px;">Class:</td>',
      `<td style="padding:8px 0;color:#2c3e50;`,
      `font-size:14px;font-weight:600;`,
      `text-align:right;">${className}</td></tr>`,
    ].join('\n') : '',
    '<tr><td style="padding:8px 0;color:#666;',
    'font-size:14px;">Linked on:</td>',
    `<td style="padding:8px 0;color:#2c3e50;`,
    `font-size:14px;font-weight:600;`,
    `text-align:right;">${date}</td></tr>`,
    '</table></div>',
    // Access info
    '<div style="background:#e8f5e9;',
    'border:1px solid #c8e6c9;',
    'border-radius:12px;padding:16px;',
    'margin:0 0 24px;">',
    '<p style="color:#2e7d32;font-size:14px;',
    'font-weight:600;margin:0 0 8px;">',
    isParentView ? '&#9989; You can now:' : '&#9989; The parent can now:',
    '</p>',
    '<ul style="color:#555;font-size:13px;',
    'line-height:1.8;margin:0;padding-left:20px;">',
    '<li>View academic grades and reports</li>',
    '<li>Monitor attendance records</li>',
    '<li>Track fee payments and balances</li>',
    '<li>Receive important notifications</li>',
    '</ul></div>',
    '<div style="text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'If you did not authorize this,',
    ' contact school admin immediately.</p>',
    '</div>',
  ].join('\n');
}

function welcomeContent(data: { name: string; role: string; portalUrl: string }): string {
  const roleLabel = data.role.charAt(0).toUpperCase() + data.role.slice(1);
  const roleFeatures: Record<string, string[]> = {
    student: ['View your grades and report cards', 'Track attendance records', 'Check fee balances and receipts', 'Chat with teachers and classmates'],
    teacher: ['Enter and manage student grades', 'Mark daily attendance', 'View class rankings and analytics', 'Communicate with students and parents'],
    parent: ['Monitor your child\'s academic progress', 'View attendance and fee records', 'Receive important school notifications', 'Message teachers directly'],
    admin: ['Manage all school operations', 'Generate reports and analytics', 'Oversee staff and students', 'Configure system settings'],
  };
  const features = roleFeatures[data.role] || roleFeatures.student;
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Welcome to the Family! &#127891;</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `Hello <strong>${data.name}</strong>,<br/>`,
    `Your <strong>${roleLabel}</strong> account has been`,
    ' created successfully.</p>',
    '<div style="background:#e8f5e9;',
    'border:1px solid #c8e6c9;',
    'border-radius:12px;padding:20px;',
    'margin:0 0 24px;">',
    '<p style="color:#2e7d32;font-size:14px;',
    'font-weight:600;margin:0 0 12px;">',
    '&#9989; What you can do:</p>',
    '<ul style="color:#555;font-size:13px;',
    'line-height:1.8;margin:0;padding-left:20px;">',
    ...features.map(f => `<li>${f}</li>`),
    '</ul></div>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 24px;">',
    `<a href="${data.portalUrl}"`,
    ' style="display:inline-block;',
    'background:#0a3d62;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128218; Log In Now</a>',
    '</td></tr></table>',
    '<div style="text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'If you need help, contact your school admin.</p>',
    '</div>',
  ].join('\n');
}

function attendanceAlertContent(data: {
  studentName: string;
  date: string;
  status: string;
  className: string;
  markedBy?: string;
}): string {
  const statusColor = data.status === 'absent' ? '#dc2626' : '#f59e0b';
  const statusIcon = data.status === 'absent' ? '&#10060;' : '&#9201;';
  const statusLabel = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    `text-align:center;">Attendance Alert ${statusIcon}</h2>`,
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `<strong>${data.studentName}</strong> was marked`,
    ` as <strong style="color:${statusColor};">`,
    `${statusLabel}</strong> today.</p>`,
    '<div style="background:#f8f9fa;',
    'border:1px solid #e9ecef;',
    'border-radius:12px;padding:24px;',
    'margin:0 0 24px;">',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td style="padding:8px 0;color:#888;',
    'font-size:14px;">Student</td>',
    '<td style="padding:8px 0;text-align:right;',
    `font-weight:600;">${data.studentName}</td></tr>`,
    '<tr><td style="padding:8px 0;color:#888;',
    'font-size:14px;">Class</td>',
    '<td style="padding:8px 0;text-align:right;',
    `font-weight:600;">${data.className}</td></tr>`,
    '<tr><td style="padding:8px 0;color:#888;',
    'font-size:14px;">Date</td>',
    '<td style="padding:8px 0;text-align:right;',
    `font-weight:600;">${data.date}</td></tr>`,
    '<tr><td style="padding:8px 0;color:#888;',
    'font-size:14px;">Status</td>',
    `<td style="padding:8px 0;text-align:right;`,
    `font-weight:700;color:${statusColor};">`,
    `${statusLabel}</td></tr>`,
    '</table></div>',
    data.status === 'absent' ? [
      '<div style="background:#fff8e1;',
      'border:1px solid #ffe082;',
      'border-radius:12px;padding:16px;',
      'margin:0 0 24px;">',
      '<p style="color:#f57f17;font-size:13px;',
      'line-height:1.6;margin:0;">',
      '<strong>&#9888; Note:</strong> If this absence',
      ' was excused, please contact the school',
      ' to update the records.</p></div>',
    ].join('\n') : '',
    '<div style="text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'This is an automated attendance notification.</p>',
    '</div>',
  ].join('\n');
}

function gradeNotificationContent(data: {
  studentName: string;
  subjectName: string;
  mark: number;
  grade: string;
  term: string;
  className: string;
  comment?: string;
}): string {
  const termLabel = data.term.replace('_', ' ').toUpperCase();
  const gradeColor = data.mark >= 70 ? '#16a34a' : data.mark >= 50 ? '#f59e0b' : '#dc2626';
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">New Grade Posted &#128202;</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `A grade has been entered for`,
    ` <strong>${data.studentName}</strong>.</p>`,
    '<div style="background:#0a3d62;',
    'border-radius:16px;padding:32px;',
    'text-align:center;margin:0 auto 24px;">',
    '<p style="color:#b8d4e8;font-size:13px;',
    'margin:0 0 8px;letter-spacing:1px;',
    'text-transform:uppercase;">',
    `${data.subjectName}</p>`,
    `<p style="color:#fff;font-size:48px;`,
    'font-weight:800;margin:0 0 4px;">',
    `${data.mark}%</p>`,
    `<p style="color:${gradeColor};`,
    'font-size:20px;font-weight:700;',
    `margin:0;">Grade: ${data.grade}</p>`,
    '</div>',
    '<div style="background:#f8f9fa;',
    'border:1px solid #e9ecef;',
    'border-radius:12px;padding:20px;',
    'margin:0 0 24px;">',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td style="padding:6px 0;color:#888;',
    'font-size:14px;">Student</td>',
    '<td style="padding:6px 0;text-align:right;',
    `font-weight:600;">${data.studentName}</td></tr>`,
    '<tr><td style="padding:6px 0;color:#888;',
    'font-size:14px;">Class</td>',
    '<td style="padding:6px 0;text-align:right;',
    `font-weight:600;">${data.className}</td></tr>`,
    '<tr><td style="padding:6px 0;color:#888;',
    'font-size:14px;">Term</td>',
    '<td style="padding:6px 0;text-align:right;',
    `font-weight:600;">${termLabel}</td></tr>`,
    '</table>',
    data.comment ? [
      '<hr style="border:none;border-top:1px solid #eee;margin:12px 0;" />',
      '<p style="color:#666;font-size:13px;',
      `font-style:italic;margin:0;">`,
      `&#128172; "${data.comment}"</p>`,
    ].join('\n') : '',
    '</div>',
    '<div style="text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'Log in to your portal to view all grades.</p>',
    '</div>',
  ].join('\n');
}

function feeReminderContent(data: {
  studentName: string;
  className?: string;
  academicYear: number;
  term: string;
  amountDue: number;
  amountPaid: number;
  portalUrl: string;
}): string {
  const balance = data.amountDue - data.amountPaid;
  const termLabel = data.term.replace('_', ' ').toUpperCase();
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Fee Balance Reminder &#128176;</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    'This is a friendly reminder about an',
    ' outstanding fee balance for',
    ` <strong>${data.studentName}</strong>.</p>`,
    '<div style="background:#fff5f5;',
    'border:2px solid #fed7d7;',
    'border-radius:16px;padding:32px;',
    'text-align:center;margin:0 auto 24px;">',
    '<p style="color:#c53030;font-size:13px;',
    'margin:0 0 8px;letter-spacing:1px;',
    'text-transform:uppercase;">',
    'Outstanding Balance</p>',
    '<p style="color:#c53030;font-size:42px;',
    `font-weight:800;margin:0;">$${balance.toFixed(2)}</p>`,
    '</div>',
    '<div style="background:#f8f9fa;',
    'border:1px solid #e9ecef;',
    'border-radius:12px;padding:20px;',
    'margin:0 0 24px;">',
    '<table width="100%" cellpadding="0" cellspacing="0"',
    ' style="font-size:14px;">',
    '<tr><td style="padding:6px 0;color:#888;">',
    'Student</td>',
    '<td style="padding:6px 0;text-align:right;',
    `font-weight:600;">${data.studentName}</td></tr>`,
    data.className ? [
      '<tr><td style="padding:6px 0;color:#888;">',
      'Class</td>',
      '<td style="padding:6px 0;text-align:right;',
      `font-weight:600;">${data.className}</td></tr>`,
    ].join('\n') : '',
    '<tr><td style="padding:6px 0;color:#888;">',
    'Year / Term</td>',
    '<td style="padding:6px 0;text-align:right;',
    `font-weight:600;">${data.academicYear} &mdash; ${termLabel}</td></tr>`,
    '<tr><td style="padding:6px 0;color:#888;">',
    'Total Fees</td>',
    '<td style="padding:6px 0;text-align:right;',
    `font-weight:600;">$${data.amountDue.toFixed(2)}</td></tr>`,
    '<tr><td style="padding:6px 0;color:#888;">',
    'Amount Paid</td>',
    '<td style="padding:6px 0;text-align:right;',
    'color:#16a34a;font-weight:600;">',
    `$${data.amountPaid.toFixed(2)}</td></tr>`,
    '</table></div>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 24px;">',
    `<a href="${data.portalUrl}"`,
    ' style="display:inline-block;',
    'background:#0a3d62;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128179; View Fee Details</a>',
    '</td></tr></table>',
    '<div style="text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'Contact school admin for payment queries.</p>',
    '</div>',
  ].join('\n');
}

function accountActivationContent(data: {
  role: string;
  activationUrl: string;
  expiresIn: string;
}): string {
  const roleLabel = data.role.charAt(0).toUpperCase() + data.role.slice(1);
  const roleDesc: Record<string, string> = {
    student: 'access your grades, attendance records, and school resources',
    teacher: 'manage your classes, enter grades, and communicate with students',
    parent: 'monitor your child\'s academic progress and stay connected',
    admin: 'manage the school system and all user accounts',
  };
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Account Activation</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `You have been invited to join as a <strong>${roleLabel}</strong>.`,
    '</p>',
    // Role info card
    '<div style="background:#e8f5e9;',
    'border:1px solid #c8e6c9;',
    'border-radius:12px;padding:20px;',
    'margin:0 0 24px;">',
    '<p style="color:#2e7d32;font-size:14px;',
    'font-weight:600;margin:0 0 8px;">',
    `&#9989; As a ${roleLabel}, you can:</p>`,
    '<p style="color:#555;font-size:13px;',
    `line-height:1.6;margin:0;">${roleDesc[data.role] || roleDesc.student}</p>`,
    '</div>',
    // CTA Button
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 24px;">',
    `<a href="${data.activationUrl}"`,
    ' style="display:inline-block;',
    'background:#0a3d62;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128273; Activate My Account</a>',
    '</td></tr></table>',
    // Warning
    '<div style="background:#fff8e1;',
    'border:1px solid #ffe082;',
    'border-radius:12px;padding:16px;',
    'margin-bottom:24px;">',
    '<p style="color:#666;font-size:13px;',
    'line-height:1.6;margin:0;">',
    '<strong style="color:#f57f17;">',
    '&#9201; Important:</strong><br/>',
    `&#8226; Link expires in <strong>${data.expiresIn}</strong><br/>`,
    '&#8226; You\'ll need to set your password<br/>',
    '&#8226; Have your personal details ready',
    '</p></div>',
    // Fallback link
    '<div style="background:#f0f4f8;',
    'border-radius:8px;padding:16px;',
    'text-align:center;">',
    '<p style="color:#888;font-size:12px;',
    'margin:0 0 8px;">',
    'Can\'t click? Copy this link:</p>',
    '<p style="color:#0a3d62;font-size:11px;',
    'word-break:break-all;margin:0;',
    `font-family:monospace;">${data.activationUrl}</p>`,
    '</div>',
  ].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gmailEmail = Deno.env.get('GMAIL_EMAIL')!;
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

    if (!gmailEmail || !gmailAppPassword) {
      throw new Error('Gmail credentials not configured');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { email, type, redirect_url, full_name, emails } = body;

    // Bulk results notification
    if (type === 'results_available') {
      if (!emails?.length) {
        return new Response(
          JSON.stringify({ error: 'No emails provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const portalUrl = supabaseUrl
        .replace('.supabase.co', '.lovable.app') + '/login';
      const subject = `Results Are Now Available - ${SCHOOL}`;
      const html = wrap(resultsContent(portalUrl));
      const result: any = await sendEmail(
        gmailEmail, gmailAppPassword, emails, subject, html
      );
      return new Response(
        JSON.stringify({ success: true, ...result, total: emails.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let subject = '';
    let html = '';

    if (type === 'reset_password') {
      const { data: linkData, error: linkError } = await supabase
        .auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            redirectTo: redirect_url ||
              supabaseUrl.replace(
                '.supabase.co',
                '.lovableproject.com'
              ) + '/reset-password',
          },
        });

      if (linkError) {
        return new Response(
          JSON.stringify({ error: linkError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const actionLink = linkData?.properties?.action_link || '';
      subject = `Password Reset - ${SCHOOL}`;
      html = wrap(resetContent(actionLink));

    } else if (type === 'verification_otp') {
      const otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const otpKey = `otp_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const otpData = JSON.stringify({
        code: otp,
        expires: Date.now() + 10 * 60 * 1000,
        email: email.toLowerCase(),
      });

      await supabase.from('system_settings').upsert({
        key: otpKey,
        value: otpData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      subject = `Verification Code - ${SCHOOL}`;
      html = wrap(otpContent(otp, full_name));

    } else if (type === 'fee_receipt') {
      const { receipt_data } = body;
      if (!receipt_data) {
        return new Response(
          JSON.stringify({ error: 'Receipt data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      subject = `Fee Payment Receipt ${receipt_data.receiptNumber} - ${SCHOOL}`;
      html = wrap(receiptContent(receipt_data));

    } else if (type === 'parent_link') {
      const { link_data } = body;
      if (!link_data) {
        return new Response(
          JSON.stringify({ error: 'Link data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      subject = `Parent-Student Account Linked - ${SCHOOL}`;
      html = wrap(parentLinkContent(link_data));

    } else if (type === 'welcome') {
      const { welcome_data } = body;
      if (!welcome_data) {
        return new Response(
          JSON.stringify({ error: 'Welcome data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const portalUrl = supabaseUrl.replace('.supabase.co', '.lovable.app') + '/login';
      subject = `Welcome to ${SCHOOL}! 🎓`;
      html = wrap(welcomeContent({ ...welcome_data, portalUrl }));

    } else if (type === 'attendance_alert') {
      const { attendance_data } = body;
      if (!attendance_data) {
        return new Response(
          JSON.stringify({ error: 'Attendance data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      subject = `Attendance Alert: ${attendance_data.studentName} - ${SCHOOL}`;
      html = wrap(attendanceAlertContent(attendance_data));

    } else if (type === 'grade_notification') {
      const { grade_data } = body;
      if (!grade_data) {
        return new Response(
          JSON.stringify({ error: 'Grade data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      subject = `New Grade: ${grade_data.subjectName} - ${SCHOOL}`;
      html = wrap(gradeNotificationContent(grade_data));

    } else if (type === 'fee_reminder') {
      const { reminder_data } = body;
      if (!reminder_data) {
        return new Response(
          JSON.stringify({ error: 'Reminder data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const portalUrl = supabaseUrl.replace('.supabase.co', '.lovable.app') + '/login';
      subject = `Fee Balance Reminder - ${SCHOOL}`;
      html = wrap(feeReminderContent({ ...reminder_data, portalUrl }));

    } else if (type === 'account_activation') {
      const { activation_data } = body;
      if (!activation_data) {
        return new Response(
          JSON.stringify({ error: 'Activation data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      subject = `Activate Your Account - ${SCHOOL}`;
      html = wrap(accountActivationContent(activation_data));

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid email type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await sendEmail(gmailEmail, gmailAppPassword, email, subject, html);

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Error in send-branded-email:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
