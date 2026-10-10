const Brevo = require("@getbrevo/brevo");

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

// EMAIL_FROM may be "Name <email@x.com>" or just "email@x.com".
const parseSender = () => {
  const raw = (process.env.EMAIL_FROM || "").trim();
  const match = raw.match(/^(.*)<([^>]+)>$/);
  const email = (match ? match[2] : raw).trim();
  const name = (
    process.env.EMAIL_FROM_NAME ||
    (match && match[1].trim()) ||
    "Church Website"
  ).trim();
  return { name, email };
};

/**
 * Send a transactional email through Brevo's HTTP API.
 * Throws on failure; callers decide whether that is fatal.
 */
async function sendEmail(to, subject, html) {
  const sender = parseSender();
  if (!sender.email) throw new Error("EMAIL_FROM is not configured");

  const message = new Brevo.SendSmtpEmail();
  message.subject = subject;
  message.htmlContent = html;
  message.sender = sender;
  message.to = [{ email: to }];

  try {
    const response = await apiInstance.sendTransacEmail(message);
    const id = response?.body?.messageId || response?.messageId || "ok";
    console.log(`✅ Email sent (${id})`);
    return response;
  } catch (err) {
    console.error(
      "Brevo API error:",
      err.response ? JSON.stringify(err.response.body) : err.message
    );
    throw err;
  }
}

module.exports = { sendEmail, parseSender };
