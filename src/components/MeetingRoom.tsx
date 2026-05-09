import { JitsiMeeting } from '@jitsi/react-sdk';
import { motion } from 'motion/react';
import { User } from '../App';
import { ArrowLeft, Settings, Camera } from 'lucide-react';
import { useRef } from 'react';

export default function MeetingRoom({ user, onBack }: { user: User, onBack: () => void }) {
  const apiRef = useRef<any>(null);

  const handleOpenSettings = () => {
    if (apiRef.current) {
      // Execute command to open device settings
      apiRef.current.executeCommand('toggleSettings');
    }
  };

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
            <h2 className="font-serif text-xl font-bold">ASYMOG Global Fellowship Room</h2>
            <p className="text-xs text-gray-400">Moderated by ASYMOG Council</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleOpenSettings}
            className="px-4 py-2 bg-primary-theme hover:bg-black text-white text-sm font-bold rounded-lg transition-colors flex items-center space-x-2 shadow-lg"
            title="Setup Camera & Change Audio/Video Sources"
          >
            <Camera size={16} />
            <span>Camera & Sources Setup</span>
          </button>
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
            disableModeratorIndicator: false,
            enableEmailInStats: false,
            toolbarButtons: [
              'camera', 'chat', 'desktop', 'download', 'fullscreen', 'hangup', 'highlight', 'microphone', 'mute-everyone', 'mute-video-everyone', 'participants-pane', 'profile', 'raisehand', 'select-background', 'settings', 'shareaudio', 'sharevideo', 'stats', 'tileview', 'toggle-camera', 'videoquality'
            ]
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false
          }}
          userInfo={{
            displayName: user.fullName,
            email: user.email
          }}
          onApiReady={(externalApi) => {
            apiRef.current = externalApi;
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
            // Added explicit allow attributes for iframe 
            iframeRef.allow = "camera; microphone; display-capture; autoplay; clipboard-write";
          }}
        />
      </div>
    </motion.div>
  );
}
