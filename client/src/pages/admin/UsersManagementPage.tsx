import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, UserRole, insertUserSchema } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Plus, Trash, Edit, UserCog, User as UserIcon, Key, Shield, ShieldCheck, Search } from 'lucide-react';

// Lista predefinida de permissões por tipo de usuário
const PERMISSION_PRESETS = {
  admin: [
    'manage_users',
    'manage_services',
    'manage_professionals',
    'manage_appointments',
    'manage_products',
    'manage_orders',
    'manage_settings',
    'view_dashboard'
  ],
  staff: [
    'view_appointments',
    'manage_own_appointments',
    'view_clients'
  ],
  receptionist: [
    'manage_appointments',
    'view_clients',
    'view_professionals',
    'view_services'
  ]
};

// Permissões disponíveis agrupadas
const AVAILABLE_PERMISSIONS = [
  { group: 'Usuários', permissions: [
    { id: 'view_users', label: 'Visualizar usuários' },
    { id: 'manage_users', label: 'Gerenciar usuários' }
  ]},
  { group: 'Serviços', permissions: [
    { id: 'view_services', label: 'Visualizar serviços' },
    { id: 'manage_services', label: 'Gerenciar serviços' }
  ]},
  { group: 'Profissionais', permissions: [
    { id: 'view_professionals', label: 'Visualizar profissionais' },
    { id: 'manage_professionals', label: 'Gerenciar profissionais' }
  ]},
  { group: 'Agendamentos', permissions: [
    { id: 'view_appointments', label: 'Visualizar agendamentos' },
    { id: 'manage_appointments', label: 'Gerenciar todos agendamentos' },
    { id: 'manage_own_appointments', label: 'Gerenciar próprios agendamentos' }
  ]},
  { group: 'Produtos', permissions: [
    { id: 'view_products', label: 'Visualizar produtos' },
    { id: 'manage_products', label: 'Gerenciar produtos' }
  ]},
  { group: 'Comandas', permissions: [
    { id: 'view_orders', label: 'Visualizar comandas' },
    { id: 'manage_orders', label: 'Gerenciar comandas' }
  ]},
  { group: 'Clientes', permissions: [
    { id: 'view_clients', label: 'Visualizar clientes' },
    { id: 'manage_clients', label: 'Gerenciar clientes' }
  ]},
  { group: 'Sistema', permissions: [
    { id: 'view_dashboard', label: 'Visualizar dashboard' },
    { id: 'manage_settings', label: 'Gerenciar configurações' }
  ]}
];

