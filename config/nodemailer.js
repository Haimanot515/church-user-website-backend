const Brevo = require('@getbrevo/brevo');

// 1. Initialize Brevo Client
const apiInstance = new Brevo.TransactionalEmailsApi();
const apiKey = apiInstance.authentications['apiKey'];

// Use the API Key from Render Environment Variables
if (!process.env.BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY is missing in Environment Variables');
}
apiKey.apiKey = process.env.BREVO_API_KEY;

/**
 * Send email using Brevo API (HTTP)
 * Standardized for Portfolio Verification
 */
async function sendEmail(to, subject, html) {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  
  /**
   * FIX: Clean the sender email.
   * Brevo 400 errors occur if EMAIL_FROM contains "Name <email@mail.com>".
   * This logic extracts just the "email@mail.com" part.
   */
  const rawEmail = process.env.EMAIL_FROM || "haimanotbeka@gmail.com";
  const cleanEmail = rawEmail.includes('<') 
    ? rawEmail.split('<')[1].split('>')[0].trim() 
    : rawEmail.trim();

  sendSmtpEmail.sender = { 
    "name": "Fasika Admin", 
    "email": cleanEmail 
  };
  
  sendSmtpEmail.to = [{ "email": to }];

  try {
    // API Call
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    // Log success (handling different SDK return structures)
    const messageId = response.body?.messageId || response.messageId || 'Success';
    console.log(`✅ Email sent to ${to}. ID: ${messageId}`);
    
    return response;
  } catch (err) {
    // Enhanced error logging to capture the exact reason from Brevo's response body
    console.error('🔥 Brevo API Error Detail:', err.response ? JSON.stringify(err.response.body, null, 2) : err.message);
    throw err;
  }
}

module.exports = { sendEmail };