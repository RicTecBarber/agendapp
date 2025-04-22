import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db'; // Ajuste o caminho conforme sua estrutura

const router = express.Router();
const saltRounds = 10;

// ... (mantenha todas as rotas existentes aqui) ...

/**
 * Rota para alteração de senha administrativa
 * Requer:
 * - currentPassword: senha atual
 * - newPassword: nova senha (mínimo 8 caracteres)
 */
router.post('/system/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validação básica
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Nova senha deve ter pelo menos 8 caracteres" });
    }

    // 1. Verificar senha atual
    const storedHash = await db.get('admin_password_hash') || 
      await bcrypt.hash('admin123', saltRounds); // Fallback para senha padrão

    const isMatch = await bcrypt.compare(currentPassword, storedHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    // 2. Armazenar nova senha (hash)
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    await db.set('admin_password_hash', newHash);

    // 3. Registrar a alteração (opcional)
    await db.set('admin_last_password_change', new Date().toISOString());

    res.json({ 
      success: true,
      message: "Senha alterada com sucesso" 
    });

  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ... (mantenha outras rotas/exportações existentes) ...

export default router;