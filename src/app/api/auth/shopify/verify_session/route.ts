import { verifyRequest } from "@/utils/auth/shopify";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

export type APIResponse<DataType> = {
  status: "success" | "error";
  data?: DataType;
  message?: string;
};

type Data = {
  name: string;
  height: string;
};

export async function GET(req: Request) {
  const validSession = await verifyRequest(req, true); 
  return NextResponse.json<APIResponse<Data>>({
    status: "success",
    data: {},
  });
}