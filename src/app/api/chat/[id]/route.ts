import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import Message from "@/lib/models/Message";

export async function GET(req: Request, context: { params: { id: string } }) {
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

export async function POST(req: Request, context: { params: { id: string } }) {
  const { id } = await context.params;
  try {
    const { sender, text } = (await req.json()) as {
      sender?: "user" | "ai";
      text?: string;
    };

    if (
      !sender ||
      !text ||
      !text.trim() ||
      (sender !== "user" && sender !== "ai")
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectToDatabase();

    const chat = await Chat.findOne({ chatId: id }).lean();
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const last = await Message.find({ chatId: id })
      .sort({ order: -1 })
      .limit(1)
      .lean();
    const nextOrder = last.length > 0 ? (last[0].order ?? 0) + 1 : 0;

    try {
      await Message.create({ chatId: id, sender, text, order: nextOrder });
    } catch (err: any) {
      console.error(err);
    }

    const messages = await Message.find({ chatId: id })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ messages }, { status: 201 });
  } catch (_err) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
