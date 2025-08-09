import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import Message from "@/lib/models/Message";
import { generateChatTitleFromFirstMessage } from "@/lib/ai/gemini";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const chats = await Chat.find({})
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Chat.countDocuments();
    const hasMore = skip + limit < total;

    return NextResponse.json({
      chats,
      pagination: {
        page,
        limit,
        total,
        hasMore,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, firstMessage, sender } = body as {
      chatId?: string;
      firstMessage?: string;
      sender?: "user" | "ai";
    };

    if (!chatId || !firstMessage || sender !== "user") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectToDatabase();
    // Upsert chat atomically to avoid duplicate key errors under race
    const chat = await Chat.findOneAndUpdate(
      { chatId },
      { $setOnInsert: { chatId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Upsert the first message (order 0) atomically; no-op if it already exists
    await Message.updateOne(
      { chatId, order: 0 },
      {
        $setOnInsert: {
          chatId,
          sender: "user",
          text: firstMessage,
          order: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const messages = await Message.find({ chatId })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Generate title synchronously and update chat
    let updatedChat = chat;
    try {
      const title = await generateChatTitleFromFirstMessage(firstMessage);
      if (title) {
        const chatWithTitle = await Chat.findOneAndUpdate(
          { chatId },
          { $set: { title } },
          { new: true }
        );
        if (chatWithTitle) {
          updatedChat = chatWithTitle;
        }
      }
    } catch (error) {
      console.warn("Failed to generate title:", error);
      // Continue with original chat if title generation fails
    }

    return NextResponse.json({ chat: updatedChat, messages }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Delete all messages associated with the chat
    await Message.deleteMany({ chatId });

    // Delete the chat
    const deletedChat = await Chat.findOneAndDelete({ chatId });

    if (!deletedChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { chatId, title, autoGenerate } = body as {
      chatId: string;
      title?: string;
      autoGenerate?: boolean;
    };

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let finalTitle = title;

    // If autoGenerate is true, generate title from first message
    if (autoGenerate) {
      try {
        const firstMessage = await Message.findOne({ chatId, order: 0 }).lean();
        if (firstMessage) {
          const generatedTitle = await generateChatTitleFromFirstMessage(
            firstMessage.text
          );
          if (generatedTitle) {
            finalTitle = generatedTitle;
          }
        }
      } catch (error) {
        console.warn("Failed to generate title:", error);
        // Continue with provided title or fall back to existing
      }
    }

    const updatedChat = await Chat.findOneAndUpdate(
      { chatId },
      {
        $set: {
          ...(finalTitle && { title: finalTitle }),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({
      chat: updatedChat,
      message: "Chat updated successfully",
    });
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
