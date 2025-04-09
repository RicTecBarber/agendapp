import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/layout/AdminLayout";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
};

const orderFormSchema = z.object({
  client_name: z.string().min(3, "Nome do cliente é obrigatório"),
  client_phone: z.string().min(8, "Telefone do cliente é obrigatório"),
  payment_method: z.string().min(1, "Método de pagamento é obrigatório"),
  notes: z.string().optional(),
  appointment_id: z.number().optional().nullable(),
});

function CreateOrderPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("products");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [idCounter, setIdCounter] = useState(1);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  // Formulário para dados do cliente e pagamento
  const orderForm = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      client_name: "",
      client_phone: "",
      payment_method: "dinheiro",
      notes: "",
      appointment_id: null,
    },
  });

  // Estado para controlar se estamos adicionando itens a uma comanda existente
  const [isAddingToExistingOrder, setIsAddingToExistingOrder] = useState(false);
  const [existingOrderId, setExistingOrderId] = useState<number | null>(null);
  
  // Efeito para preencher dados do cliente a partir dos parâmetros da URL
  // e adicionar o serviço principal ao carrinho
  // Verificar se o usuário não está autenticado
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
    
    console.log("Configuração inicial da página com parâmetros", {
      appointmentId, clientName, clientPhone, serviceId, 
      serviceName, servicePrice, action, orderId
    });
    
    // Verificar se estamos adicionando itens a uma comanda existente
    const addingItems = action === 'add_items' && orderId;
    if (addingItems) {
      setIsAddingToExistingOrder(true);
      setExistingOrderId(parseInt(orderId));
      
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
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Erro ao buscar produtos");
      }
      return response.json();
    }
  });

  // Buscar serviços
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) {
        throw new Error("Erro ao buscar serviços");
      }
      return response.json();
    }
  });

  // Buscar categorias de produtos
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/products/categories"],
    queryFn: async () => {
      const response = await fetch("/api/products/categories");
      if (!response.ok) {
        throw new Error("Erro ao buscar categorias");
      }
      return response.json();
    }
  });

  // Buscar métodos de pagamento
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const response = await fetch("/api/payment-methods");
      if (!response.ok) {
        throw new Error("Erro ao buscar métodos de pagamento");
      }
      return response.json();
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

  // Calcular total do carrinho
  const cartTotal = cartItems.reduce((total, item) => total + item.subtotal, 0);

  // Mutation para criar comanda
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Comanda criada",
        description: "A comanda foi criada com sucesso",
      });
      navigate("/admin/orders");
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
      
      // Adicionar cabeçalhos de autenticação
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Garantir que o cookie de sessão seja enviado
          'credentials': 'include'
        },
        // Enviar o cookie de sessão em todas as solicitações
        credentials: 'include',
        body: JSON.stringify({
          items: validatedItems, 
          total_amount: total // Backend espera total_amount, não total
        })
      });
      
      if (!res.ok) {
        console.error("Erro ao adicionar itens:", await res.text());
        throw new Error(`Erro ao adicionar itens: ${res.status}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Itens adicionados",
        description: "Os itens foram adicionados à comanda com sucesso",
      });
      navigate("/admin/orders");
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
      const response = await fetch(`/api/loyalty/${phone}`);
      
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
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/orders")}>
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
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between border-b pb-3 ${
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
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              {item.type === 'service' && (
                                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                  Serviço
                                </span>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between font-bold text-lg pt-2">
                      <span>Total:</span>
                      <span>R$ {cartTotal.toFixed(2)}</span>
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