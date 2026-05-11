import { useEffect, useRef, useState } from "react";
import { Send, Search, Phone, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const Messages = ({ user }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const currentUserId = user?.id;

  console.log("USER:", user);
  console.log("CURRENT USER ID:", currentUserId);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // fetch all users
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const getUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId);

      console.log("USERS:", data);
      console.log("USERS ERROR:", error);

      if (!error && data) {
        setUsers(data);

        if (data.length > 0) {
          setSelectedUser(data[0]);
        }
      }

      setLoading(false);
    };

    getUsers();
  }, [currentUserId]);

  // fetch messages
  const fetchMessages = async () => {
    if (!selectedUser || !currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    console.log("MESSAGES:", data);
    console.log("MESSAGES ERROR:", error);

    if (!error && data) {
      setMessages(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    if (!selectedUser || !currentUserId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;

          if (
            (newMsg.sender_id === currentUserId &&
              newMsg.receiver_id === selectedUser.id) ||
            (newMsg.sender_id === selectedUser.id &&
              newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, currentUserId]);

  // send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: currentUserId,
        receiver_id: selectedUser.id,
        message: newMessage,
      },
    ]);

    console.log("SEND ERROR:", error);

    setNewMessage("");
  };

  return (
    <div className="h-screen bg-[#07120d] text-white flex overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-[320px] border-r border-white/10 bg-white/5 backdrop-blur-xl p-4 hidden md:flex flex-col">
        {/* SEARCH */}
        <div className="flex items-center bg-white/10 rounded-2xl px-4 py-3 mb-6">
          <Search size={18} className="text-gray-400" />

          <input
            type="text"
            placeholder="Search chats..."
            className="bg-transparent outline-none ml-3 w-full text-sm"
          />
        </div>

        {/* USERS */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                selectedUser?.id === user.id
                  ? "bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20"
                  : "bg-white/5 border-transparent hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 flex items-center justify-center font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border border-black"></div>
                </div>

                <div>
                  <h3 className="font-semibold">{user.name}</h3>

                  <p className="text-xs text-green-400">Online</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <div className="h-20 border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 flex items-center justify-between">
          {selectedUser && (
            <>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 flex items-center justify-center font-bold">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border border-black"></div>
                </div>

                <div>
                  <h2 className="font-semibold text-lg">
                    {selectedUser.name}
                  </h2>

                  <p className="text-sm text-green-400">Online</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition">
                  <Phone size={18} />
                </button>

                <button className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition">
                  <Video size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-14 w-52 rounded-2xl bg-white/10 animate-pulse"></div>
              <div className="h-14 w-72 rounded-2xl bg-white/10 animate-pulse ml-auto"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No messages yet
            </div>
          ) : (
            messages.map((msg) => {
              const isSender = msg.sender_id === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] px-5 py-3 rounded-3xl shadow-lg transition-all duration-300 ${
                      isSender
                        ? "bg-green-500 text-black rounded-br-md"
                        : "bg-white/10 backdrop-blur-lg rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>

                    <p
                      className={`text-[10px] mt-2 ${
                        isSender ? "text-black/60" : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {/* INPUT */}
        <div className="p-5 border-t border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-transparent outline-none text-sm px-2"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />

            <button
              onClick={sendMessage}
              className="bg-green-500 hover:bg-green-400 transition-all duration-300 p-3 rounded-xl shadow-lg shadow-green-500/30"
            >
              <Send size={18} className="text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;