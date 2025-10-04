// /api/paypal-webhook.js — Supabase-backed (Vercel)
import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const tokenRes = await fetch("https://api.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const verifyRes = await fetch("https://api.paypal.com/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        transmission_id: req.headers["paypal-transmission-id"],
        transmission_time: req.headers["paypal-transmission-time"],
        cert_url: req.headers["paypal-cert-url"],
        auth_algo: req.headers["paypal-auth-algo"],
        transmission_sig: req.headers["paypal-transmission-sig"],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: req.body,
      }),
    });
    const verifyData = await verifyRes.json();
    if (verifyData.verification_status !== "SUCCESS") {
      return res.status(400).json({ error: "Invalid signature", details: verifyData });
    }

    const evt = req.body?.event_type || "";
    const resource = req.body?.resource || {};
    const orderId = resource?.id || resource?.supplementary_data?.related_ids?.order_id || null;
    const purchaseUnit = resource?.purchase_units?.[0];
    const amountStr = purchaseUnit?.amount?.value || resource?.amount?.value || "0.00";
    const currency = purchaseUnit?.amount?.currency_code || resource?.amount?.currency_code || "USD";
    const payerEmail = resource?.payer?.email_address || resource?.payment_source?.paypal?.email_address || null;
    const itemName = purchaseUnit?.description || resource?.description || null;
    const amountCents = Math.round(parseFloat(amountStr || "0") * 100);

    const { error } = await supabase.from("orders").insert({
      paypal_order_id: orderId,
      event_type: evt,
      item_name: itemName,
      amount_cents: Number.isFinite(amountCents) ? amountCents : 0,
      currency,
      payer_email: payerEmail,
      raw_json: req.body,
    });
    if (error) console.error("Supabase insert error:", error);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
