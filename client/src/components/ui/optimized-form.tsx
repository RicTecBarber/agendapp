import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm, UseFormReturn, FieldValues, UseFormProps, SubmitHandler, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCachedForm } from '@/hooks/use-cache';
import { useShouldOptimize } from '@/hooks/use-mobile';
import { useLeakPrevention } from '@/lib/memory-management';
import { cn } from '@/lib/utils';

interface OptimizedFormProps<TFieldValues extends FieldValues> {
  id: string; // Identificador único para cache do formulário
  defaultValues: DefaultValues<TFieldValues>;
  validationSchema?: z.ZodType<any, any>;
  onSubmit: SubmitHandler<TFieldValues>;
  autoSave?: boolean;
  formProps?: React.FormHTMLAttributes<HTMLFormElement>;
  children: (form: UseFormReturn<TFieldValues>) => React.ReactNode;
  className?: string;
  watchFields?: (keyof TFieldValues)[];
  debug?: boolean;
  onError?: (errors: any) => void;
}

/**
 * Componente de formulário otimizado para dispositivos móveis
 * que utiliza cache para salvar progresso, reduz renderizações
 * e miniza o impacto na memória
 */
export function OptimizedForm<TFieldValues extends FieldValues>({
  id,
  defaultValues,
  validationSchema,
  onSubmit,
  autoSave = true,
  formProps,
  children,
  className,
  watchFields = [],
  debug = false,
  onError
}: OptimizedFormProps<TFieldValues>) {
  // Hook para detectar vazamentos de memória
  const { isMounted, cleanupReferences } = useLeakPrevention('OptimizedForm');
  
  // Referência para o elemento do formulário
  const formRef = useRef<HTMLFormElement>(null);
  
  // Identificador único para cache
  const formId = `form:${id}`;
  
  // Verificar se devemos otimizar este formulário
  const shouldOptimize = useShouldOptimize();
  
  // Cache do formulário
  const {
    formData,
    updateFormValues,
    isDirty,
    isSaving
  } = useCachedForm<TFieldValues>(
    formId,
    defaultValues,
    {
      autoSaveDelay: shouldOptimize ? 3000 : 1000, // Atraso maior em dispositivos otimizados
      disabled: !autoSave
    }
  );
  
  // Inicializar react-hook-form com o validador zod se fornecido
  const formOptions: UseFormProps<TFieldValues> = {
    defaultValues: formData as DefaultValues<TFieldValues>,
    mode: shouldOptimize ? 'onBlur' : 'onChange', // Reduzir validações em dispositivos otimizados
    reValidateMode: shouldOptimize ? 'onBlur' : 'onChange',
    criteriaMode: 'firstError',
    ...(validationSchema ? { resolver: zodResolver(validationSchema) } : {})
  };
  
  // Instanciar o formulário
  const form = useForm<TFieldValues>(formOptions);
  
  // Estado para controlar se o formulário foi enviado
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Observar mudanças em campos específicos quando especificado
  useEffect(() => {
    if (!watchFields.length) return;
    
    const subscription = form.watch((values, { name }) => {
      // Só atualizar o cache se o campo alterado estiver na lista de campos a observar
      if (name && watchFields.includes(name as keyof TFieldValues) && autoSave) {
        updateFormValues(values as Partial<TFieldValues>);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, watchFields, autoSave, updateFormValues]);
  
  // Callback otimizado para envio do formulário
  const handleSubmit = useCallback(async (data: TFieldValues) => {
    if (!isMounted.current || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(data);
      setIsSubmitted(true);
      
      // Limpar campos apenas se o envio for bem-sucedido
      if (shouldOptimize) {
        form.reset(undefined, { keepDefaultValues: true });
      }
    } catch (error) {
      console.error("Erro ao enviar formulário:", error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isMounted, isSubmitting, onSubmit, onError, shouldOptimize]);
  
  // Ao desmontar, limpar referencias para evitar vazamentos
  useEffect(() => {
    return () => {
      cleanupReferences([form, formRef]);
    };
  }, [cleanupReferences, form]);
  
  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn(
        'space-y-4',
        isDirty && 'form-dirty',
        isSubmitted && 'form-submitted',
        isSaving && 'form-saving',
        className
      )}
      {...formProps}
    >
      {children(form)}
      
      {debug && (
        <div className="p-2 mt-4 text-xs bg-muted rounded-md">
          <details>
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <pre className="mt-2 overflow-auto max-h-[200px] p-2 bg-background rounded">
              {JSON.stringify({
                values: form.getValues(),
                errors: form.formState.errors,
                isDirty,
                isSubmitted,
                isSubmitting,
                isSaving
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </form>
  );
}

/**
 * Componente para formulários de pesquisa otimizados
 */
interface OptimizedSearchFormProps<TFieldValues extends FieldValues> {
  id: string;
  defaultValues: DefaultValues<TFieldValues>;
  onSearch: (data: TFieldValues) => void;
  debounceTime?: number;
  className?: string;
  searchOnRender?: boolean;
  children: (form: UseFormReturn<TFieldValues>) => React.ReactNode;
}

export function OptimizedSearchForm<TFieldValues extends FieldValues>({
  id,
  defaultValues,
  onSearch,
  debounceTime = 350,
  className,
  searchOnRender = false,
  children
}: OptimizedSearchFormProps<TFieldValues>) {
  const { isMounted } = useLeakPrevention('OptimizedSearchForm');
  const shouldOptimize = useShouldOptimize();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const form = useForm<TFieldValues>({
    defaultValues,
    mode: shouldOptimize ? 'onBlur' : 'onChange', // Evitar validação em campo por campo
  });
  
  // Executar busca com debounce quando os campos mudarem
  const handleSearchDebounced = useCallback((data: TFieldValues) => {
    if (!isMounted.current) return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(data);
    }, shouldOptimize ? debounceTime * 2 : debounceTime); // Debounce maior em dispositivos otimizados
  }, [onSearch, debounceTime, shouldOptimize, isMounted]);
  
  // Observar mudanças nos campos para disparar a busca
  useEffect(() => {
    const subscription = form.watch((data) => {
      handleSearchDebounced(data as TFieldValues);
    });
    
    if (searchOnRender) {
      onSearch(form.getValues());
    }
    
    return () => {
      subscription.unsubscribe();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [form, handleSearchDebounced, onSearch, searchOnRender]);
  
  // Manipulador de envio do formulário (usado quando o usuário pressiona Enter)
  const handleSubmit = useCallback((data: TFieldValues) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    onSearch(data);
  }, [onSearch]);
  
  return (
    <form 
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn('relative', className)}
    >
      {children(form)}
    </form>
  );
}

/**
 * Componente para campos de formulário que são renderizados condicionalmente
 * de maneira otimizada e com gestão de memória
 */
interface OptimizedFormFieldProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: string;
  watch?: boolean;
  condition?: boolean | null;
  children: React.ReactNode;
  className?: string;
}

export function OptimizedFormField<TFieldValues extends FieldValues>({
  form,
  name,
  watch = false,
  condition = true,
  children,
  className
}: OptimizedFormFieldProps<TFieldValues>) {
  // Observar valor do campo apenas se necessário
  const [shouldRender, setShouldRender] = useState(!!condition);
  
  useEffect(() => {
    if (watch && condition === undefined) {
      const subscription = form.watch((value, { name: changedField }) => {
        const fieldValue = form.getValues(name as any);
        const shouldShow = !!fieldValue;
        
        if (changedField === name && shouldShow !== shouldRender) {
          setShouldRender(shouldShow);
        }
      });
      
      return () => subscription.unsubscribe();
    } else if (condition !== undefined) {
      setShouldRender(!!condition);
    }
  }, [form, name, watch, condition, shouldRender]);
  
  // Não renderizar nada se a condição não for satisfeita
  if (!shouldRender) {
    return null;
  }
  
  return (
    <div className={cn('animate-in fade-in', className)}>
      {children}
    </div>
  );
}

/**
 * Componente de campo de formulário que atualiza apenas
 * quando o valor ou erro associado muda
 */
interface OptimizedFieldContainerProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: keyof TFieldValues | (keyof TFieldValues)[];
  children: React.ReactNode;
  className?: string;
  onChange?: (value: any) => void;
}

export function OptimizedFieldContainer<TFieldValues extends FieldValues>({
  form,
  name,
  children,
  className,
  onChange
}: OptimizedFieldContainerProps<TFieldValues>) {
  // Determinar se estamos observando um único campo ou vários
  const isMultipleFields = Array.isArray(name);
  
  // Estado para armazenar o valor do campo e forçar re-renderização
  const [, setValue] = useState<any>(isMultipleFields 
    ? name.map(n => form.getValues(n)) 
    : form.getValues(name)
  );
  
  // Efeito para observar mudanças no valor do campo ou erros
  useEffect(() => {
    const subscription = form.watch((value, { name: changedField, type }) => {
      // Verificar se o campo que mudou é o que estamos observando
      const isRelevantField = isMultipleFields 
        ? name.includes(changedField as keyof TFieldValues)
        : changedField === name;
      
      // Atualizar o estado se o campo relevante for alterado
      if (isRelevantField || type === 'all') {
        const newValue = isMultipleFields 
          ? name.map(n => form.getValues(n)) 
          : form.getValues(name);
        
        setValue(newValue);
        
        if (onChange) {
          onChange(newValue);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, name, isMultipleFields, onChange]);
  
  return (
    <div className={className}>
      {children}
    </div>
  );
}