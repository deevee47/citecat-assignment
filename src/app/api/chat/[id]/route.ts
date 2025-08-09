import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import Message from "@/lib/models/Message";
import { streamChatCompletion, type ChatMessage } from "@/lib/ai/openai";

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

    // Save user message
    try {
      await Message.create({ chatId: id, sender, text, order: nextOrder });
    } catch (err: any) {
      console.error(err);
    }

    // If it's a user message, generate AI response
    if (sender === "user") {
      // Get conversation history for context
      const allMessages = await Message.find({ chatId: id })
        .sort({ order: 1, createdAt: 1 })
        .lean();

      // Convert to OpenAI format
      const chatMessages: ChatMessage[] = allMessages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));

      // Create streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const completion = await streamChatCompletion(chatMessages);
            let aiResponseText = "";

            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                aiResponseText += content;

                // Send chunk to client
                const data = {
                  type: "chunk",
                  content: content,
                  messageId: crypto.randomUUID(),
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
              }
            }

            // Save AI response to database
            if (aiResponseText.trim()) {
              const aiNextOrder = nextOrder + 1;
              await Message.create({
                chatId: id,
                sender: "ai",
                text: aiResponseText,
                order: aiNextOrder,
              });
            }

            // Send completion signal
            const finalData = {
              type: "complete",
              content: aiResponseText,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
            );
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            const errorData = {
              type: "error",
              error: "Failed to generate response",
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // For non-user messages, just return success
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
