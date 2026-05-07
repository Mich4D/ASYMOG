import { JitsiMeeting } from '@jitsi/react-sdk';
import { motion } from 'motion/react';
import { User } from '../App';
import { ArrowLeft } from 'lucide-react';

export default function MeetingRoom({ user, onBack }: { user: User, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-grow flex flex-col bg-gray-900"
    >
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-serif text-xl font-bold">ASSYMOG Global Fellowship Room</h2>
            <p className="text-xs text-gray-400">Moderated by ASSYMOG Council</p>
          </div>
        </div>
      </div>
      
      <div className="flex-grow">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName="ASSYMOG-Global-Ministers-Meeting-Room-8472"
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: true,
            prejoinConfig: {
              enabled: true
            },
            disableModeratorIndicator: true,
            enableEmailInStats: false
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }}
          userInfo={{
            displayName: user.fullName,
            email: user.email
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
      </div>
    </motion.div>
  );
}
