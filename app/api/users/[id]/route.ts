import { NextResponse } from "next/server";
import { userService } from "@/lib/services/user";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Try to get user by ID first
    try {
      const user = await userService.getUserById(params.id);
      return NextResponse.json(user);
    } catch (error) {
      // If not found by ID, try to get by Discord ID
      try {
        const user = await userService.getUserByDiscordId(params.id);
        return NextResponse.json(user);
      } catch (discordError) {
        // If not found by Discord ID either, return 404
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}
