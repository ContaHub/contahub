import { getWorkspaceBySlug, WorkspacePublic } from "@/lib/portal";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

interface Props {
  params: { slug: string };
}

export default async function PortalLoginPage({ params }: Props) {
  const { userId } = auth();

  // Se já está logado, redireciona para o dashboard do portal
  if (userId) {
    redirect(`/portal/${params.slug}/dashboard`);
  }

  // Busca info pública do escritório para personalizar a tela
  let workspace: WorkspacePublic = {
    id: "",
    slug: params.slug,
    name: "Escritório Contábil",
    primaryColor: "#2563EB",
  };
  try {
    const res = await getWorkspaceBySlug(params.slug);
    workspace = res.data;
  } catch {
    // Escritório não encontrado — mostra tela genérica
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        {/* Logo / Nome do escritório */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
            style={{ backgroundColor: workspace.primaryColor ?? "#2563EB" }}
          >
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{workspace.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Portal do Cliente</p>
        </div>

        {/* Área de login */}
        <SignedOut>
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              Acesse sua área para visualizar documentos e obrigações fiscais.
            </p>
            <SignInButton
              mode="modal"
              forceRedirectUrl={`/portal/${params.slug}/dashboard`}
            >
              <button
                className="w-full py-3 px-4 text-white text-sm font-medium rounded-xl transition-colors"
                style={{ backgroundColor: workspace.primaryColor ?? "#2563EB" }}
              >
                Entrar no portal
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <p className="text-center text-sm text-gray-500">Redirecionando...</p>
        </SignedIn>

        {/* Rodapé */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by <span className="font-semibold text-blue-600">ContaHub</span>
        </p>
      </div>
    </div>
  );
}
