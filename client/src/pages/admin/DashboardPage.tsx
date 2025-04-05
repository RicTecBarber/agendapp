import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  BarChart2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardPage = () => {
  const [period, setPeriod] = useState<string>("month");
  const [chartType, setChartType] = useState<string>("daily");

  // Query for dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats", period],
  });

  // Query for chart data
  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ["/api/dashboard/chart", chartType],
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-bold">{label}</p>
          <p className="text-secondary">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-primary">
            {payload[1].value} {payload[1].value === 1 ? 'atendimento' : 'atendimentos'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <AdminLayout title="Dashboard">
      {/* Period selector */}
      <div className="flex justify-end mb-6">
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Últimos 7 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-dark mb-1">Valor Faturado</p>
                {isLoadingStats ? (
                  <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <h3 className="text-2xl font-bold text-primary">
                    {formatCurrency(stats?.total_revenue || 0)}
                  </h3>
                )}
                <p className="text-green-600 text-sm flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  12% mês anterior
                </p>
              </div>
              <div className="bg-secondary/10 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-dark mb-1">Atendimentos Realizados</p>
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <h3 className="text-2xl font-bold text-primary">
                    {stats?.total_appointments || 0}
                  </h3>
                )}
                <p className="text-green-600 text-sm flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  8% mês anterior
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-dark mb-1">Taxa de Conversão</p>
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <h3 className="text-2xl font-bold text-primary">
                    {stats?.conversion_rate || 0}%
                  </h3>
                )}
                <p className="text-red-600 text-sm flex items-center mt-2">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  3% mês anterior
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <BarChart2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Performance chart */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Desempenho</CardTitle>
          <div className="flex">
            <Button
              size="sm"
              variant={chartType === "daily" ? "default" : "outline"}
              className="mr-2"
              onClick={() => setChartType("daily")}
            >
              Por dia
            </Button>
            <Button
              size="sm"
              variant={chartType === "professional" ? "default" : "outline"}
              onClick={() => setChartType("professional")}
            >
              Por profissional
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingChart ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={chartType === "daily" ? "date" : "professional_name"} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="revenue" 
                  name="Faturamento" 
                  fill="#B45309" 
                  radius={[4, 4, 0, 0]} 
                  barSize={chartType === "professional" ? 20 : 30}
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="appointments" 
                  name="Atendimentos" 
                  fill="#0F172A" 
                  radius={[4, 4, 0, 0]} 
                  barSize={chartType === "professional" ? 20 : 30}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-64 text-neutral-dark">
              Não há dados disponíveis para o período selecionado.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Today's appointments table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Agendamentos de Hoje</CardTitle>
          <Button variant="link" size="sm" className="text-secondary">
            Ver todos
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-neutral">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Serviço</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Profissional</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Horário</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Ações</th>
                </tr>
              </thead>
              <tbody>
                {/* This will be populated by today's appointments */}
                {/* For now, showing empty state */}
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-dark">
                    <div className="flex flex-col items-center justify-center">
                      <p>Carregando agendamentos...</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default DashboardPage;
