const { Schema, model } = require('mongoose');

const ReactionSchema = new Schema({
    userId: {
        type: Schema.Types.String,
        required: true,
    },
    emoji: {
        type: Schema.Types.String,
        required: true,
    },
});

const ChatSchema = new Schema(
    {
        userId: {
            type: Schema.Types.String,
            required: true,
        },
        roomId: {
            type: Schema.Types.String,
            required: true,
        },
        text: {
            type: Schema.Types.String,
            default: '',
        },
        readed: {
            type: Schema.Types.Boolean,
            required: true,
            default: false,
        },
        replyTo: {
            type: [{ type: Schema.Types.ObjectId, ref: 'chats' }],
            default: [],
        },
        deletedBy: {
            type: [Schema.Types.String], // Changed to array of userIds
            default: [],
        },
        fileId: {
            type: Schema.Types.String,
            default: null,
        },
        reactions: [ReactionSchema], // Added reactions array
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = model('chats', ChatSchema);
