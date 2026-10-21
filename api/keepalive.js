/* =========================================================
   JLAAB Dev Studio — api/keepalive.js
   Runs on a schedule (see vercel.json) and makes a tiny database
   request, so the free Supabase project doesn't pause.
   ========================================================= */

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = async (req, res) => {
  // Only Vercel's scheduler (which sends this secret) can run it
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { error } = await supabase
    .from("notification_recipients")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Keep-alive failed:", error);
    return res.status(500).json({ ok: false });
  }

  return res.status(200).json({ ok: true, at: new Date().toISOString() });
};