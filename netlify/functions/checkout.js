import Stripe from "stripe";
import { PRODUCTS, MAX_QTY } from "../../public/js/catalog.js";

const products = new Map(PRODUCTS.filter((p) => !p.comingSoon).map((p) => [p.id, p]));
const SHIP_TO = ["US", "MX"];

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Returns [[id, qty], ...] or null if anything in the request is invalid.
function parseItems(body) {
  if (!body || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > products.size) {
    return null;
  }
  const quantities = new Map();
  for (const item of body.items) {
    const qty = Number(item?.qty);
    if (!products.has(item?.id) || !Number.isInteger(qty) || qty < 1) return null;
    quantities.set(item.id, Math.min(MAX_QTY, (quantities.get(item.id) ?? 0) + qty));
  }
  return [...quantities];
}

export default async (request) => {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("Checkout: STRIPE_SECRET_KEY is not set.");
    return json(503, { error: "Checkout is unavailable right now. Please try again shortly." });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Something went wrong with your bag. Refresh the page and try again." });
  }

  const items = parseItems(body);
  if (!items) {
    return json(400, { error: "Your bag has an item that is no longer available. Refresh the page and try again." });
  }

  // Netlify sets URL to the site's primary address; never trust the request's Origin header for redirects.
  const siteUrl = process.env.URL ?? new URL(request.url).origin;

  const params = {
    mode: "payment",
    line_items: items.map(([id, quantity]) => {
      const product = products.get(id);
      return {
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: product.price,
          product_data: { name: `${product.name}, ${product.pack}` },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: SHIP_TO },
    success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/shop.html`,
  };

  if (process.env.STRIPE_SHIPPING_RATE_ID) {
    params.shipping_options = [{ shipping_rate: process.env.STRIPE_SHIPPING_RATE_ID }];
  }
  if (process.env.STRIPE_AUTOMATIC_TAX === "true") {
    params.automatic_tax = { enabled: true };
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create(params);
    return json(200, { url: session.url });
  } catch (error) {
    console.error("Checkout: Stripe session failed.", error);
    return json(502, { error: "Checkout is unavailable right now. Please try again shortly." });
  }
};

export const config = { path: "/api/checkout" };
