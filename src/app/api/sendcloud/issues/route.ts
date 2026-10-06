import { NextResponse } from "next/server";
import { getSendcloudIssues } from "@/lib/sendcloud";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getSendcloudIssues();
  return NextResponse.json(data);
}
