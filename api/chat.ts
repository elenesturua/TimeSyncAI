import { VercelRequest, VercelResponse } from '@vercel/node';
import { CHAT as chatHandler } from '../src/logic/gemini-selection/selector';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Convert Vercel request to standard Request object
    const url = req.url || 'http://localhost/api/chat';
    const request = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers as any),
      body: JSON.stringify(req.body)
    });

    const response = await chatHandler(request);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in chat handler:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
