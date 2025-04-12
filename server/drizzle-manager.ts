import { db, pool } from './db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import backup from './backup';

// Use __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gerenciador de banco de dados Drizzle
 * 
 * Esta classe fornece métodos seguros para:
 * 1. Verificar se o banco está íntegro
 * 2. Fazer backup antes de alterações importantes
 * 3. Aplicar migrações de forma segura
 * 4. Fornecer informações sobre o estado do banco
 */
export class DrizzleManager {
  private migrationsDir: string;
  
  constructor() {
    this.migrationsDir = path.join(__dirname, "../migrations");
    this.ensureMigrationsDirExists();
  }
  
  /**
   * Garante que o diretório de migrações existe
   */
  private ensureMigrationsDirExists(): void {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }
  }
  
  /**
   * Executa backup do banco antes de aplicar migrações
   */
  async backupDatabase(): Promise<string | null> {
    try {
      console.log("Iniciando backup do banco de dados antes da migração...");
      const backupPath = await backup();
      console.log(`Backup concluído: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error("Falha ao realizar backup:", error);
      return null;
    }
  }
  
  /**
   * Aplica migrações de forma segura
   */
  async applyMigrations(): Promise<boolean> {
    try {
      console.log("Aplicando migrações...");
      
      // Realiza o backup antes de migrar (opcional)
      const backupSuccess = await this.backupDatabase();
      if (!backupSuccess && process.env.NODE_ENV === 'production') {
        console.error("Backup falhou em ambiente de produção. Migrações abortadas por segurança.");
        return false;
      }
      
      // Aplica as migrações
      await migrate(db, {
        migrationsFolder: this.migrationsDir,
      });
      
      console.log("Migrações aplicadas com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao aplicar migrações:", error);
      return false;
    }
  }
  
  /**
   * Verifica o estado do banco e retorna estatísticas
   */
  async checkDatabaseState(): Promise<any> {
    try {
      // Realiza verificações básicas de conectividade e integridade
      // Estas verificações são seguras e não modificam o banco
      
      // Verificar conectividade
      await pool.query("SELECT 1");
      
      // Obter contagem de tabelas
      const tablesResult = await pool.query(`
        SELECT count(*) as total_tables 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      // Obter estatísticas do banco
      const statsResult = await pool.query(`
        SELECT
          pg_database_size(current_database()) as db_size,
          pg_size_pretty(pg_database_size(current_database())) as db_size_readable
      `);
      
      return {
        connected: true,
        tables: parseInt(tablesResult.rows[0].total_tables),
        databaseSize: statsResult.rows[0].db_size,
        databaseSizeReadable: statsResult.rows[0].db_size_readable,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error("Erro ao verificar estado do banco:", error);
      return {
        connected: false,
        error: String(error)
      };
    }
  }
  
  /**
   * Encerra as conexões com o banco
   */
  async close(): Promise<void> {
    await pool.end();
  }
}

// Instância singleton para uso em toda a aplicação
export const drizzleManager = new DrizzleManager();