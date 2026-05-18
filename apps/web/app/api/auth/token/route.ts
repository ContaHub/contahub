import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { getToken } = auth();
  const token = await getToken();
  return NextResponse.json({ token });
}
