import { readFileSync } from 'fs';
import { join } from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const raw = readFileSync(join(process.cwd(), 'data/faq.json'), 'utf8');
    res.status(200).json(JSON.parse(raw));
  } catch (err) {
    console.error('FAQ API error:', err);
    res.status(500).json({ error: 'Could not load FAQ' });
  }
}
