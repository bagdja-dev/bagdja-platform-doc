import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const adminPassword = process.env.ADMIN_PASSWORD || "bagdja123"; // Default jika belum di-set

  if (password === adminPassword) {
    const response = NextResponse.json({ success: true });
    
    // Set cookie session sederhana
    (await cookies()).set("admin_session", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 hari
      path: "/",
    });

    return response;
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}

export async function GET() {
  const session = (await cookies()).get("admin_session");
  return NextResponse.json({ authenticated: session?.value === "true" });
}

export async function DELETE() {
  (await cookies()).delete("admin_session");
  return NextResponse.json({ success: true });
}
