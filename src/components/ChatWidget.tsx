import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { User } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
};

export default function ChatWidget({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // When the component mounts, connect to socket.io
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("chat message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: user.fullName,
      text: inputText,
    };

    socketRef.current.emit("chat message", newMsg);
    setInputText("");
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-primary-gold text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-black transition-all active:scale-95 z-40 ${isOpen ? "hidden" : "block"}`}
      >
        <MessageCircle size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[350px] shadow-2xl rounded-2xl overflow-hidden flex flex-col bg-white border border-gray-100 z-50 h-[500px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-primary-theme p-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <MessageCircle size={20} />
                <span className="font-bold">Ministers Fellowship Chat</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 text-sm mt-10">Welcome to the fellowship chat. Say peace!</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender === user.fullName;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && <span className="text-[10px] text-gray-500 font-bold ml-1 mb-1">{msg.sender}</span>}
                      <div 
                        className={`px-4 py-2 rounded-2xl max-w-[85%] ${isMe ? "bg-primary-gold text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"}`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Type a message..."
                className="flex-grow bg-gray-100 px-4 py-2 rounded-full text-sm outline-none focus:ring-1 focus:ring-primary-gold"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 bg-primary-gold text-white rounded-full disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
