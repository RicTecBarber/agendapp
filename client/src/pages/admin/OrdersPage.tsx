import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { ShoppingCart, Search, Plus, ClipboardList, Check, X, CircleDollarSign } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Order = {
  id: number;
  appointment_id: number | null;
  client_name: string;
  client_phone: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function OrderStatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let label = "Status";

  switch (status) {
    case "aberta":
      variant = "secondary";
      label = "Aberta";
      break;
    case "fechada":
      variant = "default";
      label = "Fechada";
      break;
    case "cancelada":
      variant = "destructive";
      label = "Cancelada";
      break;
  }

  return <Badge variant={variant}>{label}</Badge>;
}

function getPaymentMethodLabel(method: string): string {
  const paymentMethods: Record<string, string> = {
    dinheiro: "Dinheiro",
    cartao_debito: "Cartão de Débito",
    cartao_credito: "Cartão de Crédito",
    pix: "PIX",
    transferencia: "Transferência Bancária",
  };

  return paymentMethods[method] || method;
}

function OrderDetail({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/orders/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Status atualizado",
        description: "O status da comanda foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (status: string) => {
    updateStatusMutation.mutate({ id: order.id, status });
  };
  
  // Função para navegar para a página de adição de itens
  const navigateToAddItems = () => {
    // Criamos um objeto com os parâmetros necessários para preencher a página de nova comanda
    // com os dados da comanda existente, mas permitindo adicionar novos itens
    const queryParams = new URLSearchParams({
      orderId: order.id.toString(),
      appointmentId: order.appointment_id ? order.appointment_id.toString() : '',
      clientName: order.client_name,
      clientPhone: order.client_phone,
      paymentMethod: order.payment_method,
      action: 'add_items' // Indicar que estamos adicionando itens a uma comanda existente
    });
    
    navigate(`/admin/orders/new?${queryParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            Comanda #{order.id} - {order.client_name}
          </h3>
          <p className="text-muted-foreground text-sm">{order.client_phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {order.status === "aberta" && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleUpdateStatus("fechada")}
                size="sm"
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                Fechar
              </Button>
              <Button
                onClick={() => handleUpdateStatus("cancelada")}
                variant="destructive"
                size="sm"
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Data</Label>
          <p>
            {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </p>
        </div>
        <div>
          <Label className="text-xs">Método de Pagamento</Label>
          <p>{getPaymentMethodLabel(order.payment_method)}</p>
        </div>
        <div>
          <Label className="text-xs">Total</Label>
          <p className="text-lg font-bold">R$ {order.total.toFixed(2)}</p>
        </div>
      </div>

      {order.appointment_id && (
        <div>
          <Label className="text-xs">Agendamento Relacionado</Label>
          <p>#{order.appointment_id}</p>
        </div>
      )}

      {order.notes && (
        <div>
          <Label className="text-xs">Observações</Label>
          <p>{order.notes}</p>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">Itens da Comanda</h4>
          {order.status === "aberta" && (
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToAddItems}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar Itens
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  R$ {item.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  R$ {item.subtotal.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-semibold">
                Total
              </TableCell>
              <TableCell className="text-right font-bold">
                R$ {order.total.toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as comandas
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("Erro ao buscar comandas");
      }
      return response.json();
    }
  });

  // Filtrar comandas
  const filteredOrders = orders.filter((order: Order) => {
    // Filtrar por termo de busca
    const searchMatch =
      order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client_phone.includes(searchTerm) ||
      order.id.toString().includes(searchTerm);

    // Filtrar por status
    const statusMatch =
      statusFilter === "all" || order.status === statusFilter;

    return searchMatch && statusMatch;
  });

  // Ordenar comandas pela data mais recente
  const sortedOrders = [...filteredOrders].sort((a: Order, b: Order) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <AdminLayout title="Comandas">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Comandas</h1>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, telefone ou número da comanda..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="fechada">Fechadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedOrders.map((order: Order) => (
              <Card key={order.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {order.client_name}
                      </CardTitle>
                      <CardDescription>{order.client_phone}</CardDescription>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <Label className="text-xs">Comanda #</Label>
                      <p>{order.id}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Data</Label>
                      <p>
                        {format(new Date(order.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <Label className="text-xs block">Itens</Label>
                      <p>{order.items.length} produtos</p>
                    </div>
                    <div>
                      <Label className="text-xs block">Total</Label>
                      <p className="font-bold">R$ {order.total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedOrder(order)}
                  >
                    Ver Detalhes
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {sortedOrders.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma comanda encontrada</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os filtros de busca."
                : "Ainda não há comandas registradas."}
            </p>
          </div>
        )}

        {/* Dialog para detalhes da comanda */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Detalhes da Comanda</DialogTitle>
            </DialogHeader>
            {selectedOrder && <OrderDetail order={selectedOrder} />}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default OrdersPage;