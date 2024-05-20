import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as bi from 'react-icons/bi';
import * as md from 'react-icons/md';
import { setModal } from '../../redux/features/modal';

function ChatMenu() {
  const dispatch = useDispatch();
  const menu = useSelector((state) => state.modal.chatMenu);

  return (
    <div
      id="chat-context-menu"
      className=" left-0 top-0 z-10 w-40 py-2 rounded-md shadow-xl translate-x-12 -translate-y-14 bg-white dark:bg-spill-700"
      aria-hidden
      onClick={(e) => e.stopPropagation()}
      style={{
        transform: `translate(${menu.x}px, ${menu.y}px)`,
      }}
    >
        {console.log("X coordinate in menu:", menu.x)}
  {console.log("Y coordinate in menu:", menu.y)}
      <div className="grid">
        {/* Reply */}
        <button
          type="button"
          className="py-2 px-4 flex gap-4 items-center cursor-pointer hover:bg-spill-200 dark:hover:bg-spill-600"
          onClick={(e) => {
            e.stopPropagation();
            // Implement reply functionality here
          }}
        >
          <i className="opacity-80">
            <bi.BiReply />
          </i>
          <p>Reply</p>
        </button>

        {/* Select */}
        <button
          type="button"
          className="py-2 px-4 flex gap-4 items-center cursor-pointer hover:bg-spill-200 dark:hover:bg-spill-600"
          onClick={(e) => {
            e.stopPropagation();
            // Implement select functionality here
          }}
        >
          <i className="opacity-80">
            <bi.BiSelection />
          </i>
          <p>Select</p>
        </button>

        {/* Copy text */}
        <button
          type="button"
          className="py-2 px-4 flex gap-4 items-center cursor-pointer hover:bg-spill-200 dark:hover:bg-spill-600"
          onClick={(e) => {
            e.stopPropagation();
            // Implement copy text functionality here
          }}
        >
          <i className="opacity-80">
            <bi.BiCopy />
          </i>
          <p>Copy Text</p>
        </button>

        {/* Remove */}
        <button
          type="button"
          className="py-2 px-4 flex gap-4 items-center cursor-pointer hover:bg-spill-200 dark:hover:bg-spill-600"
          onClick={(e) => {
            e.stopPropagation();
            // Implement remove functionality here
          }}
        >
          <i className="opacity-80">
            <bi.BiTrash />
          </i>
          <p>Remove</p>
        </button>

        {/* Add a reaction */}
        <button
          type="button"
          className="py-2 px-4 flex gap-4 items-center cursor-pointer hover:bg-spill-200 dark:hover:bg-spill-600"
          onClick={(e) => {
            e.stopPropagation();
            // Implement add a reaction functionality here
          }}
        >
          <i className="opacity-80">
          <md.MdOutlineAddReaction />
          </i>
          <p>Add a Reaction</p>
        </button>
      </div>
    </div>
  );
}

export default ChatMenu;
