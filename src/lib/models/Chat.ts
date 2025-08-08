import { Schema, model, models, Model, InferSchemaType } from "mongoose";

const ChatSchema = new Schema(
  {
    chatId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export type Chat = InferSchemaType<typeof ChatSchema>;
export type ChatModel = Model<Chat>;

const Chat = (models.Chat as ChatModel) || model<Chat>("Chat", ChatSchema);
export default Chat;
