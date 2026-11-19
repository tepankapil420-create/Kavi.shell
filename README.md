# Kavi.shell — Mobile Case Store

Responsive mobile-case catalogue and lightweight order system built with React + Vite + Supabase.

## Included
- Public catalogue with Men / Women / All filters and product search
- Product detail with searchable-style phone model dropdown (grouped by brand)
- Shopping bag and customer checkout form
- Saves order details to Supabase, then opens WhatsApp chat to **+91 6367312739** with product, model, customer and image details
- Admin dashboard: products, categories/subcategories, phone models, orders, brand name, tagline and logo
- Multi-image bulk upload (default price ₹599; edit products individually after upload)
- Blush pink / chocolate brown visual theme

## Stack
- React 18 + Vite
- Supabase Auth, Postgres, Storage
- Vercel static hosting

## Deploy / upgrade existing Supabase project
1. In Supabase Dashboard → SQL Editor, run the complete `supabase/schema.sql` file. It is written to add the new columns/tables and refresh policies for the existing project.
2. Confirm the admin user exists in Supabase Authentication → Users with email `tepankapil420@gmail.com`. The admin email is retained from the original ZIP's README and SQL policies. If this is not your account, update `ADMIN_EMAIL` in `src/supabase.js` and replace the same email in every admin policy in `supabase/schema.sql` before running it.
3. Keep the existing Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   Use the Supabase anon/public key only. Never expose the service-role key.
4. Push the updated project to the same GitHub repository connected to Vercel, or upload these files to the existing repository. Vercel will build using `npm run build`.
5. Public store route: `/`. Admin route: `/admin`.

## Run locally
```bash
npm install
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
npm run dev
```

## Admin use
- Add main categories `Men` and `Women`, then add subcategories under each.
- `All` is the public all-products filter and automatically shows every published design.
- Add phone models under Admin → Phone models. Enter them like `Apple iPhone 16 Pro` or `Samsung Galaxy S25 Ultra`.
- Add products individually or bulk upload multiple images. Bulk uploads are initially assigned ₹599 and auto-generated codes based on filenames; edit their names/prices after upload.
- View customer orders under Admin → Orders. Orders are saved before the WhatsApp redirect.

## Important order flow note
This is a WhatsApp order-request flow, not an online payment gateway. The website does not collect payment. A customer submits their details, the order is stored in Supabase, and WhatsApp opens with the order summary. If the customer closes WhatsApp, the saved order remains in the admin panel.

## Security
- Admin write access is restricted by Supabase RLS to the configured admin email.
- Public users can only read published products and active catalogue data, and submit order requests. They cannot read the customer orders table.
- Product/logo images are in a public bucket so shoppers can see them; uploads and deletes are admin-only.
