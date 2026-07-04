// apps/web/app/api/workspace/plans/route.ts
// Expõe PLANS config ao frontend sem precisar importar @contahub/shared no bundle do cliente

import { NextResponse } from "next/server";
import { PLANS } from "@contahub/shared";

export async function GET() {
  return NextResponse.json({ plans: PLANS });
}