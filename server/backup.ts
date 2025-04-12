import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Carrega variáveis de ambiente 
dotenv.config();

// Use __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

/**
 * Script para criar backup do banco de dados PostgreSQL
 * Este script utiliza pg_dump para criar um backup completo
 * do banco de dados antes de fazer alterações importantes
 */
async function main() {
  // Verifica se todas as variáveis necessárias estão disponíveis
  const { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT } = process.env;
  
  if (!PGUSER || !PGDATABASE || !PGHOST) {
    console.error("Erro: Variáveis de ambiente necessárias não encontradas.");
    console.error("Necessário: PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT");
    process.exit(1);
  }
  
  // Cria o diretório de backups se não existir
  const backupDir = path.join(__dirname, "../backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Gera um nome de arquivo com timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-${PGDATABASE}-${timestamp}.sql`);
  
  try {
    console.log(`Iniciando backup do banco de dados ${PGDATABASE}...`);
    
    // Constrói o comando pg_dump
    const pgDumpCmd = `PGPASSWORD="${PGPASSWORD}" pg_dump -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -F p -b -v -f "${backupFile}" ${PGDATABASE}`;
    
    // Executa o comando 
    const { stdout, stderr } = await execAsync(pgDumpCmd);
    
    if (stderr && !stderr.includes("connecting to database")) {
      console.error("Aviso durante backup:", stderr);
    }
    
    console.log(`Backup concluído com sucesso: ${backupFile}`);
    
    // Verifica tamanho do arquivo
    const stats = fs.statSync(backupFile);
    console.log(`Tamanho do arquivo de backup: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    return backupFile;
  } catch (error) {
    console.error("Erro durante o backup:", error);
    process.exit(1);
  }
}

// Executa o backup e retorna o caminho do arquivo gerado
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default main;