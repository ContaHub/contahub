#!/usr/bin/env python3
"""
Adiciona CertificatesModule ao array imports[] do @Module no app.module.ts
Executar da raiz do projeto: python3 sprint4-fix-appmodule2.py
"""

import sys

APP_MODULE_PATH = "apps/api/src/app.module.ts"

with open(APP_MODULE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Verificar se já está no array
if "NfeModule,\n    CertificatesModule," in content or "NfeModule,\n  CertificatesModule," in content:
    print("✓ CertificatesModule já está no array imports[]. Nada alterado.")
    sys.exit(0)

# O array termina em:    NfeModule,   ], }
# Adicionar CertificatesModule após NfeModule dentro do array
if "NfeModule,\n  ]," in content:
    content = content.replace("NfeModule,\n  ],", "NfeModule,\n    CertificatesModule,\n  ],")
    print("✓ CertificatesModule adicionado ao array imports[] (após NfeModule)")
elif "NfeModule,\n  ]" in content:
    content = content.replace("NfeModule,\n  ]", "NfeModule,\n    CertificatesModule,\n  ]")
    print("✓ CertificatesModule adicionado ao array imports[] (após NfeModule)")
else:
    print("ERRO: Não encontrei NfeModule no array imports[].")
    print("Adicione manualmente a linha 'CertificatesModule,' após NfeModule no array imports[].")
    sys.exit(1)

with open(APP_MODULE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ AppModule corrigido!")
print("\nTeste com:")
print("  cd apps/api && npx ts-node -r tsconfig-paths/register src/main.ts")
print("\nDeve aparecer:")
print("  [RoutesResolver] CertificatesController {/api/v1/certificates}")
