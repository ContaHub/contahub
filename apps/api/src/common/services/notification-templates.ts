// Templates de mensagens para o contador e para o cliente
// Separados por tipo para facilitar personalização futura

export const NotificationTemplates = {
  // Alerta enviado ao CONTADOR sobre obrigação próxima do vencimento
  dueSoonAccountant: (data: {
    clientName: string;
    obligationType: string;
    dueDate: string;
    daysLeft: number;
  }) => `
⚠️ *ContaHub — Alerta de Prazo*

Olá! Uma obrigação está próxima do vencimento:

🏢 *Cliente:* ${data.clientName}
📋 *Obrigação:* ${data.obligationType}
📅 *Vencimento:* ${data.dueDate}
⏰ *Prazo:* ${data.daysLeft} dia${data.daysLeft !== 1 ? "s" : ""}

Acesse o ContaHub para mais detalhes.
`.trim(),

  // Alerta enviado ao CLIENTE sobre documento pendente
  dueSoonClient: (data: {
    clientName: string;
    obligationType: string;
    dueDate: string;
    daysLeft: number;
    accountantName: string;
  }) => `
📊 *${data.accountantName} — Lembrete Fiscal*

Olá, ${data.clientName}!

Sua empresa tem uma obrigação fiscal com prazo próximo:

📋 *${data.obligationType}*
📅 Vencimento: *${data.dueDate}*
⏰ Faltam *${data.daysLeft} dia${data.daysLeft !== 1 ? "s" : ""}*

Em caso de dúvidas, entre em contato conosco.
`.trim(),

  // Confirmação de conclusão de obrigação
  obligationCompleted: (data: {
    clientName: string;
    obligationType: string;
    competence: string;
  }) => `
✅ *ContaHub — Obrigação Concluída*

A obrigação *${data.obligationType}* de ${data.competence} para *${data.clientName}* foi concluída com sucesso!
`.trim(),
};
