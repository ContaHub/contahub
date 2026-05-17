import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do ContaHub...");

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-escritorio" },
    update: {},
    create: {
      name: "Escritório Contábil Demo",
      slug: "demo-escritorio",
      cnpj: "12.345.678/0001-90",
      clerkOrgId: "org_demo_placeholder",
      timezone: "America/Sao_Paulo",
    },
  });

  console.log(`✅ Workspace criado: ${workspace.name}`);

  const client1 = await prisma.client.upsert({
    where: { workspaceId_cnpj: { workspaceId: workspace.id, cnpj: "11.222.333/0001-44" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "Padaria São João Ltda",
      cnpj: "11.222.333/0001-44",
      taxRegime: "SIMPLES_NACIONAL",
      email: "financeiro@padariasaojoao.com.br",
      whatsapp: "11999990001",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { workspaceId_cnpj: { workspaceId: workspace.id, cnpj: "22.333.444/0001-55" } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "Tech Solutions ME",
      cnpj: "22.333.444/0001-55",
      taxRegime: "LUCRO_PRESUMIDO",
      email: "admin@techsolutions.com.br",
      whatsapp: "11999990002",
    },
  });

  console.log("✅ Clientes criados");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await prisma.fiscalObligation.create({
    data: {
      workspaceId: workspace.id,
      clientId: client1.id,
      type: "DAS",
      competenceMonth: month,
      competenceYear: year,
      dueDate: new Date(year, month, 20),
      amount: 85000,
      status: "PENDING",
    },
  });

  await prisma.fiscalObligation.create({
    data: {
      workspaceId: workspace.id,
      clientId: client2.id,
      type: "DARF",
      competenceMonth: month,
      competenceYear: year,
      dueDate: new Date(year, month, 20),
      amount: 320000,
      status: "PENDING",
    },
  });

  console.log("✅ Obrigações fiscais criadas");
  console.log("🎉 Seed concluído!");
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
