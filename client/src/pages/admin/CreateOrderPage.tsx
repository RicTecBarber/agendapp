import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import AdminLayout from "@/components/layout/AdminLayout";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Package, 
  Search, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  AlertCircle,
  ArrowLeft as ArrowLeftIcon,
  Scissors,
  RefreshCcw,
  Percent,
  CreditCard,
  Tag,
  ShoppingBag,
  Gift,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category: string;
  image_url: string | null;
};

type Service = {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
};

type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  // Tipo de item (produto ou serviço)
  type?: 'product' | 'service';
};

type OrderFormData = {
  client_name: string;
  client_phone: string;
  payment_method: string;
  notes?: string;
  appointment_id?: number | null;
  discount_percent?: number;
  discount_value?: number;
  discount_type?: 'percent' | 'value' | 'none';
};

const orderFormSchema = z.object({
  client_name: z.string().min(3, "Nome do cliente é obrigatório"),
  client_phone: z.string().min(8, "Telefone do cliente é obrigatório"),
  payment_method: z.string().min(1, "Método de pagamento é obrigatório"),
  notes: z.string().optional(),
  appointment_id: z.number().optional().nullable(),
  discount_percent: z.number().min(0).max(100).optional(),
  discount_value: z.number().min(0).optional(),
  discount_type: z.enum(['percent', 'value', 'none']).default('none'),
});

function CreateOrderPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("products");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [idCounter, setIdCounter] = useState(1);
  // Não precisamos realmente de um estado cartTotal separado, pois podemos calculá-lo diretamente
  // dos itens do carrinho, mas mantemos o setCartTotal como uma função para compatibilidade
  const setCartTotal = (newTotal: number) => {
    // Função vazia, já que não estamos realmente usando um estado separado para o total
    console.log("setCartTotal chamada com:", newTotal);
    // O cartTotal é calculado automaticamente a partir dos itens do carrinho
  };
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { tenant, ensureTenant } = useTenant();

  // Estados para gerenciar desconto
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'value'>('none');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  
  // Formulário para dados do cliente e pagamento
  const orderForm = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      client_name: "",
      client_phone: "",
      payment_method: "dinheiro",
      notes: "",
      appointment_id: null,
      discount_type: 'none',
      discount_percent: 0,
      discount_value: 0,
    },
  });

  // Estado para controlar se estamos adicionando itens a uma comanda existente
  const [isAddingToExistingOrder, setIsAddingToExistingOrder] = useState(false);
  const [existingOrderId, setExistingOrderId] = useState<number | null>(null);
  
  // Efeito para preencher dados do cliente a partir dos parâmetros da URL
  // e adicionar o serviço principal ao carrinho
  // Verificar se o usuário não está autenticado
  // Verificar se o tenant está presente e redirecionando se necessário
  useEffect(() => {
    // Verifica e garante que o tenant esteja presente na URL
    ensureTenant();
  }, [ensureTenant]);
  
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Sessão expirada",
        description: "Por favor, faça login novamente",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, authLoading, navigate, toast]);

  useEffect(() => {
    // Verificar se há parâmetros na URL
    const params = new URLSearchParams(window.location.search);
    const appointmentId = params.get('appointmentId');
    const clientName = params.get('clientName');
    const clientPhone = params.get('clientPhone');
    const serviceId = params.get('serviceId');
    const serviceName = params.get('serviceName');
    const servicePrice = params.get('servicePrice');
    const paymentMethod = params.get('paymentMethod');
    const action = params.get('action');
    const orderId = params.get('orderId');
    
    // Não precisamos verificar tenant aqui - o useEffect com ensureTenant já cuida disso
    // Apenas registramos se temos valores na URL para debug
    if (!tenant && (appointmentId || clientName || clientPhone)) {
      console.log("Parametros presentes mas sem tenant na URL:", {
        appointmentId, clientName, clientPhone
      });
      // O ensureTenant já foi chamado em outro useEffect e vai redirecionar se necessário
    }
    
    console.log("Configuração inicial da página com parâmetros", {
      appointmentId, clientName, clientPhone, serviceId, 
      serviceName, servicePrice, action, orderId
    });
    
    // Verificar se estamos adicionando itens a uma comanda existente
    const addingItems = action === 'add_items' && orderId;
    if (addingItems) {
      setIsAddingToExistingOrder(true);
      const orderIdNum = parseInt(orderId);
      setExistingOrderId(orderIdNum);
      
      // Buscar os itens existentes da comanda para carregá-los no carrinho
      const fetchOrderItems = async () => {
        try {
          console.log("Buscando itens da comanda:", orderIdNum);
          const res = await apiRequest("GET", `/api/orders/${orderIdNum}`, null, tenant);
          const orderData = await res.json();
          
          if (orderData && orderData.items && Array.isArray(orderData.items)) {
            // Converter itens da comanda para o formato do carrinho
            const cartItemsFromOrder = orderData.items.map((item: any) => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.price * item.quantity,
              type: item.type || 'product'
            }));
            
            console.log("Itens encontrados na comanda:", cartItemsFromOrder);
            setCartItems(cartItemsFromOrder);
            
            // Preencher dados do cliente
            if (orderData.client_name && orderData.client_phone) {
              orderForm.setValue('client_name', orderData.client_name);
              orderForm.setValue('client_phone', orderData.client_phone);
            }
            
            // Definir método de pagamento
            if (orderData.payment_method) {
              orderForm.setValue('payment_method', orderData.payment_method);
            }
            
            // Definir observações se existirem
            if (orderData.notes) {
              orderForm.setValue('notes', orderData.notes);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar itens da comanda:", error);
          toast({
            title: "Erro ao carregar itens",
            description: "Não foi possível carregar os itens da comanda existente",
            variant: "destructive",
          });
        }
      };
      
      // Executar a busca de itens
      fetchOrderItems();
      
      // Atualizar título da página no Toast
      toast({
        title: "Adicionar itens à comanda",
        description: `Adicionando itens à comanda #${orderId}`,
      });
    }

    // Se temos os dados do cliente na URL, preencher o formulário
    if (clientName && clientPhone) {
      orderForm.setValue('client_name', clientName);
      orderForm.setValue('client_phone', clientPhone);
      
      // Configurar método de pagamento padrão se fornecido
      if (paymentMethod) {
        orderForm.setValue('payment_method', paymentMethod);
      }
      
      // Se temos um appointmentId, adicionar ao formulário
      if (appointmentId) {
        orderForm.setValue('appointment_id', parseInt(appointmentId));
        
        if (!addingItems) { // Exibir toast apenas se não estiver adicionando itens
          toast({
            title: "Dados do cliente carregados",
            description: `Comanda vinculada ao agendamento #${appointmentId}`,
          });
        }
        
        // Verificar se temos os parâmetros do serviço
        if (serviceId && serviceName && servicePrice && !addingItems) {
          // Adicionar o serviço principal ao carrinho automaticamente
          const price = parseFloat(servicePrice);
          const newItem: OrderItem = {
            id: idCounter,
            product_id: parseInt(serviceId),
            product_name: `${serviceName} (Serviço)`,
            quantity: 1,
            price: price,
            subtotal: price,
            type: 'service' // Marcar explicitamente como serviço
          };
          
          setCartItems([newItem]);
          setIdCounter(prevCounter => prevCounter + 1);
          
          // Definir a aba ativa para 'services' para melhor contexto visual
          setActiveTab('services');
          
          toast({
            title: "Serviço adicionado",
            description: `${serviceName} adicionado automaticamente à comanda`,
            variant: "default"
          });
        }
      }
    }
  }, [orderForm, toast, idCounter]);

  // Buscar produtos
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["/api/products", tenant],
    queryFn: async () => {
      try {
        console.log("Buscando produtos com tenant:", tenant);
        // Garantir que o tenant está sendo passado na URL
        let url = "/api/products";
        if (tenant && !url.includes("tenant=")) {
          url += (url.includes("?") ? "&" : "?") + `tenant=${tenant}`;
        }
        console.log("URL de busca de produtos:", url);
        
        const response = await apiRequest("GET", url);
        console.log("Resposta da API produtos:", response.status);
        if (!response.ok) {
          console.warn("Falha ao buscar produtos da API, usando valores padrão");
          throw new Error("Erro ao buscar produtos");
        }
        const data = await response.json();
        console.log("Dados de produtos recebidos:", Array.isArray(data) ? data.length : "Formato não é array");
        
        // Validar se temos um array
        if (!Array.isArray(data)) {
          console.error("Resposta de produtos não é um array:", data);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        // Produtos de exemplo em caso de falha
        return [];
      }
    },
    enabled: !!tenant, // Só executar a query quando tiver o tenant
    staleTime: 0, // Não usar cache para forçar atualização dos dados
    retry: 3 // Tenta 3 vezes em caso de falha
  });

  // Buscar serviços
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["/api/services", tenant],
    queryFn: async () => {
      try {
        console.log("Buscando serviços com tenant:", tenant);
        // Garantir que o tenant está sendo passado na URL
        let url = "/api/services";
        if (tenant && !url.includes("tenant=")) {
          url += (url.includes("?") ? "&" : "?") + `tenant=${tenant}`;
        }
        console.log("URL de busca de serviços:", url);
        
        const response = await apiRequest("GET", url);
        console.log("Resposta da API serviços:", response.status);
        if (!response.ok) {
          console.warn("Falha ao buscar serviços da API, usando valores padrão");
          throw new Error("Erro ao buscar serviços");
        }
        const data = await response.json();
        console.log("Dados de serviços recebidos:", Array.isArray(data) ? data.length : "Formato não é array");
        
        // Validar se temos um array
        if (!Array.isArray(data)) {
          console.error("Resposta de serviços não é um array:", data);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("Erro ao buscar serviços:", error);
        // Serviços de exemplo em caso de falha
        return [];
      }
    },
    enabled: !!tenant, staleTime: 0, retry: 3 // Só executar a query quando tiver o tenant
  });

  // Buscar categorias de produtos
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/products/categories", tenant],
    queryFn: async () => {
      try {
        console.log("Buscando categorias com tenant:", tenant);
        // Garantir que o tenant está sendo passado na URL
        let url = "/api/products/categories";
        if (tenant && !url.includes("tenant=")) {
          url += (url.includes("?") ? "&" : "?") + `tenant=${tenant}`;
        }
        console.log("URL de busca de categorias:", url);
        
        const response = await apiRequest("GET", url);
        console.log("Resposta da API categorias:", response.status);
        if (!response.ok) {
          console.warn("Falha ao buscar categorias da API, usando valores padrão");
          throw new Error("Erro ao buscar categorias");
        }
        const data = await response.json();
        console.log("Dados de categorias recebidos:", Array.isArray(data) ? data.length : "Formato não é array");
        
        // Validar se temos um array
        if (!Array.isArray(data)) {
          console.error("Resposta de categorias não é um array:", data);
          return [
            { value: "cabelo", label: "Cabelo" },
            { value: "barba", label: "Barba" },
            { value: "produtos", label: "Produtos" },
            { value: "acessorios", label: "Acessórios" }
          ];
        }
        
        return data;
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        // Categorias padrão em caso de falha
        return [
          { value: "cabelo", label: "Cabelo" },
          { value: "barba", label: "Barba" },
          { value: "produtos", label: "Produtos" },
          { value: "acessorios", label: "Acessórios" }
        ];
      }
    },
    enabled: !!tenant, staleTime: 0, retry: 3 // Só executar a query quando tiver o tenant
  });

  // Buscar métodos de pagamento
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/payment-methods", tenant],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/payment-methods");
        if (!response.ok) {
          console.warn("Falha ao buscar métodos de pagamento da API, usando valores padrão");
          throw new Error("Erro ao buscar métodos de pagamento");
        }
        return await response.json();
      } catch (error) {
        console.error("Erro ao buscar métodos de pagamento:", error);
        // Retornar métodos de pagamento padrão em caso de falha
        return [
          { id: "dinheiro", name: "Dinheiro" },
          { id: "cartao_credito", name: "Cartão de Crédito" },
          { id: "cartao_debito", name: "Cartão de Débito" },
          { id: "pix", name: "PIX" },
          { id: "transferencia", name: "Transferência Bancária" },
          { id: "boleto", name: "Boleto Bancário" }
        ];
      }
    }
  });

  // Filtrar produtos com base na pesquisa e categoria
  const filteredProducts = products.filter((product: Product) => {
    // Filtrar por termo de busca
    const searchMatch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtrar por categoria
    const categoryMatch =
      selectedCategory === "all" || product.category === selectedCategory;

    return searchMatch && categoryMatch;
  });

  // Filtrar serviços com base na pesquisa
  const filteredServices = services.filter((service: Service) => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Adicionar produto ao carrinho
  const addToCart = (item: Product | Service, isService = false) => {
    const existingItemIndex = cartItems.findIndex(
      (cartItem) => cartItem.product_id === item.id && 
                    (isService ? cartItem.type === 'service' : cartItem.type !== 'service')
    );

    if (existingItemIndex >= 0) {
      // Se o item já estiver no carrinho, incrementa a quantidade
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity++;
      updatedItems[existingItemIndex].subtotal =
        updatedItems[existingItemIndex].quantity * item.price;
      setCartItems(updatedItems);
    } else {
      // Se for um item novo, adiciona ao carrinho
      const newItem: OrderItem = {
        id: idCounter,
        product_id: item.id,
        product_name: isService ? `${item.name} (Serviço)` : item.name,
        quantity: 1,
        price: item.price,
        subtotal: item.price,
        type: isService ? 'service' : 'product'
      };
      setCartItems([...cartItems, newItem]);
      setIdCounter(idCounter + 1);
    }

    toast({
      title: isService ? "Serviço adicionado" : "Produto adicionado",
      description: `${item.name} adicionado ao carrinho`,
    });
  };

  // Remover produto do carrinho
  const removeFromCart = (itemId: number) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  // Atualizar quantidade de um produto no carrinho
  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity < 1) return;

    const updatedItems = cartItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity,
          subtotal: quantity * item.price,
        };
      }
      return item;
    });

    setCartItems(updatedItems);
  };

  // Calcular total do carrinho (antes do desconto)
  const subtotal = cartItems.reduce((total, item) => total + item.subtotal, 0);
  
  // Calcular desconto e total final
  const calculateDiscount = () => {
    if (discountType === 'none' || subtotal === 0) return 0;
    
    if (discountType === 'percent') {
      return (subtotal * discountPercent) / 100;
    } else if (discountType === 'value') {
      return Math.min(discountValue, subtotal); // Impedir desconto maior que o valor total
    }
    
    return 0;
  };
  
  const discountAmount = calculateDiscount();
  const cartTotal = subtotal - discountAmount;

  // Mutation para criar comanda
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", tenant] });
      toast({
        title: "Comanda criada",
        description: "A comanda foi criada com sucesso",
      });
      // Preservar o tenant ao redirecionar
      if (tenant) {
        navigate(`/admin/orders?tenant=${tenant}`);
      } else {
        navigate("/admin/orders");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar comanda",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para adicionar itens a uma comanda existente
  const addItemsToOrderMutation = useMutation({
    mutationFn: async ({ orderId, items, total }: { orderId: number, items: OrderItem[], total: number }) => {
      if (!user) {
        throw new Error("Você precisa estar autenticado para adicionar itens à comanda");
      }
      console.log("Enviando itens para a comanda:", { orderId, items, total_amount: total });
      
      // Garantir que todos os itens tenham a propriedade type
      const validatedItems = items.map(item => {
        if (!item.type) {
          // Se não tiver type, assumir 'product' como padrão
          return { ...item, type: 'product' };
        }
        return item;
      });
      
      const res = await apiRequest("PUT", `/api/orders/${orderId}/items`, {
        items: validatedItems, 
        total_amount: total // Backend espera total_amount, não total
      });
      
      if (!res.ok) {
        console.error("Erro ao adicionar itens:", await res.text());
        throw new Error(`Erro ao adicionar itens: ${res.status}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", tenant] });
      toast({
        title: "Itens adicionados",
        description: "Os itens foram adicionados à comanda com sucesso",
      });
      // Não redirecionar automaticamente após adicionar itens
      // Isso permite que o usuário continue adicionando mais itens se desejar
      // O botão "Voltar" já existe na interface para quando o usuário quiser retornar
      
      // Limpar o carrinho após adicionar itens com sucesso
      setCartItems([]);
      setCartTotal(0);
    },
    onError: (error: Error) => {
      console.error("Erro na mutação:", error);
      toast({
        title: "Erro ao adicionar itens",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enviar comanda ou adicionar itens a uma comanda existente
  const handleCreateOrder = (orderData: z.infer<typeof orderFormSchema>) => {
    if (cartItems.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar",
        variant: "destructive",
      });
      return;
    }

    // Se estamos adicionando itens a uma comanda existente
    if (isAddingToExistingOrder && existingOrderId) {
      addItemsToOrderMutation.mutate({
        orderId: existingOrderId,
        items: cartItems,
        total: cartTotal,
      });
      return;
    }

    // Caso contrário, criar uma nova comanda
    const orderPayload = {
      ...orderData,
      items: cartItems,
      total: cartTotal,
    };

    createOrderMutation.mutate(orderPayload);
  };

  // Buscar cliente por telefone
  const searchClient = async (phone: string) => {
    try {
      const response = await apiRequest("GET", `/api/loyalty/${phone}`);
      
      if (response.status === 404) {
        toast({
          title: "Cliente não encontrado",
          description: "Nenhum cliente encontrado com este telefone",
          variant: "destructive",
        });
        return;
      }
      
      if (!response.ok) {
        throw new Error("Erro ao buscar cliente");
      }
      
      const clientData = await response.json();
      
      if (clientData) {
        orderForm.setValue("client_name", clientData.client_name);
        orderForm.setValue("client_phone", clientData.client_phone);
        
        toast({
          title: "Cliente encontrado",
          description: `${clientData.client_name} encontrado com sucesso`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao buscar cliente",
        description: "Ocorreu um erro ao buscar informações do cliente",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="Nova Comanda">
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => {
            if (tenant) {
              navigate(`/admin/orders?tenant=${tenant}`);
            } else {
              navigate("/admin/orders");
            }
          }}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isAddingToExistingOrder 
              ? `Adicionar Itens à Comanda #${existingOrderId}` 
              : "Nova Comanda"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da esquerda: Produtos e Serviços */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-0">
                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={activeTab === 'products' ? 'default' : 'outline'} 
                      onClick={() => setActiveTab('products')}
                      className="w-full"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Produtos
                    </Button>
                    <Button 
                      variant={activeTab === 'services' ? 'default' : 'outline'} 
                      onClick={() => setActiveTab('services')}
                      className="w-full"
                    >
                      <Scissors className="h-4 w-4 mr-2" />
                      Serviços
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Buscar ${activeTab === 'products' ? 'produtos' : 'serviços'}...`}
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {activeTab === 'products' && (
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map((category: any) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {activeTab === 'products' ? (
                  loadingProducts ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredProducts.map((product: Product) => (
                        <Card
                          key={product.id}
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => addToCart(product)}
                        >
                          <div className="relative h-32 bg-gray-100">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Package className="h-16 w-16 text-gray-300" />
                              </div>
                            )}
                            {product.stock_quantity <= 0 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                                ESGOTADO
                              </div>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-sm text-muted-foreground">
                                Estoque: {product.stock_quantity}
                              </span>
                              <span className="font-semibold">
                                R$ {product.price.toFixed(2)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {filteredProducts.length === 0 && !loadingProducts && (
                        <div className="col-span-full text-center py-8">
                          <Package className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-4 text-lg font-medium">Nenhum produto encontrado</h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Tente ajustar os critérios de busca ou categoria.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  loadingServices ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredServices.map((service: Service) => (
                        <Card
                          key={service.id}
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => addToCart(service, true)}
                        >
                          <div className="relative h-32 bg-gray-100">
                            <div className="flex items-center justify-center h-full bg-gradient-to-r from-primary/20 to-primary/10">
                              <Scissors className="h-16 w-16 text-primary/60" />
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <div className="font-medium truncate">{service.name}</div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-sm text-muted-foreground">
                                Duração: {service.duration} min
                              </span>
                              <span className="font-semibold">
                                R$ {service.price.toFixed(2)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {filteredServices.length === 0 && !loadingServices && (
                        <div className="col-span-full text-center py-8">
                          <Scissors className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-4 text-lg font-medium">Nenhum serviço encontrado</h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Tente ajustar os critérios de busca.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna da direita: Carrinho e dados do cliente */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho
                </CardTitle>
                <CardDescription>
                  {cartItems.length} {cartItems.length === 1 ? "item" : "itens"} no carrinho
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Seu carrinho está vazio. Adicione produtos ou serviços clicando nos cards.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-64 overflow-y-auto pr-1">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between border-b pb-3 mb-3 ${
                            item.type === 'service' ? 'bg-primary/5 rounded-lg p-2' : ''
                          }`}
                        >
                          <div className="flex-1 flex items-start gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              item.type === 'service' 
                                ? 'bg-primary/20 text-primary' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {item.type === 'service' 
                                ? <Scissors className="h-4 w-4" /> 
                                : <Package className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium">{item.type === 'service' 
                                ? item.product_name.replace(' (Serviço)', '') 
                                : item.product_name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                                {item.type === 'service' && (
                                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                    Serviço
                                  </Badge>
                                )}
                                <span>R$ {item.price.toFixed(2)} x {item.quantity}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-r-none"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <div className="h-8 px-3 flex items-center justify-center border border-l-0 border-r-0">
                                {item.quantity}
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-l-none"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remover item</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />
                    
                    {/* Seção de descontos */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Tipo de desconto:</p>
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant={discountType === 'none' ? 'default' : 'outline'} 
                                  size="sm"
                                  onClick={() => {
                                    setDiscountType('none');
                                    orderForm.setValue('discount_type', 'none');
                                  }}
                                >
                                  <Tag className="h-4 w-4 mr-1" />
                                  Nenhum
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Sem desconto</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant={discountType === 'percent' ? 'default' : 'outline'} 
                                  size="sm"
                                  onClick={() => {
                                    setDiscountType('percent');
                                    orderForm.setValue('discount_type', 'percent');
                                  }}
                                >
                                  <Percent className="h-4 w-4 mr-1" />
                                  %
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Desconto percentual</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant={discountType === 'value' ? 'default' : 'outline'} 
                                  size="sm"
                                  onClick={() => {
                                    setDiscountType('value');
                                    orderForm.setValue('discount_type', 'value');
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  R$
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Desconto em valor</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      {discountType === 'percent' && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={discountPercent}
                            onChange={(e) => {
                              const value = Math.min(100, Math.max(0, Number(e.target.value)));
                              setDiscountPercent(value);
                              orderForm.setValue('discount_percent', value);
                            }}
                            className="w-24"
                          />
                          <span className="text-sm">% de desconto</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            (R$ {(subtotal * discountPercent / 100).toFixed(2)})
                          </span>
                        </div>
                      )}
                      
                      {discountType === 'value' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">R$</span>
                          <Input
                            type="number"
                            min="0"
                            max={subtotal}
                            value={discountValue}
                            onChange={(e) => {
                              const value = Math.min(subtotal, Math.max(0, Number(e.target.value)));
                              setDiscountValue(value);
                              orderForm.setValue('discount_value', value);
                            }}
                            className="w-24"
                          />
                          <span className="text-sm">de desconto</span>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Resumo do pedido */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Desconto ({discountType === 'percent' ? `${discountPercent}%` : 'R$'}):</span>
                          <span>- R$ {discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-bold text-lg pt-2">
                        <span>Total:</span>
                        <span>R$ {cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Botões de ação do carrinho */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setCartItems([]);
                          setDiscountPercent(0);
                          setDiscountValue(0);
                          setDiscountType('none');
                          orderForm.setValue('discount_type', 'none');
                          orderForm.setValue('discount_percent', 0);
                          orderForm.setValue('discount_value', 0);
                        }}
                        disabled={cartItems.length === 0}
                      >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Limpar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados do Cliente</CardTitle>
                <CardDescription>
                  Informe os dados do cliente para a comanda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...orderForm}>
                  <form
                    onSubmit={orderForm.handleSubmit(handleCreateOrder)}
                    className="space-y-4"
                  >
                    <div className="flex gap-2">
                      <FormField
                        control={orderForm.control}
                        name="client_phone"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Telefone</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                onClick={() => searchClient(field.value)}
                                disabled={!field.value || field.value.length < 8}
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormDescription>
                              Digite o telefone para buscar cliente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={orderForm.control}
                      name="client_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={orderForm.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de Pagamento</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma opção" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentMethods.map((method: any) => (
                                <SelectItem
                                  key={method.id}
                                  value={method.id}
                                >
                                  {method.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={orderForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (opcional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={cartItems.length === 0 || createOrderMutation.isPending || addItemsToOrderMutation.isPending}
                    >
                      {createOrderMutation.isPending || addItemsToOrderMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processando...</span>
                        </div>
                      ) : isAddingToExistingOrder ? (
                        "Adicionar Itens à Comanda"
                      ) : (
                        "Finalizar Comanda"
                      )}
                    </Button>

                    {cartItems.length === 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Atenção</AlertTitle>
                        <AlertDescription>
                          Adicione pelo menos um produto ou serviço ao carrinho para finalizar a comanda.
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default CreateOrderPage;