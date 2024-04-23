import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as bi from 'react-icons/bi';
import socket from '../../../helpers/socket';
import EmojiPicker from 'emoji-picker-react';
import { setModal } from '../../../redux/features/modal';
import { setSelectedChats } from '../../../redux/features/chore';
import AttachMenu from '../../modals/attachMenu';

function Send({ setChats, setNewMessage, control }) {
  const dispatch = useDispatch();
  const {
    user: { master, setting },
    room: { chat: chatRoom },
    chore: { selectedChats },
  } = useSelector((state) => state);

  const isGroup = chatRoom.data.roomType === 'group';

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [form, setForm] = useState({
    text: '',
    file: null,
  });

  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.body.addEventListener('click', handleOutsideClick);

    return () => {
      document.body.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    const { roomId, roomType } = chatRoom.data;
    socket.emit('chat/typing', {
      roomType,
      roomId,
      userId: master._id,
    });
  };

  const handleSubmit = () => {
    const trimmedText = form.text.trim();

    if (trimmedText.length > 0 || form.file) {
      const messagePayload = {
        ...form,
        text: trimmedText,
        ownersId: chatRoom.data.ownersId,
        roomType: chatRoom.data.roomType,
        userId: master._id,
        roomId: chatRoom.data.roomId,
        replyTo: selectedChats,
      };

      socket.emit('chat/insert', messagePayload);

      setForm({ text: '', file: null });

      dispatch(setSelectedChats(null));
    }
  };

  useEffect(() => {
    socket.on('chat/insert', (payload) => {
      if (chatRoom.isOpen) {
        setChats((prev) => {
          if (prev) {
            if (prev.length >= control.limit) {
              prev.shift();
            }
            return [...prev, payload];
          }
          return [payload];
        });
      }

      setTimeout(() => {
        const monitor = document.querySelector('#monitor');

        if (payload.userId === master._id) {
          monitor.scrollTo({
            top: monitor.scrollHeight,
            behavior: 'smooth',
          });
          return;
        }

        if (
          monitor.scrollHeight - monitor.clientHeight >=
          monitor.scrollTop + monitor.clientHeight / 2
        ) {
          setNewMessage((prev) => prev + 1);
        } else {
          monitor.scrollTo({
            top: monitor.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 150);
    });

    return () => {
      socket.off('chat/insert');
    };
  }, []);

  const handleEmojiClick = (emojiObject) => {
    setForm((prev) => ({
      ...prev,
      text: prev.text + emojiObject.emoji,
    }));
  };

  const handleEmojiButtonClick = (event) => {
    event.stopPropagation();
    setShowEmojiPicker((prev) => !prev);
  };

  return (
    <div className="bg-white dark:bg-spill-900 relative">
      <AttachMenu />
      <div className="px-2 h-16 grid grid-cols-[auto_1fr_auto] gap-2 items-center">
        <span className="flex">
          <button
            type="button"
            className={`p-2 rounded-full hover:bg-spill-100 dark:hover:bg-spill-800 ${
              showEmojiPicker}`}
            onClick={handleEmojiButtonClick}
          >
            <i>
              {showEmojiPicker ? (
                <bi.BiX />
              ) : (
                <bi.BiSmile />
              )}
            </i>
          </button>
          <button
            type="button"
            className="p-2 rounded-full -rotate-90 hover:bg-spill-100 dark:hover:bg-spill-800"
            onClick={(e) => {
              e.stopPropagation();

              const { group, profile } = chatRoom.data;
              const participant = group?.participantsId.includes(master._id);

              if ((!isGroup && profile.active) || (isGroup && participant)) {
                dispatch(setModal({ target: 'attachMenu' }));
              }
            }}
          >
            <i>
              <bi.BiPaperclip />
            </i>
          </button>
        </span>
        <input
          type="text"
          name="text"
          id="new-message"
          placeholder="Type a message"
          className="py-4 w-full h-full placeholder:opacity-60"
          onChange={handleChange}
          value={form.text}
          onKeyPress={(e) => {
            if (setting.enterToSend && e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        <button
          type="submit"
          className="p-2 rounded-full hover:bg-spill-100 dark:hover:bg-spill-800"
          disabled={!form.text.trim()}
          onClick={(e) => {
            if (form.text.trim().length > 0) {
              handleSubmit(e);
            }
          }}
        >
          <i>
            {form.text.trim() ? <bi.BiSend /> : <bi.BiMicrophone />}
          </i>
        </button>
      </div>
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-20 left-0 sm:left-5 z-50">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            emojiStyle="facebook"
            theme="auto"
            previewConfig={{ showPreview: false }}
            autoFocusSearch={false}
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
}

export default Send;
