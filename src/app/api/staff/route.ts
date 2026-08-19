import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");

    if (!departmentId) {
      return NextResponse.json(
        { error: "departmentId query parameter is required." },
        { status: 400 }
      );
    }

    // Retrieve active users belonging to the selected department
    // Limit selection to only non-sensitive id, name, and email fields
    const staff = await prisma.user.findMany({
      where: {
        departmentId,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json({ staff });
  } catch (error: unknown) {
    console.error("Error loading department staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
