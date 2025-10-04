// /api/orders-list.js — Admin list (requires ADMIN_LIST_TOKEN)
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export default async function handler(req, res) {
  if (req.query.token !== process.env.ADMIN_LIST_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { data, error } = await supabase
    .from("orders")
    .select("id,paypal_order_id,event_type,item_name,amount_cents,currency,payer_email,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ orders: data });
}
