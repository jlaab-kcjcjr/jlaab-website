/* =========================================================
   JLAAB Dev Studio — api/inquiries.js
   Saves each inquiry in Supabase, then emails it through Gmail:
   To = recipients marked "to", BCC = recipients marked "bcc"
   (both lists come from the notification_recipients table).
   ========================================================= */

const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

// Maximum length for each field, so nobody can send huge messages
const LIMITS = {
  name: 120,
  organization: 160,
  email: 200,
  phone: 40,
  client_type: 80,
  service: 80,
  message: 5000,
};

const OPTIONAL = ["organization", "phone", "client_type", "service"];

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid request." });
  }

  // Honeypot: real visitors never fill this hidden field, bots usually do
  if (body.website) return res.status(200).json({ ok: true });

  // Clean and validate
  const data = {};
  for (const [key, max] of Object.entries(LIMITS)) data[key] = clean(body[key], max);

  if (!data.name || !data.email || !data.message) {
    return res.status(400).json({ error: "Please fill in your name, email, and message." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  // Basic rate limit: at most 3 inquiries per email every 10 minutes
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("email", data.email)
    .gte("created_at", since);

  if (count >= 3) {
    return res.status(429).json({ error: "You've sent several messages already. Please wait a few minutes." });
  }

  // 1. Save the inquiry
  const row = { ...data };
  OPTIONAL.forEach((key) => { if (!row[key]) row[key] = null; });

  const { error: insertError } = await supabase.from("inquiries").insert(row);
  if (insertError) {
    console.error("Supabase insert failed:", insertError);
    return res.status(500).json({ error: "We couldn't send your message. Please try again or email us directly." });
  }

  // 2. Get who to notify
  const { data: recipients, error: recipientError } = await supabase
    .from("notification_recipients")
    .select("email, send_as")
    .eq("active", true);

  if (recipientError) console.error("Couldn't load recipients:", recipientError);

  const list = recipients || [];
  const to = list.filter((r) => r.send_as === "to").map((r) => r.email);
  const bcc = list.filter((r) => r.send_as === "bcc").map((r) => r.email);
  if (to.length === 0) to.push(process.env.GMAIL_USER); // safety fallback

  // 3. Send the notification email
  const rows = [
    ["Name", data.name],
    ["Company or organization", data.organization || "Not provided"],
    ["Email", data.email],
    ["Mobile number", data.phone || "Not provided"],
    ["Representing", data.client_type || "Not selected"],
    ["Needs help with", data.service || "Not selected"],
  ];

  try {
    await transporter.sendMail({
      from: `"JLAAB Website" <${process.env.GMAIL_USER}>`,
      to,
      bcc,
      replyTo: data.email, // clicking Reply answers the client directly
      subject: `New inquiry from ${data.name}`,
      text:
        rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
        `\n\nMessage:\n${data.message}`,
      html: `
        <h2 style="margin:0 0 12px;color:#030164">New inquiry from the website</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
          ${rows.map(([k, v]) => `<tr><td style="color:#555"><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`).join("")}
        </table>
        <p style="font-family:Arial,sans-serif;font-size:14px"><strong>Message:</strong><br>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>
      `,
    });
  } catch (mailError) {
    // The inquiry is already saved in Supabase, so it isn't lost
    console.error("Email failed:", mailError);
  }

  return res.status(200).json({ ok: true });
};