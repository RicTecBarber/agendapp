import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/hooks/use-tenant";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Pencil, Plus, Trash2, Package } from "lucide-react";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  stock_quantity: z.coerce.number().int().min(0, "Quantidade não pode ser negativa"),
  category: z.string().min(1, "Categoria é obrigatória"),
  image_url: z.string().optional().nullable(),
  image: z
    .instanceof(FileList)
    .optional()
    .refine(
      (files) => {
        if (!files) return true;
        if (files.length === 0) return true;
        return Array.from(files).every(
          (file) => 
            file.type === "image/jpeg" || 
            file.type === "image/png" || 
            file.type === "image/gif" || 
            file.type === "image/webp"
        );
      },
      {
        message: "Apenas imagens JPEG, PNG, GIF e WebP são permitidas",
      }
    )
    .refine(
      (files) => {
        if (!files) return true;
        if (files.length === 0) return true;
        return Array.from(files).every((file) => file.size <= 5 * 1024 * 1024);
      },
      {
        message: "O tamanho máximo do arquivo é 5MB",
      }
    ),
});

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type CategoryOption = {
  value: string;
  label: string;
};

function ProductForm({ 
  initialData, 
  onSubmit, 
  categories 
}: { 
  initialData?: Product, 
  onSubmit: (data: any) => void, 
  categories: CategoryOption[] 
}) {
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      price: 0,
      stock_quantity: 0,
      category: "outros",
      image_url: "",
    }
  });
  
  // Estado para mostrar prévia da imagem (quando disponível)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade em Estoque</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Campo de categoria oculto com valor padrão */}
        <input type="hidden" {...form.register("category")} value="outros" />

        {/* Campo para upload de imagem */}
        <FormField
          control={form.control}
          name="image"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Imagem do Produto</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Exibe a prévia da imagem quando disponível */}
                  {imagePreview && (
                    <div className="w-full max-h-24 relative rounded-md overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Prévia da imagem" 
                        className="w-auto max-h-24 object-contain mx-auto"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => {
                          setImagePreview(null);
                          onChange(null);
                          form.setValue("image_url", "");
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                  
                  {/* Input para seleção de arquivo */}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        onChange(files);
                        
                        // Criar URL temporária para prévia da imagem
                        const previewUrl = URL.createObjectURL(files[0]);
                        setImagePreview(previewUrl);
                      }
                    }}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Selecione uma imagem para o produto (máximo 5MB, formatos aceitos: JPG, PNG, GIF, WebP)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Campo oculto para URL da imagem - será preenchida pelo backend após upload */}
        <input type="hidden" {...form.register("image_url")} />

        <DialogFooter>
          <Button type="submit">Salvar</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ProductsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenant } = useTenant();

  // Buscar todos os produtos
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/products", tenant],
    queryFn: async () => {
      console.log("[Query] Buscando produtos para tenant:", tenant);
      // Usar apiRequest para manter o contexto do tenant
      const response = await apiRequest("GET", "/api/products");
      if (!response.ok) {
        console.error("[Query] Erro ao buscar produtos:", response.status, response.statusText);
        throw new Error("Erro ao buscar produtos");
      }
      const data = await response.json();
      console.log(`[Query] Produtos recebidos: ${data.length}`);
      
      // Verificar a integridade dos dados recebidos
      if (!Array.isArray(data)) {
        console.error("[Query] Dados recebidos não são um array:", data);
        return [];
      }
      
      // Registrar IDs de produtos recebidos para depuração
      if (data.length > 0) {
        console.log("[Query] IDs dos produtos recebidos:", data.map((p: any) => p.id).join(", "));
      } else {
        console.log("[Query] Nenhum produto recebido");
      }
      
      return data;
    },
    enabled: !!tenant, // Só executa a query quando tiver o tenant
  });

  // Buscar categorias de produtos
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/products/categories", tenant],
    queryFn: async () => {
      console.log("Buscando categorias para tenant:", tenant);
      // Usar apiRequest para manter o contexto do tenant
      const response = await apiRequest("GET", "/api/products/categories");
      if (!response.ok) {
        throw new Error("Erro ao buscar categorias");
      }
      return response.json();
    },
    enabled: !!tenant, // Só executa a query quando tiver o tenant
  });

  // Mutation para adicionar um produto
  const addProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/products", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", tenant] });
      setIsAddDialogOpen(false);
      toast({
        title: "Produto adicionado",
        description: "O produto foi adicionado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar um produto
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log(`[Mutation] Enviando requisição PUT para /api/products/${id} com dados:`, JSON.stringify(data));
      const res = await apiRequest("PUT", `/api/products/${id}`, data);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Mutation] Erro ao atualizar produto. Status: ${res.status}, Resposta:`, errorText);
        throw new Error(`Falha ao atualizar produto: ${res.statusText}`);
      }
      const responseData = await res.json();
      console.log(`[Mutation] Resposta do servidor após atualização:`, JSON.stringify(responseData));
      return responseData;
    },
    onSuccess: (data) => {
      console.log("[Mutation] Produto atualizado com sucesso:", JSON.stringify(data));
      
      if (!data || !data.id) {
        console.error("[Mutation] Resposta da API não contém dados do produto ou ID");
        toast({
          title: "Aviso",
          description: "Produto atualizado, mas com resposta incompleta. Atualizando lista...",
          variant: "warning",
        });
        // Força a busca de todos os produtos novamente
        refetch();
        setEditProduct(null);
        return;
      }
      
      // Estratégia 1: Invalidar a consulta para forçar nova busca
      console.log(`[Mutation] Invalidando queryKey ["/api/products", ${tenant}]`);
      queryClient.invalidateQueries({ queryKey: ["/api/products", tenant] });
      
      // Estratégia 2: Atualizar o cache diretamente com os dados recebidos
      queryClient.setQueryData(["/api/products", tenant], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) {
          console.log("[Mutation] Cache anterior não existe ou não é um array, usando apenas dado recebido");
          return [data];
        }
        
        console.log(`[Mutation] Atualizando cache local. Produtos antes: ${oldData.length}`);
        
        // Verificamos se o produto já existe na lista
        const existingProductIndex = oldData.findIndex((product: any) => product.id === data.id);
        
        if (existingProductIndex >= 0) {
          console.log(`[Mutation] Produto ${data.id} encontrado na posição ${existingProductIndex}, substituindo`);
          // Criar uma nova cópia do array para garantir que o React detecte a mudança
          const updatedData = [...oldData];
          updatedData[existingProductIndex] = data;
          return updatedData;
        } else {
          console.log(`[Mutation] Produto ${data.id} não encontrado no cache, adicionando`);
          // Adicionar o produto ao array existente
          return [...oldData, data];
        }
      });
      
      // Estratégia 3: Buscar novamente todos os produtos após um pequeno delay
      setTimeout(() => {
        console.log("[Mutation] Executando refetch após timeout para garantir dados atualizados");
        refetch();
      }, 500);
      
      setEditProduct(null);
      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      console.error("[Mutation] Erro na mutação ao atualizar produto:", error);
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir um produto
  const deleteProductMutation = useMutation({
    mutationFn: async ({id, tenant_id}: {id: number, tenant_id: number | null}) => {
      await apiRequest("DELETE", `/api/products/${id}`, {tenant_id});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", tenant] });
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para upload de imagem
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        console.log("Iniciando upload da imagem:", file.name, file.type, file.size);
        
        const formData = new FormData();
        formData.append("image", file);
        
        // Adicionar o parâmetro de tenant à URL (solução para o problema de tenant não identificado)
        let uploadUrl = '/api/upload/product';
        if (tenant) {
          uploadUrl = `${uploadUrl}?tenant=${tenant}`;
          console.log("Enviando upload para URL com tenant:", uploadUrl);
        } else {
          console.warn("Tenant não disponível para upload, tentando extrair da URL atual");
          // Tentar extrair tenant da URL atual como fallback
          const currentTenant = localStorage.getItem('lastTenant');
          if (currentTenant) {
            uploadUrl = `${uploadUrl}?tenant=${currentTenant}`;
            console.log("Usando tenant do localStorage para upload:", uploadUrl);
          }
        }
        
        const response = await fetch(uploadUrl, {
          method: "POST",
          // Importante: não definir o Content-Type ao enviar FormData
          // O navegador configurará automaticamente o boundary correto
          body: formData,
          // Adicionamos os headers padrão do apiRequest, menos o Content-Type que é definido automaticamente pelo FormData
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erro no upload:", response.status, errorText);
          throw new Error(`Falha ao fazer upload da imagem: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log("Upload concluído com sucesso:", result);
        return result;
      } catch (error) {
        console.error("Erro durante upload:", error);
        throw error;
      }
    },
  });

  // Handler para adicionar produto
  const handleAddProduct = async (data: any) => {
    try {
      console.log("Iniciando adição de produto com dados:", JSON.stringify(data));
      
      // Faz upload da imagem, se houver
      if (data.image && data.image.length > 0) {
        const file = data.image[0];
        console.log("Imagem encontrada para upload:", file.name);
        
        // Processar upload da imagem
        const uploadResult = await uploadImageMutation.mutateAsync(file);
        console.log("Upload concluído com resultado:", uploadResult);
        
        // Atualiza a URL da imagem com o resultado do upload
        data.image_url = uploadResult.url;
      } else {
        console.log("Nenhuma imagem para upload");
      }
      
      // Remove o campo 'image' antes de enviar ao backend
      const { image, ...productData } = data;
      
      // Adiciona tenant_id aos dados do produto
      const tenantId = tenant ? Number(tenant) : null;
      console.log("Tenant ID para o produto:", tenantId);
      
      const productDataWithTenant = {
        ...productData,
        tenant_id: tenantId
      };
      
      console.log("Enviando dados do produto:", JSON.stringify(productDataWithTenant));
      
      // Enviar dados do produto
      addProductMutation.mutate(productDataWithTenant);
    } catch (error: any) {
      console.error("Erro ao processar adição de produto:", error);
      toast({
        title: "Erro ao adicionar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handler para atualizar produto
  const handleUpdateProduct = async (data: any) => {
    if (!editProduct) return;
    
    try {
      console.log("Iniciando atualização de produto:", editProduct.id, JSON.stringify(data));
      
      // Faz upload da imagem, se houver uma nova imagem
      if (data.image && data.image.length > 0) {
        const file = data.image[0];
        console.log("Nova imagem encontrada para upload:", file.name);
        
        // Processar upload da imagem
        const uploadResult = await uploadImageMutation.mutateAsync(file);
        console.log("Upload concluído com resultado:", uploadResult);
        
        // Atualiza a URL da imagem com o resultado do upload
        data.image_url = uploadResult.url;
      } else {
        console.log("Mantendo imagem existente:", data.image_url);
      }
      
      // Remove o campo 'image' antes de enviar ao backend
      const { image, ...productData } = data;
      
      // Adiciona tenant_id aos dados do produto
      const tenantId = tenant ? Number(tenant) : null;
      console.log("Tenant ID para o produto:", tenantId);
      
      const productDataWithTenant = {
        ...productData,
        tenant_id: tenantId
      };
      
      console.log("Enviando dados atualizados:", JSON.stringify(productDataWithTenant));
      
      // Enviar dados do produto atualizado
      updateProductMutation.mutate({ id: editProduct.id, data: productDataWithTenant });
    } catch (error: any) {
      console.error("Erro ao atualizar produto:", error);
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handler para excluir produto
  const handleDeleteProduct = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      const tenantId = tenant ? Number(tenant) : null;
      console.log("Excluindo produto:", id, "do tenant:", tenantId);
      deleteProductMutation.mutate({id, tenant_id: tenantId});
    }
  };

  // Função para obter label da categoria
  const getCategoryLabel = (value: string) => {
    const category = categories.find((c: CategoryOption) => c.value === value);
    return category ? category.label : value;
  };

  return (
    <AdminLayout title="Produtos">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Produtos</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Adicionar Produto</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do novo produto abaixo.
                </DialogDescription>
              </DialogHeader>
              <ProductForm
                onSubmit={handleAddProduct}
                categories={categories}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: Product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative h-48 bg-gray-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-24 w-24 text-gray-300" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>
                    Produto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-xs block text-muted-foreground">Preço</Label>
                      <p className="font-bold text-lg">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-xs block text-muted-foreground">Estoque</Label>
                      <p className={`font-medium ${product.stock_quantity <= 5 ? 'text-red-500' : ''}`}>
                        {product.stock_quantity} un
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setEditProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Editar Produto</DialogTitle>
                        <DialogDescription>
                          Atualize os detalhes do produto abaixo.
                        </DialogDescription>
                      </DialogHeader>
                      {editProduct && (
                        <ProductForm
                          initialData={editProduct}
                          onSubmit={handleUpdateProduct}
                          categories={categories}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {products.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">Nenhum produto cadastrado</h3>
            <p className="mt-2 text-sm text-gray-500">
              Comece adicionando um produto clicando no botão acima.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default ProductsPage;