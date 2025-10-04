// /api/order-log.js — optional client-side log
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  console.log("Order log:", req.body);
  return res.status(200).json({ ok: true });
}
