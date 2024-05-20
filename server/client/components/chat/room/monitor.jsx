import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import * as ri from 'react-icons/ri';
import * as bi from 'react-icons/bi';
import * as md from 'react-icons/md';
import axios from 'axios';
import Linkify from 'linkify-react';
import socket from '../../../helpers/socket';
import {
  touchAndHoldStart,
  touchAndHoldEnd,
} from '../../../helpers/touchAndHold';
import { setSelectedChats } from '../../../redux/features/chore';
import { setPage } from '../../../redux/features/page';
import { setModal } from '../../../redux/features/modal';
import ReactionPicker from 'emoji-picker-react';
import LinkPreview from './linkPreview';
import ChatMenu from '../../modals/chatMenu';

function Monitor({
  newMessage,
  setNewMessage,
  chats,
  setChats,
  control,
  setControl,
  loaded,
}) {
  function extractLinks(text) {
    const linkRegex =
      /(?:https?:\/\/)?(?:www\.)?[\w\.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
    const matches = text.matchAll(linkRegex);
    const links = Array.from(matches, (match) => match[0]);
    return links;
  }

  const dispatch = useDispatch();
  const [openEmojiPickerForChat, setOpenEmojiPickerForChat] = useState(null);
  const [showReactionsForChat, setShowReactionsForChat] = useState(null);
  const emojiPickerRef = useRef(null);
  const reactionDetailsRef = useRef(null);

  const handleContextMenu = (e, elem) => {
    const chatContent = document.querySelector('#chat-content');
  
    const x = e.clientX > chatContent.clientWidth / 2 ? e.clientX - 160 : e.clientX;
    const y = e.clientY > chatContent.clientHeight / 2 ? e.clientY - 56 : e.clientY;
  
    console.log("X coordinate:", x);
    console.log("Y coordinate:", y);
  
    dispatch(
      setModal({
        target: 'chatMenu', // Adjusted to 'chatMenu'
        data: {
          chat: elem,
          x,
          y,
        },
      })
    );
    console.log("Context menu is open for chat:", elem._id);
  };

  const contextMenu = document.querySelector('#chat-context-menu');
  if (contextMenu) {
    const rect = contextMenu.getBoundingClientRect();
    console.log("Context menu is actually opening at:", rect.left, rect.top);
  }
  


  useEffect(() => {
    // Function to close emoji picker when clicking outside of it
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setOpenEmojiPickerForChat(null);
      }
    };

    // Add event listener to the document body
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup: remove event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openEmojiPickerForChat]); // Listen for changes in openEmojiPickerForChat

  const handleCloseReactionDetails = () => {
    setShowReactionsForChat(null);
  };

  useEffect(() => {
    // Function to close ReactionDetails when clicking outside of it
    const handleClickOutside = (event) => {
      if (
        reactionDetailsRef.current &&
        !reactionDetailsRef.current.contains(event.target)
      ) {
        handleCloseReactionDetails(); // Close ReactionDetails
      }
    };

    // Add event listener to the document body
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup: remove event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleCloseReactionDetails]);

  const ReactionDetails = ({ userId, reactions, chats, socket }) => {
    const [userFullNames, setUserFullNames] = useState({});
    const [loading, setLoading] = useState(true); // State to track loading status

    const emojiPickerRef = useRef(null);

    useEffect(() => {
      const fetchFullNames = async () => {
        const userIds = reactions.map((reaction) => reaction.userId);
        const uniqueUserIds = Array.from(new Set(userIds));

        const fullNames = {};
        for (const userId of uniqueUserIds) {
          try {
            const response = await axios.get(`/profiles/${userId}`);
            if (
              response.data &&
              response.data.payload &&
              response.data.payload.fullname
            ) {
              fullNames[userId] = response.data.payload.fullname;
            } else {
              fullNames[userId] = 'Unknown';
            }
          } catch (error) {
            console.error('Error fetching full name:', error);
            fullNames[userId] = 'Unknown';
          }
        }
        setUserFullNames(fullNames);
        setLoading(false); // Mark loading as complete after fetching full names
      };
      fetchFullNames();
    }, [reactions]);

    const handleRemoveReaction = (reaction) => {
      const { chatId, emoji } = reaction;
      console.log('Removing reaction for chat ID:', chatId);
      console.log('User ID:', userId);
      console.log('Emoji:', emoji);
      socket.emit('chat/react', {
        chatId,
        userId,
        emoji,
      });
    };

    // State to manage the active tab
    const [activeTab, setActiveTab] = useState('all');

    // Function to get unique emojis from all reactions
    const getUniqueEmojis = () => {
      const emojis = reactions.map((reaction) => reaction.emoji);
      return ['all', ...new Set(emojis)];
    };

    // Function to get the count of each emoji
    const getEmojiCount = (emoji) => {
      if (emoji === 'all') {
        return reactions.length;
      } else {
        return reactions.filter((reaction) => reaction.emoji === emoji).length;
      }
    };

    // Function to handle tab change
    const handleTabChange = (tab) => {
      setActiveTab(tab);
    };

    // Render tabs for all emojis and each person who reacted with the same emoji
    const renderTabs = () => {
      const uniqueEmojis = getUniqueEmojis();

      // Check if there are reactions available
      if (reactions.length === 0) {
        return <p className="text-gray-600">No reactions available</p>;
      }

      return (
        <div className="flex space-x-2 overflow-x-auto">
          {uniqueEmojis.map((emoji, index) => (
            <button
              key={index}
              className={`px-4 py-2 text-sm rounded-lg focus:outline-none ${
                activeTab === emoji
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 dark:bg-spill-600 text-gray-700 dark:text-white hover:bg-gray-400 dark:hover:bg-spill-700'
              }`}
              onClick={() => handleTabChange(emoji)}
            >
              {emoji === 'all'
                ? `All (${getEmojiCount('all')})`
                : `${emoji} (${getEmojiCount(emoji)})`}
            </button>
          ))}
        </div>
      );
    };

    // Filter reactions based on the selected tab
    let filteredReactions =
      activeTab === 'all'
        ? reactions
        : reactions.filter((reaction) => reaction.emoji === activeTab);

    // Move reacted emojis of the user who opened the ReactionDetails to the top
    const userReactions = filteredReactions.filter(
      (reaction) => reaction.userId === userId
    );
    const otherReactions = filteredReactions.filter(
      (reaction) => reaction.userId !== userId
    );
    filteredReactions = [...userReactions, ...otherReactions];

    return (
      <div
        ref={reactionDetailsRef}
        className="reaction-details max-w-fit absolute bg-spill-400/30 dark:bg-spill-500/30 backdrop-blur-md p-5 rounded-lg z-20"
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold mr-2">Reactions</h2>
          <button
            onClick={handleCloseReactionDetails}
            className="p-2 rounded-full bg-spill-100 hover:text-red-500 dark:bg-spill-500"
          >
            <bi.BiX />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center">
            <span className="flex gap-2 items-center">
              <i className="animate-spin">
                <bi.BiLoaderAlt size={18} />
              </i>
              <p>Loading</p>
            </span>
          </div>
        ) : (
          <>
            {renderTabs()}
            <ul className="mt-4">
              {filteredReactions.map((reaction, index) => (
                <li
                  key={index}
                  className={`border-b border-gray-200 last:border-b-0 ${
                    reaction.userId === userId
                      ? 'p-2 bg-sky-200 dark:bg-sky-600/40 rounded-xl'
                      : 'py-2'
                  }`}
                >
                  <div className="flex flex-row items-center">
                    <div className="mx-2">
                      {userFullNames[reaction.userId]}: {reaction.emoji}
                    </div>
                    <div>
                      {reaction.userId === userId && (
                        <button
                          className="p-2 rounded-full bg-red-500 dark:bg-red-800 hover:text-red-500 hover:bg-spill-100 dark:hover:bg-spill-800"
                          onClick={() =>
                            handleRemoveReaction({
                              ...reaction,
                              chatId: showReactionsForChat,
                            })
                          }
                        >
                          <i>
                            <bi.BiSolidTrash />
                          </i>
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  const handleSendReaction = (chatId, emoji) => {
    // Emit event to send reaction to server
    socket.emit('chat/react', { chatId, userId: master._id, emoji });

    console.log('Sent reaction for chat ID:', chatId, 'Emoji:', emoji);

    setOpenEmojiPickerForChat(null); // Hide emoji picker after sending reaction
  };

  // Event listener for receiving reaction updates from the server
  useEffect(() => {
    socket.on('chat/react', (updatedChat) => {
      // Update the specific chat with the received updated chat data
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === updatedChat._id
            ? { ...updatedChat, profile: chat.profile }
            : chat
        )
      );
    });

    return () => {
      socket.off('chat/react');
    };
  }, [setChats]);

  const renderReactions = (chatId) => {
    const chat = chats.find((chat) => chat._id === chatId);
    if (!chat || !chat.reactions || chat.reactions.length === 0) return null;

    // Count occurrences of each reaction emoji
    const reactionCounts = {};
    chat.reactions.forEach((reaction) => {
      if (reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji]++;
      } else {
        reactionCounts[reaction.emoji] = 1;
      }
    });

    // Sort reactions based on counts
    const sortedReactions = Object.entries(reactionCounts).sort(
      ([, countA], [, countB]) => countB - countA
    );

    // Display the reactions with counts
    const visibleReactions = sortedReactions.slice(0, 3);

    const remainingCount = sortedReactions
      .slice(3)
      .reduce((acc, [, count]) => acc + count, 0);

    return (
      <div className="flex flex-row items-center">
        {visibleReactions.map(([emoji, count], index) => (
          <span
            key={index}
            className={`flex flex-row py-1 px-2 rounded-full bg-spill-400 dark:bg-spill-500 ${
              index < visibleReactions.length - 1 ? 'mr-1' : ''
            }`}
            role="img"
            aria-label="reaction"
          >
            <div>{emoji}</div>
            <div>{count > 1 ? count : ''}</div>
          </span>
        ))}
        {remainingCount > 0 && <span className="px-1">+{remainingCount}</span>}
      </div>
    );
  };

  const {
    chore: { selectedChats },
    room: { chat: chatRoom },
    user: { master },
    page,
    modal,
  } = useSelector((state) => state);

  const isGroup = chatRoom.data.roomType === 'group';
  const isScrolled = useRef(false);
  const [loadingScroll, setLoadingScroll] = useState(false);

  useEffect(() => {
    if (chats) {
      const last = chats[chats.length - 1];

      if (master._id !== last?.userId && !last?.readed) {
        const { roomId, ownersId } = chatRoom.data;

        socket.emit('chat/read', { roomId, ownersId });
      }
    }
  }, [chats ? chats[chats.length - 1] : !!chats]);

  useEffect(() => {
    socket.on('chat/read', () => {
      setChats((prev) => {
        prev
          .filter((elem) => !elem.readed)
          .map((elem) => Object.assign(elem, { readed: true }));

        return [...prev];
      });
    });

    socket.on('chat/delete', ({ userId, chatsId }) => {
      if (chatRoom.isOpen) {
        if (userId === master._id) {
          dispatch(setSelectedChats(null));
          // close confirmDeleteChat modal
          dispatch(
            setModal({
              target: 'confirmDeleteChat',
              data: false,
            })
          );
        }

        setTimeout(() => {
          setChats((prev) =>
            prev.filter((elem) => !chatsId.includes(elem._id))
          );
        }, 300);
      }
    });

    return () => {
      socket.off('chat/read');
      socket.off('chat/delete');
    };
  }, []);

  const handleInfiniteScroll = async (e) => {
    const { scrollTop } = e.target;
    const { skip, limit } = control;

    if (scrollTop === 0) {
      e.target.scrollTop = 1;
    }

    if (
      scrollTop < 128 &&
      chats?.length >= skip + limit &&
      !isScrolled.current
    ) {
      isScrolled.current = true;
      setLoadingScroll(true);

      const { data } = await axios.get(`/chats/${chatRoom.data.roomId}`, {
        params: {
          skip: skip + limit,
          limit,
        },
      });

      setChats((prev) => [...data.payload, ...prev]);
      setControl((prev) => ({
        ...prev,
        skip: prev.skip + prev.limit,
      }));

      setLoadingScroll(false);

      setTimeout(() => {
        isScrolled.current = false;
      }, 1000);
    }
  };

  const renderReplies = (replyTo) => {
    // Filter out replies for which the corresponding chat is not yet loaded
    const pendingReplies = replyTo.filter(
      (replyId) => !chats.find((chat) => chat._id === replyId)
    );

    return pendingReplies
      .map((replyId) => {
        // Render placeholder for pending reply
        return (
          <div
            key={replyId}
            className="relative mb-2 rounded-xl grid grid-cols-[auto_1fr] overflow-hidden bg-black/5 dark:bg-black/20"
          >
            <span className="block w-1 h-full bg-sky-600 dark:bg-sky-200"></span>
            <span className="py-2 px-3">
              Reply can't be loaded because the chat it was replied to is not
              loaded. Please scroll up to load it
            </span>
          </div>
        );
      })
      .concat(
        // Render loaded replies
        replyTo
          .filter((replyId) => {
            const reply = chats.find((chat) => chat._id === replyId);
            return reply && (reply.text || reply.file);
          })
          .map((replyId) => {
            const reply = chats.find((chat) => chat._id === replyId);
            if (!reply) return null;

            let replyContent = null;

            if (reply.text) {
              replyContent = (
                <>
                  <div>
                    {reply.userId === master._id ? (
                      <span className="text-gray-500 dark:text-gray-400">
                        Replying to yourself:
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Replying to {reply.profile?.fullname}:
                      </span>
                    )}
                    <br />
                  </div>
                  <div>
                    <p
                      className="text-justify"
                      style={{
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                      aria-hidden
                      onClick={(e) => {
                        if (e.ctrlKey) e.preventDefault();
                      }}
                    >
                      {extractLinks(reply.text).length > 0 ? (
                        extractLinks(reply.text).map((link, index) => (
                          <span key={index}>
                            <span className="break-words">
                              {index === 0
                                ? reply.text.split(link)[0]
                                : reply.text
                                    .split(
                                      extractLinks(reply.text)[index - 1]
                                    )[1]
                                    .split(link)[0]}
                            </span>
                            <span className="break-all">
                              <span className="link-a">{link}</span>
                            </span>
                            {index === extractLinks(reply.text).length - 1 && (
                              <span className="break-words">
                                {reply.text.split(link)[1]}
                              </span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="select-none">
                          <span>{reply.text}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </>
              );
            } else if (reply.file) {
              replyContent = (
                <span>
                  {reply.userId === master._id ? (
                    <span className="text-gray-500 dark:text-gray-400">
                      Replying to yourself:
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      Replying to {reply.profile?.fullname}:
                    </span>
                  )}
                  <br />
                  {reply.file.type === 'image' ? (
                    <img
                      src={reply.file.url}
                      alt="File Preview"
                      className="w-[10vw] pt-1 rounded-lg cursor-pointer brightness-75 hover:brightness-90"
                    />
                  ) : (
                    <span
                      className={`${
                        reply.userId === master._id
                          ? 'bg-sky-100'
                          : 'bg-spill-100'
                      } p-2 grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg dark:bg-black/20`}
                    >
                      <i className="translate-y-0.5">
                        <ri.RiFileTextFill size={20} />
                      </i>
                      <p className="break-all">{reply.file.originalname}</p>
                      <a
                        href={reply.file.url}
                        download={reply.file.originalname}
                        className="block ml-2 translate-y-0.5"
                      >
                        <i className="text-black dark:text-white hover:text-sky-600 dark:hover:text-sky-400">
                          <bi.BiDownload size={20} />
                        </i>
                      </a>
                    </span>
                  )}
                </span>
              );
            }

            return (
              <div
                key={reply._id}
                className="relative mb-2 rounded-xl grid grid-cols-[auto_1fr] overflow-hidden bg-black/5 dark:bg-black/20"
                onClick={() => {
                  const contentId = `content-${reply._id}`;
                  const content = document.getElementById(contentId);
                  content.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
              >
                <span className="block w-1 h-full bg-sky-600 dark:bg-sky-200"></span>
                <span className="py-2 px-3">{replyContent}</span>
              </div>
            );
          })
      );
  };

  return (
    <div
      id="monitor"
      aria-hidden
      className={`
        ${
          loaded ? 'scrollbar-thin' : 'scrollbar-none'
        } scrollbar-thumb-spill-300 hover:scrollbar-thumb-spill-400 dark:scrollbar-thumb-spill-800 dark:hover:scrollbar-thumb-spill-700
        select-text relative overflow-y-auto bg-spill-100 dark:bg-spill-950 select-none
      `}
      onScroll={handleInfiniteScroll}
    >
      {!loaded && (
        <div className="absolute w-full h-full z-10 flex justify-center items-center bg-spill-100 dark:bg-spill-950 select-none">
          <span className="flex gap-2 items-center">
            <i className="animate-spin">
              <bi.BiLoaderAlt size={18} />
            </i>
            <p>Loading</p>
          </span>
        </div>
      )}
      <div
        id="monitor-content"
        className="relative py-4 flex flex-col select-none"
      >
        {loadingScroll && (
          <div className="mb-2 flex justify-center">
            <i className="animate-spin">
              <bi.BiLoaderAlt size={32} />
            </i>
          </div>
        )}
        {modal.chatMenu && <ChatMenu />}
        {chats &&
          chats
            .filter((elem) => !elem.deletedBy.includes(master._id))
            .map((elem, i, arr) => (
              <React.Fragment key={elem._id}>
                {
                  // chat header: show datetime every new days
                  moment(elem.createdAt).date() !==
                    (i > 0 && moment(arr[i - 1].createdAt).date()) && (
                    <div className="my-2 flex justify-center">
                      <span className="block py-0.5 px-2 rounded-full bg-white dark:bg-spill-800">
                        <p className="text-sm">
                          {moment(elem.createdAt).format('LL')}
                        </p>
                      </span>
                    </div>
                  )
                }
                <div
                  className={`
                              ${elem.userId !== arr[i + 1]?.userId && 'mb-2'}
                              ${selectedChats ? 'cursor-pointer' : ''}
                              ${
                                selectedChats &&
                                selectedChats.includes(elem._id) &&
                                'bg-spill-200 dark:bg-black/20'
                              }
                              w-full py-0.5 px-4 gap-4 justify-center items-center
                              relative
                            `}
                  aria-hidden
                  onClick={() => {
                    if (selectedChats) {
                      dispatch(setSelectedChats(elem._id));
                    }
                  }}
                >
                  {selectedChats && (
                    <span
                      className={`${
                        selectedChats.includes(elem._id)
                          ? 'bg-sky-400 dark:bg-sky-600'
                          : 'transparent'
                      } w-6 h-6 flex flex-none justify-center items-center rounded-full border-2 border-solid border-spill-900/60 dark:border-spill-100/60 absolute top-1/2 left-2 transform -translate-y-1/2`}
                    >
                      {selectedChats.includes(elem._id) && (
                        <bi.BiCheck size={18} />
                      )}
                    </span>
                  )}
                  <div
                  id='chat-content'
                    className={`
                      ${
                        elem.userId === master._id
                          ? 'justify-end' // For right-aligned content (far right)
                          : 'justify-start' // For left-aligned content (far left)
                      }
                      flex
                      ${
                        selectedChats && 'pl-2'
                      } // Adjust left padding for all chats when select circle is visible
                    `}
// Modify the onContextMenu function to capture the coordinates of the right-click event
onContextMenu={(e) => {
  e.stopPropagation();
  e.preventDefault();

  // Capture the coordinates of the right-click event
  const posX = e.clientX;
  const posY = e.clientY;

  // Pass the coordinates to the handleContextMenu function
  handleContextMenu(e, elem, posX, posY);
}}

                    onTouchStart={(e) => {
                      touchAndHoldStart(() => handleContextMenu(e, elem));
                    }}
                    onTouchMove={() => touchAndHoldEnd()}
                    onTouchEnd={() => touchAndHoldEnd()}
                  >
                    {elem.userId === master._id && (
                      // start of I want this to be at far right
                      <div>
                        <div className="flex items-center">
                          <div className="flex">
                            <div>
                              {/* Render emoji picker for the specific chat */}
                              {openEmojiPickerForChat === elem._id && (
                                <div
                                  className="absolute mt-[45px] left-1/2 transform -translate-x-1/2 z-50 lg:absolute lg:left-auto lg:-translate-x-0 lg:ml-[-115px]"
                                  ref={emojiPickerRef}
                                >
                                  <ReactionPicker
                                    onEmojiClick={(emojiObject) => {
                                      const reactEmoji = emojiObject.emoji;
                                      console.log(
                                        'Selected emoji:',
                                        reactEmoji
                                      );
                                      handleSendReaction(elem._id, reactEmoji);
                                    }}
                                    emojiStyle="facebook"
                                    theme="auto"
                                    previewConfig={{ showPreview: false }}
                                    autoFocusSearch={false}
                                    lazyLoadEmojis={true}
                                    reactionsDefaultOpen={true}
                                    allowExpandReactions={true}
                                  />
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenEmojiPickerForChat((prevState) =>
                                  prevState === elem._id ? null : elem._id
                                );
                              }}
                              className="reaction-button ml-0 md:ml-8 p-2 rounded-full bg-spill-200 hover:bg-spill-400 dark:bg-spill-800 dark:hover:bg-spill-600"
                            >
                              {openEmojiPickerForChat === elem._id ? (
                                <i>
                                  <md.MdOutlineClose
                                    role="img"
                                    aria-label="Close Emoji Picker"
                                  />
                                </i>
                              ) : (
                                <i>
                                  <md.MdOutlineAddReaction
                                    role="img"
                                    aria-label="Add Reaction"
                                  />
                                </i>
                              )}
                            </button>
                          </div>
                          {/* chat card */}
                          <div
                            className={`
                            ml-2 
                            rounded-l-xl 
                            bg-sky-200 dark:bg-sky-600/40
                            max-w-[65vw] md:max-w-[30vw] lg:max-w-[450px]
                            ${
                              modal.chatMenu?.chatId === elem._id &&
                              'bg-spill-100/60 dark:bg-spill-800/60'
                            }
                            ${
                              elem.userId === arr[i - 1]?.userId &&
                              moment(elem.createdAt).date() ===
                                moment(arr[i - 1]?.createdAt).date() &&
                              'rounded-xl'
                            }
                            group relative p-2 rounded-b-xl overflow-hidden
                          `}
                            aria-hidden
                          >
                            {isGroup && (
                              <span
                                className="truncate grid grid-cols-[auto_1fr] gap-2 items-start cursor-pointer p-1 mb-2 rounded-full bg-sky-300 dark:bg-sky-600/40"
                                aria-hidden
                                onClick={() => {
                                  if (
                                    master._id !== elem.userId &&
                                    page.friendProfile !== elem.userId &&
                                    !selectedChats
                                  ) {
                                    dispatch(
                                      setPage({
                                        target: 'friendProfile',
                                        data: elem.userId,
                                      })
                                    );
                                  }
                                }}
                              >
                                <img
                                  src={
                                    elem.profile?.avatar ??
                                    'assets/images/default-avatar.png'
                                  }
                                  alt=""
                                  className="w-6 h-6 rounded-full"
                                />
                                <p className="font-bold truncate text-sky-800 dark:text-sky-200">
                                  {elem.profile?.fullname ?? '[inactive]'}
                                </p>
                              </span>
                            )}

                            {elem.replyTo && renderReplies(elem.replyTo)}
                            {elem.file && (
                              <div className="mb-2">
                                {elem.file.type === 'image' && (
                                  <img
                                    src={elem.file.url}
                                    alt=""
                                    className="w-[30vw] rounded-lg cursor-pointer hover:brightness-75"
                                    aria-hidden
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dispatch(
                                        setModal({
                                          target: 'photoFull',
                                          data: elem.file.url,
                                        })
                                      );
                                    }}
                                  />
                                )}
                                {elem.file.type !== 'image' && (
                                  <span
                                    className={`
                                  ${
                                    elem.userId === master._id
                                      ? 'bg-sky-100'
                                      : 'bg-spill-100'
                                  }
                                  p-2 grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg dark:bg-black/20
                                `}
                                  >
                                    <i className="translate-y-0.5">
                                      <ri.RiFileTextFill size={20} />
                                    </i>
                                    <p className="break-all">
                                      {elem.file.originalname}
                                    </p>
                                    <a
                                      href={elem.file.url}
                                      download={elem.file.originalname}
                                      className="block ml-2 translate-y-0.5"
                                    >
                                      <i className="text-black dark:text-white hover:text-sky-600 dark:hover:text-sky-400">
                                        <bi.BiDownload size={20} />
                                      </i>
                                    </a>
                                  </span>
                                )}
                              </div>
                            )}
                            {/* chat body message */}
                            <div
                              id={`content-${elem._id}`}
                              className={`${
                                elem.userId === master._id
                              }`}
                            >
                              {/* Content of the chat */}
                              <div>
                                {extractLinks(elem.text).length > 0 && (
                                  <div>
                                    {extractLinks(elem.text).map(
                                      (link, index) => (
                                        <div key={index}>
                                          <div>
                                            <LinkPreview url={link} />
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                                <p
                                  className="text-justify break-words px-1"
                                  aria-hidden
                                  onClick={(e) => {
                                    if (e.ctrlKey) e.preventDefault();
                                  }}
                                >
                                  {extractLinks(elem.text).length > 0 ? (
                                    extractLinks(elem.text).map(
                                      (link, index) => (
                                        <span key={index}>
                                          <span className="break-words">
                                            {index === 0
                                              ? elem.text.split(link)[0]
                                              : elem.text
                                                  .split(
                                                    extractLinks(elem.text)[
                                                      index - 1
                                                    ]
                                                  )[1]
                                                  .split(link)[0]}
                                          </span>
                                          <span className="break-all">
                                            <Linkify>{link}</Linkify>
                                          </span>
                                          {index ===
                                            extractLinks(elem.text).length -
                                              1 && (
                                            <span className="break-words">
                                              {elem.text.split(link)[1]}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    )
                                  ) : (
                                    <span className="md:select-text">
                                      <Linkify>{elem.text}</Linkify>
                                    </span>
                                  )}
                                </p>
                                <span
                                  className={`${
                                    elem.userId === master._id && 'mr-5'
                                  } invisible text-xs ml-1`}
                                >
                                  {moment(elem.createdAt).format('LT')}
                                </span>
                              </div>

                              <span className="p-2 absolute bottom-0 right-0 flex gap-0.5 items-center">
                                <p className="text-xs opacity-80">
                                  {moment(elem.createdAt).format('LT')}
                                </p>
                                {elem.userId === master._id && (
                                  <i>
                                    {elem.readed ? (
                                      <ri.RiCheckDoubleFill
                                        size={18}
                                        className="text-sky-600 dark:text-sky-400"
                                      />
                                    ) : (
                                      <ri.RiCheckFill
                                        size={18}
                                        className="opacity-80"
                                      />
                                    )}
                                  </i>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        {renderReactions(elem._id) && (
                          <div className="left-16 md:left-24 -mt-2 z-10 relative max-w-fit">
                            <button
                              onClick={() => setShowReactionsForChat(elem._id)}
                              type="button"
                              className="p-1 rounded-full bg-spill-200 hover:bg-spill-300 dark:bg-spill-800 hover:dark:bg-spill-700"
                            >
                              {renderReactions(elem._id)}
                            </button>
                          </div>
                        )}

                        {showReactionsForChat &&
                          showReactionsForChat === elem._id && (
                            <ReactionDetails
                              userId={master._id}
                              reactions={
                                chats.find(
                                  (chat) => chat._id === showReactionsForChat
                                )?.reactions || []
                              }
                              chats={chats}
                              chatId={showReactionsForChat} // Pass chatId prop to ReactionDetails
                              fullName={elem.profile?.fullname ?? '[inactive]'}
                              socket={socket} // Assuming socket is available in your component
                              handleCloseReactionDetails={() =>
                                setShowReactionsForChat(null)
                              } // Assuming you have a function to close ReactionDetails
                            />
                          )}
                      </div>
                      // end of I want rhis to be at far right
                    )}
                    {elem.userId !== master._id && (
                      <div className={`${selectedChats && 'pl-6'} `}>
                        <div className="flex items-center">
                          {/* chat card */}
                          <div
                            className={`
                            mr-2 
                            rounded-r-xl 
                            bg-white dark:bg-spill-700
                            max-w-[65vw] md:max-w-[30vw] lg:max-w-[450px]
                            ${
                              modal.chatMenu?.chatId === elem._id &&
                              'bg-spill-100/60 dark:bg-spill-800/60'
                            }
                            ${
                              elem.userId === arr[i - 1]?.userId &&
                              moment(elem.createdAt).date() ===
                                moment(arr[i - 1]?.createdAt).date() &&
                              'rounded-xl'
                            }
                            group relative p-2 rounded-b-xl overflow-hidden
                          `}
                            aria-hidden
                          >
                            {isGroup && (
                              <span
                                className="truncate grid grid-cols-[auto_1fr] gap-2 items-start cursor-pointer p-1 mb-2 rounded-full bg-spill-100 dark:bg-spill-600"
                                aria-hidden
                                onClick={() => {
                                  if (
                                    master._id !== elem.userId &&
                                    page.friendProfile !== elem.userId &&
                                    !selectedChats
                                  ) {
                                    dispatch(
                                      setPage({
                                        target: 'friendProfile',
                                        data: elem.userId,
                                      })
                                    );
                                  }
                                }}
                              >
                                <img
                                  src={
                                    elem.profile?.avatar ??
                                    'assets/images/default-avatar.png'
                                  }
                                  alt=""
                                  className="w-6 h-6 rounded-full"
                                />
                                <p className="font-bold truncate text-sky-800 dark:text-sky-200">
                                  {elem.profile?.fullname ?? '[inactive]'}
                                </p>
                              </span>
                            )}

                            {elem.replyTo && renderReplies(elem.replyTo)}
                            {elem.file && (
                              <div className="mb-2">
                                {elem.file.type === 'image' && (
                                  <img
                                    src={elem.file.url}
                                    alt=""
                                    className="w-[30vw] rounded-lg cursor-pointer hover:brightness-75"
                                    aria-hidden
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dispatch(
                                        setModal({
                                          target: 'photoFull',
                                          data: elem.file.url,
                                        })
                                      );
                                    }}
                                  />
                                )}
                                {elem.file.type !== 'image' && (
                                  <span
                                    className={`
                                  ${
                                    elem.userId === master._id
                                      ? 'bg-sky-100'
                                      : 'bg-spill-100'
                                  }
                                  p-2 grid grid-cols-[auto_1fr_auto] gap-2 rounded-lg dark:bg-black/20
                                `}
                                  >
                                    <i className="translate-y-0.5">
                                      <ri.RiFileTextFill size={20} />
                                    </i>
                                    <p className="break-all">
                                      {elem.file.originalname}
                                    </p>
                                    <a
                                      href={elem.file.url}
                                      download={elem.file.originalname}
                                      className="block ml-2 translate-y-0.5"
                                    >
                                      <i className="text-black dark:text-white hover:text-sky-600 dark:hover:text-sky-400">
                                        <bi.BiDownload size={20} />
                                      </i>
                                    </a>
                                  </span>
                                )}
                              </div>
                            )}
                            {/* chat body message */}
                            <div
                              id={`content-${elem._id}`}
                              className={`${
                                elem.userId === master._id
                              }`}
                            >
                              {/* Content of the chat */}
                              <div>
                                {extractLinks(elem.text).length > 0 && (
                                  <div>
                                    {extractLinks(elem.text).map(
                                      (link, index) => (
                                        <div key={index}>
                                          <div>
                                            <LinkPreview url={link} />
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                                <p
                                  className="text-justify break-words px-1"
                                  aria-hidden
                                  onClick={(e) => {
                                    if (e.ctrlKey) e.preventDefault();
                                  }}
                                >
                                  {extractLinks(elem.text).length > 0 ? (
                                    extractLinks(elem.text).map(
                                      (link, index) => (
                                        <span key={index}>
                                          <span className="break-words">
                                            {index === 0
                                              ? elem.text.split(link)[0]
                                              : elem.text
                                                  .split(
                                                    extractLinks(elem.text)[
                                                      index - 1
                                                    ]
                                                  )[1]
                                                  .split(link)[0]}
                                          </span>
                                          <span className="break-all">
                                            <Linkify>{link}</Linkify>
                                          </span>
                                          {index ===
                                            extractLinks(elem.text).length -
                                              1 && (
                                            <span className="break-words">
                                              {elem.text.split(link)[1]}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    )
                                  ) : (
                                    <span className="md:select-text">
                                      <Linkify>{elem.text}</Linkify>
                                    </span>
                                  )}
                                </p>
                                <span
                                  className={`${
                                    elem.userId === master._id && 'mr-5'
                                  } invisible text-xs ml-1`}
                                >
                                  {moment(elem.createdAt).format('LT')}
                                </span>
                              </div>

                              <span className="p-2 absolute bottom-0 right-0 flex gap-0.5 items-center">
                                <p className="text-xs opacity-80">
                                  {moment(elem.createdAt).format('LT')}
                                </p>
                                {elem.userId === master._id && (
                                  <i>
                                    {elem.readed ? (
                                      <ri.RiCheckDoubleFill
                                        size={18}
                                        className="text-sky-600 dark:text-sky-400"
                                      />
                                    ) : (
                                      <ri.RiCheckFill
                                        size={18}
                                        className="opacity-80"
                                      />
                                    )}
                                  </i>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex">
                            <div>
                              {/* Render emoji picker for the specific chat */}
                              {openEmojiPickerForChat === elem._id && (
                                <div
                                  className="absolute mt-[45px] left-1/2 transform -translate-x-1/2 z-50 lg:absolute lg:left-auto lg:-translate-x-0 lg:ml-[-145px]"
                                  ref={emojiPickerRef}
                                >
                                  <ReactionPicker
                                    onEmojiClick={(emojiObject) => {
                                      const reactEmoji = emojiObject.emoji;
                                      console.log(
                                        'Selected emoji:',
                                        reactEmoji
                                      );
                                      handleSendReaction(elem._id, reactEmoji);
                                    }}
                                    emojiStyle="facebook"
                                    theme="auto"
                                    previewConfig={{ showPreview: false }}
                                    autoFocusSearch={false}
                                    lazyLoadEmojis={true}
                                    reactionsDefaultOpen={true}
                                    allowExpandReactions={true}
                                  />
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenEmojiPickerForChat((prevState) =>
                                  prevState === elem._id ? null : elem._id
                                );
                              }}
                              className="reaction-button mr-0 md:mr-8 p-2 rounded-full bg-spill-200 hover:bg-spill-400 dark:bg-spill-800 dark:hover:bg-spill-600"
                            >
                              {openEmojiPickerForChat === elem._id ? (
                                <i>
                                  <md.MdOutlineClose
                                    role="img"
                                    aria-label="Close Emoji Picker"
                                  />
                                </i>
                              ) : (
                                <i>
                                  <md.MdOutlineAddReaction
                                    role="img"
                                    aria-label="Add Reaction"
                                  />
                                </i>
                              )}
                            </button>
                          </div>
                        </div>
                        {renderReactions(elem._id) && (
                          <div className="left-4 -mt-2 z-10 max-w-fit relative">
                            <button
                              onClick={() => setShowReactionsForChat(elem._id)}
                              type="button"
                              className="p-1 rounded-full bg-spill-200 hover:bg-spill-300 dark:bg-spill-800 hover:dark:bg-spill-700"
                            >
                              {renderReactions(elem._id)}
                            </button>
                          </div>
                        )}
                        {showReactionsForChat &&
                          showReactionsForChat === elem._id && (
                            <ReactionDetails
                              userId={master._id}
                              reactions={
                                chats.find(
                                  (chat) => chat._id === showReactionsForChat
                                )?.reactions || []
                              }
                              chats={chats}
                              chatId={showReactionsForChat} // Pass chatId prop to ReactionDetails
                              fullName={elem.profile?.fullname ?? '[inactive]'}
                              socket={socket} // Assuming socket is available in your component
                              handleCloseReactionDetails={() =>
                                setShowReactionsForChat(null)
                              } // Assuming you have a function to close ReactionDetails
                            />
                          )}
                      </div>
                      // end of I want this to be at far left
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
        {chats && !isGroup && !chatRoom.data.profile.active && (
          <div className="py-2 px-6 flex justify-center border-0 border-y border-solid border-rose-400 dark:border-rose-200/60 bg-rose-400/10 dark:bg-rose-200/20">
            <div className="w-[560px]">
              <p className="text-rose-900 dark:text-rose-100">
                This account has been deleted by the owner, you no longer have
                access to send messages to this account.
              </p>
            </div>
          </div>
        )}
        {isGroup &&
          !chatRoom.data.group.participantsId.includes(master._id) && (
            <div className="py-2 px-6 flex justify-center border-0 border-y border-solid border-rose-400 dark:border-rose-200/60 bg-rose-400/10 dark:bg-rose-200/20">
              <div className="w-[560px]">
                <p className="text-rose-900 dark:text-rose-100">
                  You cannot access this group because you&#39;re not a
                  participant of this group.
                </p>
              </div>
            </div>
          )}
        {newMessage > 0 && (
          <button
            type="button"
            className="group fixed z-10 bottom-0 right-0 w-12 h-12 flex justify-center items-center rounded-full -translate-y-20 -translate-x-4 bg-white dark:bg-spill-800 hover:bg-sky-600 dark:hover:bg-sky-600"
            onClick={() => {
              const monitor = document.querySelector('#monitor');
              monitor.scrollTo({
                top: monitor.scrollHeight,
                behavior: 'smooth',
              });

              setTimeout(() => setNewMessage(0), 150);
            }}
          >
            <span className="font-bold absolute top-0 px-2 -translate-y-2/3 rounded-full text-white bg-sky-600">
              {newMessage}
            </span>
            <i className="group-hover:text-white">
              <bi.BiChevronDown size={28} />
            </i>
          </button>
        )}
      </div>
    </div>
  );
}

export default Monitor;
