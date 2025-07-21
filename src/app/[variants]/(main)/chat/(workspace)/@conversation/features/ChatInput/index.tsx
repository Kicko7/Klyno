import DesktopChatInput from './Desktop';
import MobileChatInput from './Mobile';

interface ChatInputProps {
  mobile: boolean;
  onSend?: () => void;
}

const ChatInput = ({ mobile, onSend }: ChatInputProps) => {
  const Input = mobile ? MobileChatInput : DesktopChatInput;

  return <Input onSend={onSend} />;
};

export default ChatInput;
