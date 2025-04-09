// Este é um patch para a função em routes.ts que lida com o endpoint GET /api/appointments
// Copie este código para substituir a função correspondente

// GET /api/appointments - Get all appointments (auth required)
app.get("/api/appointments", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // Optional date filters
    const dateFilter = req.query.date as string;
    const startDateFilter = req.query.startDate as string;
    const endDateFilter = req.query.endDate as string;
    
    // Verificar parâmetros de profissionais 
    // Pode ser um único valor ou um array (professionalId[] quando múltiplos)
    const professionalIdParam = req.query.professionalId;
    
    // Log detalhado dos filtros recebidos
    console.log("Filtros recebidos:", { 
      dateFilter, 
      startDateFilter, 
      endDateFilter, 
      professionalIdFilter: professionalIdParam,
      professionalIdType: Array.isArray(professionalIdParam) ? 'array' : typeof professionalIdParam
    });
    
    let appointments: any[] = [];
    
    // Sempre buscar todos os agendamentos primeiro
    console.log("Buscando todos os agendamentos");
    appointments = await storage.getAllAppointments();
    console.log(`Total de agendamentos encontrados: ${appointments.length}`);
    
    // Processar os IDs de profissionais
    // Caso 1: "all" - não filtrar, mostrar todos
    if (professionalIdParam === "all") {
      console.log("Parâmetro 'all' explicitamente enviado - mostrando TODOS os profissionais");
      // Não aplicar filtro de profissional
    } 
    // Caso 2: array de IDs - filtrar por qualquer um deles (OR)
    else if (Array.isArray(professionalIdParam)) {
      console.log(`Recebido array de IDs de profissionais: ${professionalIdParam}`);
      
      // Converter cada ID para número e remover valores inválidos
      const professionalIds = professionalIdParam
        .map(id => parseInt(id as string))
        .filter(id => !isNaN(id));
        
      console.log(`IDs de profissionais válidos para filtro: ${professionalIds.join(', ')}`);
      
      if (professionalIds.length > 0) {
        // Filtrar agendamentos por qualquer um dos IDs fornecidos (OR)
        const originalCount = appointments.length;
        appointments = appointments.filter(a => 
          professionalIds.includes(Number(a.professional_id))
        );
        
        // Log dos IDs nos agendamentos para diagnóstico  
        console.log("Total de agendamentos antes do filtro:", originalCount);
        console.log("IDs de profissionais nos agendamentos:", 
          appointments.map(a => a.professional_id).join(', '));
        
        // Logar cada agendamento encontrado com seu ID de profissional
        appointments.forEach(a => {
          console.log(`Agendamento compatível: ${a.id} - Prof ID: ${a.professional_id}`);
        });
        
        console.log(`Total de agendamentos após filtro: ${appointments.length}`);
      }
    }
    // Caso 3: ID único - filtrar apenas por esse profissional  
    else if (professionalIdParam && 
        professionalIdParam !== "" && 
        professionalIdParam !== "undefined") {
        
      const professionalIdFilter = parseInt(professionalIdParam as string);
      
      if (!isNaN(professionalIdFilter)) {
        console.log(`Filtrando para o profissional ID: ${professionalIdFilter}`);
        
        // Filtrar pelo ID específico
        const originalCount = appointments.length;
        appointments = appointments.filter(a => Number(a.professional_id) === professionalIdFilter);
        
        console.log(`Agendamentos após filtro: ${appointments.length} de ${originalCount}`);
      }
    }
    
    console.log(`Total de agendamentos antes de filtrar por data: ${appointments.length}`);
    
    // Aplicar filtro de data única se fornecido
    if (dateFilter) {
      const date = parseISO(dateFilter);
      const dateString = format(date, 'yyyy-MM-dd');
      console.log(`Filtrando por data única: ${dateString}`);
      
      appointments = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        const appointmentDateStr = format(appointmentDate, 'yyyy-MM-dd');
        const isMatch = appointmentDateStr === dateString;
        return isMatch;
      });
    }
    // Aplicar filtro de intervalo de datas se fornecido
    else if (startDateFilter && endDateFilter) {
      const startDate = parseISO(startDateFilter);
      const endDate = parseISO(endDateFilter);
      console.log(`Filtrando por intervalo de datas: ${format(startDate, 'yyyy-MM-dd')} até ${format(endDate, 'yyyy-MM-dd')}`);
      
      // Ajustar endDate para incluir o final do dia
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      
      appointments = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        return appointmentDate >= startDate && appointmentDate <= adjustedEndDate;
      });
    }
    
    console.log(`Total de agendamentos após todos os filtros: ${appointments.length}`);
    res.json(appointments);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ message: "Falha ao buscar agendamentos" });
  }
});