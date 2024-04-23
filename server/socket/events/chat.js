const { io } = global;
const cloud = require("cloudinary").v2;

const InboxModel = require("../../db/models/inbox");
const ChatModel = require("../../db/models/chat");
const FileModel = require("../../db/models/file");
const ProfileModel = require("../../db/models/profile");

const Inbox = require("../../helpers/models/inbox");
const uniqueId = require("../../helpers/uniqueId");

module.exports = (socket) => {
  // event when user sends message
  socket.on("chat/insert", async (args) => {
    try {
      let fileId = null;
      let file;

      if (args.file) {
        const arrOriname = args.file.originalname.split(".");
        const format =
          arrOriname.length === 1 ? "txt" : arrOriname.reverse()[0];

        const upload = await cloud.uploader.upload(args.file.url, {
          folder: "chat",
          public_id: `${uniqueId(20)}.${format}`,
          resource_type: "auto",
        });

        fileId = upload.public_id;

        file = await new FileModel({
          fileId,
          url: upload.secure_url,
          originalname: args.file.originalname,
          type: upload.resource_type,
          format,
          size: upload.bytes,
        }).save();
      }

      const chat = await new ChatModel({ ...args, fileId }).save();
      const profile = await ProfileModel.findOne(
        { userId: args.userId },
        { userId: 1, avatar: 1, fullname: 1 }
      );

      // create a new inbox if it doesn't exist and update it if exists
      await InboxModel.findOneAndUpdate(
        { roomId: args.roomId },
        {
          $inc: { unreadMessage: 1 },
          $set: {
            roomId: args.roomId,
            ownersId: args.ownersId,
            fileId,
            deletedBy: [],
            content: {
              from: args.userId,
              senderName: profile.fullname,
              text:
                chat.text || chat.text.length > 0
                  ? chat.text
                  : file.originalname,
              time: chat.createdAt,
            },
            replyTo: args.replyTo || null, // Include the reply-to ID if available
          },
        },
        { new: true, upsert: true }
      );

      const inboxes = await Inbox.find({ ownersId: { $all: args.ownersId } });

      io.to(args.roomId).emit("chat/insert", { ...chat._doc, profile, file });
      // send the latest inbox data to be merge with old inbox data
      io.to(args.ownersId).emit("inbox/find", inboxes[0]);
    } catch (error0) {
      console.log(error0.message);
    }
  });

  // event when user reacts to a message
  socket.on("chat/react", async ({ chatId, userId, emoji }) => {
    try {
      // Find the chat and the user's previous reaction
      const chat = await ChatModel.findById(chatId);
      const existingReactionIndex = chat.reactions.findIndex(
        (reaction) => reaction.userId === userId
      );

      if (existingReactionIndex !== -1) {
        // If the user has already reacted to this chat, check if the new reaction is different
        if (chat.reactions[existingReactionIndex].emoji === emoji) {
          // If the new reaction is the same as the previous one, remove the reaction
          chat.reactions.splice(existingReactionIndex, 1);
        } else {
          // If the new reaction is different, update the existing reaction
          chat.reactions[existingReactionIndex].emoji = emoji;
        }
      } else {
        // If the user has not reacted yet, add a new reaction
        chat.reactions.push({ userId, emoji });
      }

      // Save the updated chat
      await chat.save();

      // Emit event to update clients about the reaction
      io.emit("chat/react", chat); // Emit updated chat data to the socket associated with the chat
    } catch (error) {
      console.error(error.message);
    }
  });

  // event when a friend join to chat room and reads your message
  socket.on("chat/read", async (args) => {
    try {
      await InboxModel.updateOne(
        { roomId: args.roomId, ownersId: { $all: args.ownersId } },
        { $set: { unreadMessage: 0 } }
      );
      await ChatModel.updateMany(
        { roomId: args.roomId, readed: false },
        { $set: { readed: true } }
      );

      const inboxes = await Inbox.find({ ownersId: { $all: args.ownersId } });

      io.to(args.ownersId).emit("inbox/read", inboxes[0]);
      io.to(args.roomId).emit("chat/read", true);
    } catch (error0) {
      console.log(error0.message);
    }
  });

  let typingEnds = null;
  socket.on("chat/typing", async ({ roomId, roomType, userId }) => {
    clearTimeout(typingEnds);

    const isGroup = roomType === "group";
    const typer = isGroup
      ? await ProfileModel.findOne({ userId }, { fullname: 1 })
      : null;

    socket.broadcast
      .to(roomId)
      .emit(
        "chat/typing",
        isGroup ? `${typer.fullname} typing...` : "typing..."
      );

    typingEnds = setTimeout(() => {
      socket.broadcast.to(roomId).emit("chat/typing-ends", true);
    }, 1000);
  });

  // delete chats
  socket.on(
    "chat/delete",
    async ({ userId, chatsId, roomId, deleteForEveryone }) => {
      try {
        // delete attached files
        const handleDeleteFiles = async (query = {}) => {
          const chats = await ChatModel.find(
            { _id: { $in: chatsId }, roomId, ...query },
            { fileId: 1 }
          );

          const filesId = chats
            .filter((elem) => !!elem.fileId)
            .map((elem) => elem.fileId);

          if (filesId.length > 0) {
            await FileModel.deleteMany({ roomId, fileId: filesId });

            await cloud.api.delete_resources(filesId, {
              resource_type: "image",
            });
            await cloud.api.delete_resources(filesId, {
              resource_type: "video",
            });
            await cloud.api.delete_resources(filesId, { resource_type: "raw" });
          }
        };

        if (deleteForEveryone) {
          await handleDeleteFiles({});
          await ChatModel.deleteMany({ roomId, _id: { $in: chatsId } });

          io.to(roomId).emit("chat/delete", { userId, chatsId });
        } else {
          await ChatModel.updateMany(
            { roomId, _id: { $in: chatsId } },
            { $push: { deletedBy: userId } }
          );

          // delete permanently if this message has been
          // deleted by all room participants
          const { ownersId } = await InboxModel.findOne(
            { roomId },
            { _id: 0, ownersId: 1 }
          );

          await handleDeleteFiles({ deletedBy: { $size: ownersId.length } });
          await ChatModel.deleteMany({
            roomId,
            $expr: { $gte: [{ $size: "$deletedBy" }, ownersId.length] },
          });

          socket.emit("chat/delete", { userId, chatsId });
        }
      } catch (error0) {
        console.error(error0.message);
      }
    }
  );
};
