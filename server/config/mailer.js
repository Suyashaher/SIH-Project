const nodemailer = require('nodemailer');

// Fallback: If Gmail blocks sends, use Brevo (Sendinblue) with host: smtp-relay.brevo.com, port: 587
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD // Must be a Gmail App Password
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.log(`[Email Skipped] Missing credentials. To: ${to}, Subject: ${subject}`);
      return false;
    }
    const info = await transporter.sendMail({
      from: `"ShikshaSaarthi Portal" <${process.env.EMAIL_USER}>`,
      to, subject, html
    });
    console.log(`[Email Sent] ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email Failed] To: ${to}, Error:`, error.message);
    return false; // Do not throw
  }
};

module.exports = { sendEmail };
