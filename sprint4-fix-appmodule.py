#!/usr/bin/env python3
"""
Registra o CertificatesModule no AppModule manualmente.
Executar da raiz do projeto: python3 sprint4-fix-appmodule.py
"""

import sys
import re

APP_MODULE_PATH = "apps/api/src/app.module.ts"

with open(APP_MODULE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

if "CertificatesModule" in content:
    print("✓ CertificatesModule já está no AppModule. Nada alterado.")
    sys.exit(0)

print("Conteúdo atual do app.module.ts:")
print("─" * 60)
print(content)
print("─" * 60)

# 1. Adicionar o import no topo (após o último import existente)
import_line = "import { CertificatesModule } from './modules/certificates/certificates.module';"

# Encontrar posição do último import
lines = content.split("\n")
last_import_idx = 0
for i, line in enumerate(lines):
    if line.strip().startswith("import "):
        last_import_idx = i

lines.insert(last_import_idx + 1, import_line)
content = "\n".join(lines)

print(f"✓ Import adicionado após linha {last_import_idx + 1}")

# 2. Adicionar ao array imports[] do @Module
# Estratégia: encontrar o último módulo listado no imports[] e adicionar depois
# Tenta vários padrões comuns

patterns = [
    ("NfeModule,\n  ],", "NfeModule,\n    CertificatesModule,\n  ],"),
    ("JobsModule,\n  ],", "JobsModule,\n    CertificatesModule,\n  ],"),
    ("PortalModule,\n  ],", "PortalModule,\n    CertificatesModule,\n  ],"),
    ("WorkspaceModule,\n  ],", "WorkspaceModule,\n    CertificatesModule,\n  ],"),
    ("CnpjModule,\n  ],", "CnpjModule,\n    CertificatesModule,\n  ],"),
]

replaced = False
for old, new in patterns:
    if old in content:
        content = content.replace(old, new)
        replaced = True
        print(f"✓ CertificatesModule adicionado ao imports[] (após {old.split(',')[0].strip()})")
        break

if not replaced:
    # Fallback: tentar com regex — encontrar o fechamento do array imports
    match = re.search(r'(imports:\s*\[[\s\S]*?)\]', content)
    if match:
        old_imports = match.group(0)
        new_imports = old_imports.rstrip(']') + "    CertificatesModule,\n  ]"
        content = content.replace(old_imports, new_imports)
        replaced = True
        print("✓ CertificatesModule adicionado ao imports[] via regex")

if not replaced:
    print("\nERRO: Não foi possível adicionar ao imports[] automaticamente.")
    print("Adicione MANUALMENTE ao app.module.ts:")
    print("  1. No topo: import { CertificatesModule } from './modules/certificates/certificates.module';")
    print("  2. No array imports[]: CertificatesModule,")
    sys.exit(1)

with open(APP_MODULE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ AppModule atualizado com sucesso!")
print("\nVerifique com:")
print("  cd apps/api && npx ts-node -r tsconfig-paths/register src/main.ts")
print("\nDeve aparecer:")
print("  [RoutesResolver] CertificatesController {/api/v1/certificates}")
