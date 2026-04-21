import React, { useEffect, useState } from "react";
import { ChatState } from "../../Context/ProviderChat";

import {
  Box,
  FormControl,
  Input,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getSender, getSenderFull } from "../../config/ChatLogics";
import UpdateGroupChatModal from "./UpdateGroupChatModal";
import ProfileModal from "./ProfileModal";
import { IconButton } from "@chakra-ui/button";
import axios from "axios";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import { API_URL } from "../../config/api";

var Socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [message, setMessage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);

  const { user, selectedChat, setSelectedChat, setNotification } = ChatState();
  const toast = useToast();

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `${API_URL}/api/message/${selectedChat._id}`,
        config
      );

      setMessage(data);
      setLoading(false);
      const room = String(selectedChat._id);
      const joinRoom = () => Socket?.emit("join chat", room);
      if (Socket?.connected) joinRoom();
      else Socket?.once("connect", joinRoom);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error Occured",
        description: "Failed to Load the Message",
        status: "error",
        duration: "5000",
        isClosable: true,
        position: "bottom",
      });
    }
  };

  useEffect(() => {
    if (!user?._id) return;

    Socket = io(API_URL);
    Socket.emit("setup", user);
    Socket.on("connected", () => setSocketConnected(true));
    Socket.on("typing", () => setIsTyping(true));
    Socket.on("stop typing", () => setIsTyping(false));

    const onMessageReceived = (newMessageRecieved) => {
      const rawChat = newMessageRecieved.chat;
      const incomingChatId = String(
        rawChat && typeof rawChat === "object" ? rawChat._id : rawChat
      );
      const openChatId = selectedChatCompare
        ? String(selectedChatCompare._id)
        : "";
      if (!selectedChatCompare || openChatId !== incomingChatId) {
        setNotification((prev) => {
          if (
            prev.some(
              (n) => String(n._id) === String(newMessageRecieved._id)
            )
          )
            return prev;
          return [newMessageRecieved, ...prev];
        });
        setFetchAgain((f) => !f);
      } else {
        setMessage((prev) => [...prev, newMessageRecieved]);
      }
    };

    Socket.on("message recieved", onMessageReceived);

    return () => {
      if (!Socket) return;
      Socket.off("message recieved", onMessageReceived);
      Socket.disconnect();
      Socket = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  useEffect(() => {
    fetchMessages();

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      if (!Socket) return;
      Socket.emit("stop typing", String(selectedChat._id));

      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        setNewMessage("");

        const { data } = await axios.post(
          `${API_URL}/api/message`,
          {
            content: newMessage,
            chatId: selectedChat._id,
          },
          config
        );
        // console.log(data);

        Socket.emit("new message", data);
        setMessage((prev) => [...prev, data]);
      } catch (error) {
        toast({
          title: "Error Occured!",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  const typeHandler = (e) => {
    setNewMessage(e.target.value);

    //Typing Indicator logic
    if (!socketConnected || !Socket) return;

    if (!typing) {
      setTyping(true);
      Socket.emit("typing", String(selectedChat._id));
    }
    let lastTypingTime = new Date().getTime();
    let timerLength = 3000;
    setTimeout(() => {
      let timeNow = new Date().getTime();
      let timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timerLength && typing) {
        Socket.emit("stop typing", String(selectedChat._id));
        setTyping(false);
      }
    }, timerLength);
  };
  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb="3"
            px="2"
            w="100%"
            fontFamily="Varela Round, sans-serif"
            display="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
            background="#282A3A"
            borderWidth="3px"
            borderColor="#393646"
            padding="3px"
            marginBottom="10px"
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
              color="white"
              bg="#2B4865"
              opacity="0.8"
            />
            {!selectedChat.isGroupChat ? (
              <>
                {getSender(user, selectedChat.users)}
                <ProfileModal user={getSenderFull(user, selectedChat.users)} />
              </>
            ) : (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessages={fetchMessages}
                />
              </>
            )}
          </Text>
          <Box
            className="wallpaper"
            display="flex"
            flexDirection="column"
            justifyContent="flex-end"
            p={3}
            width="100%"
            height="100%"
            borderRadius="lg"
            overflowY="hidden"
            borderWidth="1px"
          >
            {loading ? (
              <Spinner
                size="xl"
                width={20}
                height={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat message={message} />
              </div>
            )}
            <FormControl onKeyDown={sendMessage} isRequired mt={3}>
              {istyping ? (
                <div style={{ color: "white" }}>typing...</div>
              ) : (
                <></>
              )}

              <Input
                variant="filled"
                background="#282A3A"
                placeholder="Enter a message..."
                onChange={typeHandler}
                value={newMessage || ""}
                color="white"
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          height="100%"
        >
          <Text fontSize="3xl" pb={3} fontFamily="Varela Round, sans-serif">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
