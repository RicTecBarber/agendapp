import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { tenantMiddleware, requireTenant } from "./middleware";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Servir arquivos estáticos da pasta de uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Aplicar middleware de tenant para todas as requisições
app.use(tenantMiddleware);

// Aplicar middleware de validação de tenant apenas para rotas API (exceto system)
// Isso garante que ações de dados sempre terão um tenant identificado
app.use('/api', (req, res, next) => {
  // Ignora rotas específicas
  if (req.path.startsWith('/system/') || 
      req.path === '/login' || 
      req.path === '/logout' || 
      req.path === '/user' || 
      req.path === '/register') {
    return next();
  }
  
  // Para todas as outras rotas /api, exige um tenant
  requireTenant(req, res, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Função para garantir que o tenant padrão exista no sistema
 */
async function ensureDefaultTenantExists() {
  try {
    console.log("Verificando existência do tenant padrão 'barbearia-modelo'...");
    const defaultTenant = await storage.getTenantBySlug('barbearia-modelo');
    
    if (!defaultTenant) {
      console.log("Tenant padrão 'barbearia-modelo' não encontrado. Criando...");
      const newTenant = await storage.createTenant({
        name: "Barbearia Modelo",
        slug: "barbearia-modelo",
        active: true,
        is_active: true,
        production_url: null
      });
      console.log("Tenant padrão criado com sucesso:", newTenant);
    } else {
      // Garantir que o tenant esteja ativo
      if (!defaultTenant.is_active) {
        console.log("Tenant padrão 'barbearia-modelo' encontrado, mas está inativo. Ativando...");
        await storage.activateTenant(defaultTenant.id);
        console.log("Tenant padrão ativado com sucesso.");
      } else {
        console.log("Tenant padrão 'barbearia-modelo' já existe e está ativo:", defaultTenant);
      }
    }
  } catch (error) {
    console.error("Erro ao verificar/criar tenant padrão:", error);
  }
}

(async () => {
  // Garantir que o tenant padrão exista antes de registrar as rotas
  await ensureDefaultTenantExists();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('Error:', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
