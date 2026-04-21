import React, { useEffect, useState } from "react";
import { ChatState } from "../../Context/ProviderChat";
import { useToast, Text, Stack } from "@chakra-ui/react";
import { Box } from "@chakra-ui/layout";
import { Button } from "@chakra-ui/button";
import ChatLoading from "./ChatLoading";
import { getSender } from "../../config/ChatLogics";
import GroupChatModal from "./GroupChatModal";
import { AddIcon } from "@chakra-ui/icons";
import axios from "axios";
import { API_URL } from "../../config/api";

const MyChat = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();

  const toast = useToast();

  const fetchChats = async () => {
    // console.log(user._id);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(
        `${API_URL}/api/chat`,
        config
      );
      // console.log(data);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to load the chats",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);
  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      padding="3"
      backgroundColor="black"
      width={{ base: "100%", md: "31%" }}
      borderRadius="lg"
    >
      <Box
        paddingBottom="3"
        px="3"
        fontSize={{ base: "26px", md: "31px" }}
        fontFamily="Varela Round, sans-serif"
        display="flex"
        width="100%"
        justifyContent="space-between"
        alignItems="center"
        color="white"
        borderWidth="3px"
        bg="#282A3A"
        padding="3px"
        borderColor="#393646"
      >
        My Chats
        <GroupChatModal>
          <Button
            display="flex"
            fontSize={{ base: "17px", md: "10px", lg: "17px" }}
            rightIcon={<AddIcon />}
            color="white"
            bg="#2B4865"
            opacity="0.8"
          >
            New Group Chat
          </Button>
        </GroupChatModal>
      </Box>
      <Box
        display="flex"
        flexDir="column"
        p="3"
        backgroundColor="black"
        width="100%"
        height="100%"
        borderRadius="lg"
        overflow="hidden"
      >
        {chats ? (
          <Stack
            overflowY="scroll"
            color="#2B4865"
            borderWidth="1px"
            padding="10px"
          >
            {chats.map((chat) => (
              <Box
                onClick={() => setSelectedChat(chat)}
                cursor="pointer"
                backgroundColor={selectedChat === chat ? "#38B2AC" : "#282A3A"}
                color={selectedChat === chat ? "black" : "white"}
                px="3"
                py="3"
                borderRadius="lg"
                opacity="0.5"
                key={chat._id}
              >
                <Text>
                  {!chat.isGroupChat
                    ? getSender(loggedUser, chat.users)
                    : chat.chatName}
                </Text>
              </Box>
            ))}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChat;
