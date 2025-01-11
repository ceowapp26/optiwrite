import { oauth2Client } from "@/lib/google";
import jwt from 'jsonwebtoken';
import { GOOGLE_AUTH_SCOPES } from '@/constants/auth';

export async function POST(req) {
  try {
    const { idToken } = await req.json();    
    const ticket = await oauth2Client.verifyIdToken({
      idToken: idToken,
      audience: process.env.AUTH_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if (payload.aud !== process.env.AUTH_GOOGLE_CLIENT_ID) {
      return new Response('Unauthorized', { status: 401 });
    }
    const { email, name } = payload;
    const authToken = jwt.sign(
      {
        email,
        name,
        GOOGLE_AUTH_SCOPES,
      },
      process.env.AUTH_SECRET!,
      { expiresIn: '24h' }
    );
    return new Response(JSON.stringify({ authToken }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
}