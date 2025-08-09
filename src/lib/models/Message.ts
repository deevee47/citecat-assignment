import { Schema, model, models, Model, InferSchemaType } from "mongoose";

const MessageSchema = new Schema(
  {
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ["user", "ai"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

MessageSchema.index({ chatId: 1, createdAt: 1 }, { unique: true });

export type Message = InferSchemaType<typeof MessageSchema>;
export type MessageModel = Model<Message>;

const Message =
  (models.Message as MessageModel) || model<Message>("Message", MessageSchema);
export default Message;
