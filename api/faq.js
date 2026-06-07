import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const raw = readFileSync(join(process.cwd(), 'data/faq.json'), 'utf8');
    const data = JSON.parse(raw);
    res.status(200).json(data);
  } catch (err) {
    console.error('FAQ API error:', err.message, 'cwd:', process.cwd());
    res.status(500).json({ error: 'Could not load FAQ', detail: err.message });
  }
}
