export const DOMAIN = process.env.APP_ENV === 'production' 
  ? process.env.APP_DOMAIN
  : process.env.NGROK_DOMAIN;

export const allowedOrigins = [
  'https://admin.shopify.com',
  'https://*.myshopify.com',
  process.env.SHOPIFY_APP_URL,
  process.env.APP_ENV === 'production' ? `https://${DOMAIN}` : null,
  process.env.APP_ENV === 'development' ? 'http://localhost:3000' : null,
  process.env.APP_ENV === 'development' ? 'https://*.ngrok.io' : null,
  process.env.APP_ENV === 'development' ? 'https://*.ngrok-free.app' : null,
].filter(Boolean) as string[]; 

if (process.env.APP_ENV === 'development' && process.env.NGROK_URL) {
  allowedOrigins.push(process.env.NGROK_URL);
}

export const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
};
