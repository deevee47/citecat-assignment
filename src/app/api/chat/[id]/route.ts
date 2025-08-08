import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import Message from "@/lib/models/Message";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const { id } = await context.params;

  try {
    await connectToDatabase();

    const chat = await Chat.findOne({ chatId: id }).lean();
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const messages = await Message.find({ chatId: id })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ chat, messages });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
