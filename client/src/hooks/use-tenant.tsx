import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";

// Função para extrair o tenant da URL (exportada para uso direto)
export function getTenantFromUrl(locationPath?: string): string | null {
  try {
    // Se um path for fornecido, usa-o para extrair o tenant
    if (locationPath) {
      // Verifica se o path contém '?'
      const searchParams = locationPath.includes('?') 
        ? new URLSearchParams(locationPath.split('?')[1]) 
        : new URLSearchParams();
      return searchParams.get('tenant');
    } 
    // Caso contrário, usa a URL atual
    const url = new URL(window.location.href);
    return url.searchParams.get('tenant');
  } catch (error) {
    console.error("Erro ao extrair o tenant da URL:", error);
    return null;
  }
}

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

  // Ao inicializar, verifica o tenant na URL
  useEffect(() => {
    const tenantFromUrl = getTenantFromUrl();
    if (tenantFromUrl) {
      setTenantState(tenantFromUrl);
    }
  }, [location]);

  // Função para extrair o tenant da URL atual
  const getTenantFromUrl = (locationPath?: string): string | null => {
    try {
      // Se um path for fornecido, usa-o para extrair o tenant
      if (locationPath) {
        // Verifica se o path contém '?'
        const searchParams = locationPath.includes('?') 
          ? new URLSearchParams(locationPath.split('?')[1]) 
          : new URLSearchParams();
        return searchParams.get('tenant');
      } 
      // Caso contrário, usa a URL atual
      const url = new URL(window.location.href);
      return url.searchParams.get('tenant');
    } catch (error) {
      console.error("Erro ao extrair o tenant da URL:", error);
      return null;
    }
  };

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
    const currentTenant = tenant || getTenantFromUrl();
    
    if (!currentTenant) {
      const lastTenant = localStorage.getItem('lastTenant');
      
      if (lastTenant) {
        // Redireciona para a mesma URL, mas com o tenant do localStorage
        const path = window.location.pathname + window.location.search;
        const hasParams = path.includes('?');
        const redirectUrl = hasParams 
          ? `${path}&tenant=${lastTenant}`
          : `${path}?tenant=${lastTenant}`;
        
        window.location.href = redirectUrl;
        return false;
      }
      
      // Se não tiver um tenant no localStorage, retorna false
      return false;
    }
    
    return true;
  };

  // Função para redirecionar mantendo o tenant
  const redirectWithTenant = (path: string) => {
    navigate(getUrlWithTenant(path));
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