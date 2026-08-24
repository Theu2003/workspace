import { Router } from 'express';
import db from '../db.js';
import { parseMaterials } from '../helpers.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const companiesRow = db.prepare('SELECT COUNT(*) as count FROM companies').get();
    const collectionsRow = db.prepare('SELECT COUNT(*) as count FROM collections').get();
    const completedRow = db.prepare("SELECT COUNT(*) as count FROM collections WHERE status = 'concluida'").get();
    const allCollections = db.prepare('SELECT materials FROM collections').all();

    let totalWeightKg = 0;
    for (const c of allCollections) {
      const items = parseMaterials(c.materials);
      for (const m of items) {
        totalWeightKg += Number(m.quantity) || 0;
      }
    }

    const totalWeightTon = totalWeightKg >= 1000
      ? `${(totalWeightKg / 1000).toFixed(1)} ton`
      : `${totalWeightKg} kg`;

    res.json({
      companies: companiesRow?.count || 0,
      collections: completedRow?.count || 0,
      totalWeight: totalWeightTon,
    });
  } catch (err) {
    console.error('Erro ao buscar stats:', err);
    res.json({ companies: 0, collections: 0, totalWeight: '0 kg' });
  }
});

export default router;
