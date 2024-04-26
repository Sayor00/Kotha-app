import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setModal } from '../../redux/features/modal';
import socket from '../../helpers/socket';
// import EmojiBoard from './emojiBoard';
// import AttachMenu from '../../modals/attachMenu';
// import * as bi from 'react-icons/bi';

function MessageReply() {
  const dispatch = useDispatch();
  const {
    chore: { selectedChats },
    modal: { messageReply: replyBox },
    room: { chat: chatRoom },
    user: { master },
  } = useSelector((state) => state);

  const [form, setForm] = useState({
    text: '',
    file: null,
  });

  const [emojiBoard, setEmojiBoard] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = () => {
    const trimmedText = form.text.trim();
  
    if (trimmedText || form.file) {
      if (!chatRoom || !chatRoom.data || !chatRoom.data.roomId) {
        return;
      }
  
      console.log('Replying to messages:', selectedChats); // Log the IDs of selected messages
      console.log('Sending text:', trimmedText); // Log the text being sent
  
      socket.emit('chat/insert', {
        text: trimmedText, // Send the text separately
        file: form.file, // Send the file separately
        ownersId: chatRoom.data.ownersId,
        roomType: chatRoom.data.roomType,
        userId: master._id,
        roomId: chatRoom.data.roomId,
        replyTo: selectedChats, // Include the selected message IDs as 'replyTo'
      });
  
      setForm({ text: '', file: null });
      dispatch(setModal({ target: null }));
    }
  };
  

  useEffect(() => {
    socket.on('chat/insert', (payload) => {
      // Handle the insertion of the reply message if needed
    });

    return () => {
      socket.off('chat/insert');
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`
        ${replyBox ? 'delay-75 z-50' : '-z-50 opacity-0 delay-300'}
        absolute w-full h-full flex justify-center items-center
        bg-spill-600/40 dark:bg-black/60
      `}
      onClick={() => {
        setTimeout(() => {}, 150);
      }}
    >
      <div
        aria-hidden
        className={`${
          !replyBox && 'scale-0'
        } transition relative w-[400px] m-6 p-4 rounded-md bg-white dark:bg-spill-800`}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h1 className="text-2xl font-bold mb-1">Reply Message</h1>
        <textarea
          value={form.text}
          onChange={handleChange}
          name="text"
          className="w-full h-24 p-2 border border-gray-300 rounded-md mb-4"
          placeholder="Enter your reply..."
        />
        <span className="flex gap-2 justify-end">
          {[
            {
              label: 'Cancel',
              style: 'hover:bg-gray-100 dark:hover:bg-spill-700',
              action: () => {
                dispatch(setModal({ target: 'messageReply' }));
              },
            },
            {
              label: 'Send',
              style: 'font-bold text-white bg-rose-600 hover:bg-rose-700',
              action: () => handleSubmit(),
            },
          ].map((elem) => (
            <button
              key={elem.label}
              type="button"
              className={`${elem.style} py-2 px-4 rounded-md`}
              onClick={() => elem.action()}
            >
              <p>{elem.label}</p>
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}

export default MessageReply;
