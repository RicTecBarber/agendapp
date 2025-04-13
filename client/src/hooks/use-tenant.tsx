import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";

// Função para extrair o tenant da URL (exportada para uso direto)
export function extractTenantFromUrl(locationPath?: string): string | null {
  try {
    // Se um path for fornecido, usa-o para extrair o tenant
    if (locationPath) {
      // Melhorado para lidar com URLs complexas, tentando várias abordagens:
      
      // 1. Tenta extrair de parâmetros de query normais
      if (locationPath.includes('?')) {
        const searchParams = new URLSearchParams(locationPath.split('?')[1]);
        const tenantParam = searchParams.get('tenant');
        if (tenantParam) return tenantParam;
      }
      
      // 2. Verifica se o tenant está no formato /tenant=SLUG no final da URL
      const tenantMatch = locationPath.match(/tenant=([^&]+)/);
      if (tenantMatch && tenantMatch[1]) {
        return tenantMatch[1];
      }
    }
    
    // Caso contrário, usa a URL atual com a mesma lógica aprimorada
    const currentUrl = window.location.href;
    
    // 1. Tenta da maneira padrão com URLSearchParams
    const url = new URL(currentUrl);
    const tenantParam = url.searchParams.get('tenant');
    if (tenantParam) return tenantParam;
    
    // 2. Tenta extrair com regex se estiver em um formato não padrão
    const tenantMatch = currentUrl.match(/tenant=([^&]+)/);
    if (tenantMatch && tenantMatch[1]) {
      return tenantMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao extrair o tenant da URL:", error);
    // Log detalhado para diagnóstico
    console.debug("Contexto da falha:", { locationPath, currentUrl: window.location.href });
    return null;
  }
}

// Mantém a compatibilidade com o código existente
export const getTenantFromUrl = extractTenantFromUrl;

// Função para adicionar o tenant a uma URL (exportada para uso direto)
export function getUrlWithTenant(path: string): string {
  const currentTenant = getTenantFromUrl();
  
  if (!currentTenant) {
    return path;
  }

  // Verifica se o path já tem parâmetros de query
  const hasQueryParams = path.includes('?');
  
  if (hasQueryParams) {
    // Se já tiver parâmetros, adiciona o tenant como um parâmetro adicional
    return `${path}&tenant=${currentTenant}`;
  } else {
    // Se não tiver parâmetros, adiciona o tenant como o primeiro parâmetro
    return `${path}?tenant=${currentTenant}`;
  }
}

interface TenantContextType {
  tenant: string | null;
  setTenant: (tenant: string | null) => void;
  getUrlWithTenant: (path: string) => string;
  getTenantFromUrl: (locationPath?: string) => string | null;
  ensureTenant: () => boolean; // Retorna true se o tenant está definido
  redirectWithTenant: (path: string) => void;
}

export const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenantState] = useState<string | null>(null);
  const [location, navigate] = useLocation();

  // Função interna que usa a implementação exportada
  const getTenantFromUrlInternal = (locationPath?: string): string | null => {
    // Usa a função exportada para garantir que a lógica seja a mesma
    return extractTenantFromUrl(locationPath);
  };
  
  // Ao inicializar, verifica o tenant na URL
  useEffect(() => {
    const tenantFromUrl = getTenantFromUrlInternal();
    if (tenantFromUrl) {
      setTenantState(tenantFromUrl);
    }
  }, [location]);

  // Função para atualizar o tenant e também guardar no localStorage
  const setTenant = (newTenant: string | null) => {
    setTenantState(newTenant);
    
    // Armazenar o tenant no localStorage para persistência
    if (newTenant) {
      localStorage.setItem('lastTenant', newTenant);
    } else {
      localStorage.removeItem('lastTenant');
    }
  };

  // Função para adicionar o tenant a uma URL
  const getUrlWithTenant = (path: string): string => {
    const currentTenant = tenant || getTenantFromUrl();
    
    if (!currentTenant) {
      return path;
    }

    // Verifica se o path já tem parâmetros de query
    const hasQueryParams = path.includes('?');
    
    if (hasQueryParams) {
      // Se já tiver parâmetros, adiciona o tenant como um parâmetro adicional
      return `${path}&tenant=${currentTenant}`;
    } else {
      // Se não tiver parâmetros, adiciona o tenant como o primeiro parâmetro
      return `${path}?tenant=${currentTenant}`;
    }
  };

  // Função para garantir que o tenant está definido
  const ensureTenant = (): boolean => {
    // Tentar obter o tenant de várias fontes
    const currentTenant = tenant || extractTenantFromUrl() || localStorage.getItem('lastTenant');
    
    if (!currentTenant) {
      console.warn('Nenhum tenant identificado em nenhuma fonte (URL, estado ou localStorage)');
      // Tente um valor padrão específico para o seu sistema
      const defaultTenant = 'barbearia1'; // Tenant padrão como último recurso
      console.log(`Tentando usar tenant padrão: ${defaultTenant}`);
      
      // Redirecionar com o tenant padrão
      const path = window.location.pathname + window.location.search;
      const hasParams = path.includes('?');
      const redirectUrl = hasParams 
        ? `${path}&tenant=${defaultTenant}`
        : `${path}?tenant=${defaultTenant}`;
      
      // Usar window.location.href para um redirecionamento completo que garanta uma nova carga
      window.location.href = redirectUrl;
      return false;
    }
    
    // Se o tenant não estiver na URL, mas existir em outra fonte, redirecionar
    const tenantInUrl = extractTenantFromUrl();
    if (!tenantInUrl && currentTenant) {
      console.log(`Tenant não está na URL, redirecionando com tenant=${currentTenant}`);
      
      // Adicionar tenant mais robustamente
      const url = new URL(window.location.href);
      url.searchParams.set('tenant', currentTenant);
      
      // Usar window.location.href para garantir um recarregamento completo
      console.log(`Redirecionando para URL completa: ${url.toString()}`);
      window.location.href = url.toString();
      return false;
    }
    
    // Se o tenant está presente mas ainda não foi armazenado no estado, armazene-o
    if (tenantInUrl && tenantInUrl !== tenant) {
      console.log(`Atualizando estado do tenant: ${tenantInUrl}`);
      setTenant(tenantInUrl);
    }
    
    return true;
  };

  // Função para redirecionar mantendo o tenant
  const redirectWithTenant = (path: string) => {
    const urlWithTenant = getUrlWithTenant(path);
    console.log(`Redirecionando para: ${urlWithTenant} (de: ${path})`);
    navigate(urlWithTenant);
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        setTenant,
        getUrlWithTenant,
        getTenantFromUrl,
        ensureTenant,
        redirectWithTenant
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}