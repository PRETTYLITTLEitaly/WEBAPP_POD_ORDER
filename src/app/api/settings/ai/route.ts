import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "anthropic_api_key" },
    });

    return NextResponse.json({
      apiKey: setting?.value || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "",
      isSet: Boolean(setting?.value || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();
    const cleanKey = (apiKey || "").trim();

    await prisma.systemSetting.upsert({
      where: { key: "anthropic_api_key" },
      update: { value: cleanKey },
      create: { key: "anthropic_api_key", value: cleanKey },
    });

    return NextResponse.json({
      success: true,
      message: "Chiave API Claude Anthropic salvata globalmente per tutti gli operatori!",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
