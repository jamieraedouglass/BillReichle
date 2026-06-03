import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const data = readFileSync(join(process.cwd(), 'data/reviews.json'), 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).send(data);
  } catch {
    res.status(500).json({ error: 'Could not load reviews' });
  }
}
