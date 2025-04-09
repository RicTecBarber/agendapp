import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Interface para estender a Request com propriedades adicionais
declare global {
  namespace Express {
    interface Request {
      tenantId: number | null;
      tenantSlug: string | null;
    }
  }
}

/**
 * Middleware para identificar o tenant e garantir o isolamento de dados
 * Este middleware detecta o tenant a partir do parâmetro de consulta 'tenant' 
 * e armazena a informação na requisição para uso posterior
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Inicializa as propriedades
  req.tenantId = null;
  req.tenantSlug = null;
  
  // Verifica se há um parâmetro de consulta 'tenant'
  const tenantSlug = req.query.tenant as string;
  
  if (tenantSlug) {
    try {
      // Busca o tenant pelo slug
      const tenant = await storage.getTenantBySlug(tenantSlug);
      
      if (tenant) {
        // Verifica se o tenant está ativo
        if (!tenant.is_active) {
          // Se o tenant não estiver ativo, apenas loga um aviso e continua
          // mas não define o tenantId para que operações de dados não sejam permitidas
          console.warn(`Tentativa de acesso a tenant inativo: ${tenantSlug}`);
        } else {
          // Se o tenant estiver ativo, armazena seu ID na requisição
          req.tenantId = tenant.id;
          req.tenantSlug = tenant.slug;
          console.log(`Tenant identificado: ${tenant.name} (ID: ${tenant.id}, Slug: ${tenant.slug})`);
        }
      } else {
        console.warn(`Tenant não encontrado para slug: ${tenantSlug}`);
      }
    } catch (error) {
      console.error(`Erro ao processar tenant ${tenantSlug}:`, error);
    }
  }
  
  // Continua com a próxima middleware/rota
  next();
};

/**
 * Middleware para validar se o acesso está sendo feito a um tenant válido
 * Este middleware bloqueia requisições que não tenham um tenant identificado
 * para rotas que exigem isolamento por tenant
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  // Rotas do sistema são isentas desta verificação
  if (req.path.startsWith('/api/system/')) {
    return next();
  }
  
  // Se não houver tenant identificado, retorna erro
  if (!req.tenantId) {
    return res.status(400).json({
      error: 'Tenant não identificado',
      message: 'Para acessar esta API, você precisa especificar um tenant válido e ativo usando o parâmetro ?tenant=SLUG'
    });
  }
  
  // Tenant válido, continua com a próxima middleware/rota
  next();
};

/**
 * Middleware para garantir que apenas administradores do sistema possam
 * acessar determinadas rotas
 */
export const isSystemAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  
  // Verificar se o usuário tem a propriedade isSystemAdmin
  if (!req.user || !('isSystemAdmin' in req.user)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  
  next();
};

/**
 * Middleware para verificar se o usuário é um administrador (pode ser de qualquer tenant)
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Acesso permitido apenas para administradores" });
  }
  
  next();
};

/**
 * Função auxiliar para aplicação do tenant_id nos objetos
 * Esta função adiciona automaticamente o tenant_id em objetos que
 * serão salvos no banco de dados
 */
export const applyTenantId = <T extends Record<string, any>>(obj: T, tenantId: number | null): T => {
  if (tenantId === null) {
    return obj;
  }
  
  return {
    ...obj,
    tenant_id: tenantId
  };
};