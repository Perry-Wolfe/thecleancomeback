# PURE Functional Beverage Co. website

Static site with a Stripe checkout function, built for Netlify. No build step.

## Structure

```
public/                 Everything served to visitors
  *.html                Pages (home, energy, protein, pop, shop, wholesale, investors, about, contact, success, 404)
  css/styles.css        All styles
  js/catalog.js         Products and prices. The only place prices live.
  js/main.js            Bag, product grids, shop filter, finder, forms
  img/                  Optimized WebP images, logo SVG, social share image
  fonts/                Archivo (self-hosted, SIL Open Font License)
netlify/functions/
  checkout.js           Creates the Stripe Checkout session (served at /api/checkout)
netlify.toml            Publish folder, functions, security and cache headers
package.json            Stripe dependency
```

## Deploy

1. Push this folder to a GitHub repository.
2. In Netlify, import the repository. Leave the build command blank. Netlify reads `netlify.toml` (publish folder `public`).
3. Add environment variables under Site configuration > Environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (use `sk_test_...` until launch) |
| `STRIPE_SHIPPING_RATE_ID` | No | A Stripe shipping rate (`shr_...`) to charge shipping at checkout |
| `STRIPE_AUTOMATIC_TAX` | No | Set to `true` once Stripe Tax is configured |

4. Redeploy after adding variables.

## Changing products or prices

Edit `public/js/catalog.js`. The shop, product pages, bag and checkout all read from it, so there is nothing to keep in sync. Prices are in cents (`2999` = $29.99). A product with `comingSoon: true` shows a "Get notified" button instead of "Add to bag" and cannot be purchased.

## Forms

Netlify Forms captures four forms automatically: `newsletter`, `wholesale-inquiry`, `investor-request`, `contact`. Submissions appear under Forms in Netlify; set up email notifications there. Each form has a spam honeypot and confirms in place without leaving the page.

## Domain

Canonical URLs and the social share image point to `https://thecleancomeback.com`. If the live domain differs, search and replace that address in `public/*.html`.

## Before launch

- Confirm every claim in the "On the can" panels and product copy matches the final printed labels.
- Pure Energy flavors on the site are Apple, Peach, Watermelon and Tropical. The current Pure Energy photography shows Citrus, Lush Ice, Berry and Original cans. Reshoot or update one side so they match.
- Run a test order with a Stripe test key and card `4242 4242 4242 4242`.
