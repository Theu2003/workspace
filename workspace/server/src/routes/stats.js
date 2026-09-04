// ===================================================================
// routes/stats.js — Rotas de estatísticas públicas
// ===================================================================
// Este arquivo fornece estatísticas gerais da plataforma para a
// página inicial (Home). Não requer autenticação.
//
// Rotas:
//   GET / → Retorna: total de empresas, coletas concluídas, peso total
// ===================================================================

import { Router } from 'express';      // Router do Express
import db from '../db.js';              // Banco de dados
import { parseMaterials } from '../helpers.js'; // Helper para parsear JSON de materiais

const router = Router();

// ── Rota: Estatísticas públicas ─────────────────────────────────────
// GET /api/stats
// Retorna estatísticas gerais para exibir na página inicial
// Não requer autenticação (rota pública)
//
// Retorna:
//   200: {
//     companies: number,    → Total de empresas cadastradas
//     collections: number,  → Total de coletas concluídas
//     totalWeight: string   → Peso total coletado ("1.5 ton" ou "800 kg")
//   }
router.get('/', (_req, res) => {
  try {
    // Conta o total de empresas cadastradas
    const companiesRow = db.prepare('SELECT COUNT(*) as count FROM companies').get();

    // Conta o total de coletas (todas)
    const collectionsRow = db.prepare('SELECT COUNT(*) as count FROM collections').get();

    // Conta apenas coletas concluídas
    const completedRow = db.prepare("SELECT COUNT(*) as count FROM collections WHERE status = 'concluida'").get();

    // Calcula o peso total de todos os materiais coletados
    const allCollections = db.prepare('SELECT materials FROM collections').all();

    let totalWeightKg = 0;
    for (const c of allCollections) {
      const items = parseMaterials(c.materials); // Converte JSON string → array
      for (const m of items) {
        totalWeightKg += Number(m.quantity) || 0; // Soma quantidades (em kg)
      }
    }

    // Formata o peso: se >= 1000 kg, mostra em toneladas
    const totalWeightTon = totalWeightKg >= 1000
      ? `${(totalWeightKg / 1000).toFixed(1)} ton`  // Ex: "1.5 ton"
      : `${totalWeightKg} kg`;                       // Ex: "800 kg"

    res.json({
      companies: companiesRow?.count || 0,    // Total de empresas
      collections: completedRow?.count || 0,  // Coletas concluídas
      totalWeight: totalWeightTon,            // Peso formatado
    });
  } catch (err) {
    console.error('Erro ao buscar stats:', err);
    // Em caso de erro, retorna zeros (não quebra a página inicial)
    res.json({ companies: 0, collections: 0, totalWeight: '0 kg' });
  }
});

export default router;