// Esquema estendido para validação do formulário
const userFormSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["super_admin", "admin", "staff", "receptionist"]),
  permissions: z.array(z.string()).optional(),
  is_active: z.boolean().default(true)
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsersManagementPage() {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const { user: currentUser } = useAuth();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isCurrentUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Obter lista de usuários
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return response.json();
    },
    enabled: !!tenant
  });

  // Filtrar usuários baseado na busca
  const filteredUsers = users?.filter((user: User) => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formulário para criação de usuário
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      password: '',
      role: 'staff',
      permissions: [],
      is_active: true
    }
  });

  // Formulário para edição de usuário
  const editForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema.partial({ password: true })),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      password: '',
      role: 'staff',
      permissions: [],
      is_active: true
    }
  });

  // Criar usuário
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      return await apiRequest('POST', '/api/users', userData);
    },
    onSuccess: () => {
      toast({
        title: 'Usuário criado',
        description: 'Usuário criado com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setOpenCreateDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message || 'Ocorreu um erro ao criar o usuário.',
        variant: 'destructive',
      });
    }
  });

  // Atualizar usuário
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserFormValues> & { id: number }) => {
      const { id, ...rest } = userData;
      return await apiRequest('PUT', `/api/users/${id}`, rest);
    },
    onSuccess: () => {
      toast({
        title: 'Usuário atualizado',
        description: 'Usuário atualizado com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setOpenEditDialog(false);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message || 'Ocorreu um erro ao atualizar o usuário.',
        variant: 'destructive',
      });
    }
  });

  // Excluir usuário
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Usuário excluído',
        description: 'Usuário excluído com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message || 'Ocorreu um erro ao excluir o usuário.',
        variant: 'destructive',
      });
    }
  });

  const onRoleChange = (role: UserRole, formType: 'create' | 'edit') => {
    // Preencher permissões automaticamente com base no papel
    if (role in PERMISSION_PRESETS) {
      if (formType === 'create') {
        form.setValue('permissions', PERMISSION_PRESETS[role as keyof typeof PERMISSION_PRESETS]);
      } else {
        editForm.setValue('permissions', PERMISSION_PRESETS[role as keyof typeof PERMISSION_PRESETS]);
      }
    }
  };

  const onSubmitCreate = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };

  const onSubmitEdit = (data: Partial<UserFormValues>) => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate({
      id: selectedUser.id,
      ...data
    });
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      permissions: user.permissions as string[] || [],
      is_active: user.is_active
    });
    setOpenEditDialog(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-500">Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-red-500">Admin</Badge>;
      case 'staff':
        return <Badge className="bg-blue-500">Profissional</Badge>;
      case 'receptionist':
        return <Badge className="bg-green-500">Recepcionista</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (!isCurrentUserAdmin) {
    return (
      <AdminLayout title="Acesso Restrito">
        <div className="flex flex-col items-center justify-center h-96">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gerenciamento de Usuários">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground">
              Crie e gerencie usuários do sistema e suas permissões.
            </p>
          </div>
          <Button onClick={() => setOpenCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        <div className="flex items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers?.length > 0 ? (
              filteredUsers.map((user: User) => (
                <Card key={user.id} className={!user.is_active ? "opacity-70" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-full bg-muted">
                          <UserIcon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-xl">{user.name}</CardTitle>
                      </div>
                      {getRoleBadge(user.role)}
                    </div>
                    <CardDescription>
                      <div className="flex flex-col mt-2">
                        <span className="text-sm text-muted-foreground">@{user.username}</span>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {!user.is_active && (
                        <Badge variant="outline" className="text-red-500 border-red-500">
                          Inativo
                        </Badge>
                      )}
                      {user.permissions && (user.permissions as string[]).slice(0, 3).map((perm, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {perm.replace('_', ' ')}
                        </Badge>
                      ))}
                      {user.permissions && (user.permissions as string[]).length > 3 && (
                        <Badge variant="outline">
                          +{(user.permissions as string[]).length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between py-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteUser(user)}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center h-64">
                <div className="text-center">
                  <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg">Nenhum usuário encontrado</h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? "Tente ajustar seus termos de busca."
                      : "Clique em 'Novo Usuário' para adicionar um usuário."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Diálogo de criação de usuário */}
        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Criar Novo Usuário
              </DialogTitle>
              <DialogDescription>
                Preencha todos os campos para criar um novo usuário no sistema.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Usuário</FormLabel>
                      <Select 
                        onValueChange={(value: UserRole) => {
                          field.onChange(value);
                          onRoleChange(value, 'create');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentUser?.role === 'super_admin' && (
                            <SelectItem value="admin">Administrador</SelectItem>
                          )}
                          <SelectItem value="staff">Profissional</SelectItem>
                          <SelectItem value="receptionist">Recepcionista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        O tipo de usuário define suas permissões padrão.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Usuário ativo</FormLabel>
                        <FormDescription>
                          Desmarque para desativar o acesso deste usuário ao sistema.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Permissões</Label>
                  <div className="border rounded-md p-4">
                    <Tabs defaultValue={AVAILABLE_PERMISSIONS[0].group}>
                      <TabsList className="w-full flex flex-wrap overflow-x-auto mb-4">
                        {AVAILABLE_PERMISSIONS.map(group => (
                          <TabsTrigger key={group.group} value={group.group} className="flex-shrink-0">
                            {group.group}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {AVAILABLE_PERMISSIONS.map(group => (
                        <TabsContent key={group.group} value={group.group} className="pt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {group.permissions.map(permission => (
                              <FormField
                                key={permission.id}
                                control={form.control}
                                name="permissions"
                                render={({ field }) => {
                                  return (
                                    <FormItem key={permission.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(permission.id)}
                                          onCheckedChange={(checked) => {
                                            const updatedPermissions = checked
                                              ? [...(field.value || []), permission.id]
                                              : (field.value || []).filter(p => p !== permission.id);
                                            field.onChange(updatedPermissions);
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-normal">
                                          {permission.label}
                                        </FormLabel>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpenCreateDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Usuário'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de edição de usuário */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                Editar Usuário
              </DialogTitle>
              <DialogDescription>
                Atualize as informações e permissões do usuário.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha (deixe em branco para manter)</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormDescription>
                          Deixe em branco para manter a senha atual.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Usuário</FormLabel>
                      <Select 
                        onValueChange={(value: UserRole) => {
                          field.onChange(value);
                          onRoleChange(value, 'edit');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentUser?.role === 'super_admin' && (
                            <SelectItem value="admin">Administrador</SelectItem>
                          )}
                          <SelectItem value="staff">Profissional</SelectItem>
                          <SelectItem value="receptionist">Recepcionista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        O tipo de usuário define suas permissões padrão.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Usuário ativo</FormLabel>
                        <FormDescription>
                          Desmarque para desativar o acesso deste usuário ao sistema.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Permissões</Label>
                  <div className="border rounded-md p-4">
                    <Tabs defaultValue={AVAILABLE_PERMISSIONS[0].group}>
                      <TabsList className="w-full flex flex-wrap overflow-x-auto mb-4">
                        {AVAILABLE_PERMISSIONS.map(group => (
                          <TabsTrigger key={group.group} value={group.group} className="flex-shrink-0">
                            {group.group}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {AVAILABLE_PERMISSIONS.map(group => (
                        <TabsContent key={group.group} value={group.group} className="pt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {group.permissions.map(permission => (
                              <FormField
                                key={permission.id}
                                control={editForm.control}
                                name="permissions"
                                render={({ field }) => {
                                  return (
                                    <FormItem key={permission.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(permission.id)}
                                          onCheckedChange={(checked) => {
                                            const updatedPermissions = checked
                                              ? [...(field.value || []), permission.id]
                                              : (field.value || []).filter(p => p !== permission.id);
                                            field.onChange(updatedPermissions);
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-normal">
                                          {permission.label}
                                        </FormLabel>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpenEditDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}