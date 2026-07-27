import { NextResponse } from "next/server";
import { getSendcloudIssues } from "@/lib/sendcloud";

export async function GET() {
  const data = await getSendcloudIssues();
  return NextResponse.json(data);
}
