import { ChatChannel, ChatMessage } from '../types/crm';

export const initialChatChannels: ChatChannel[] = [
  {
    id: 'channel-general',
    type: 'GROUP',
    name: '📢 Général & Annonces',
    description: 'Canal général d\'échange pour l\'ensemble des collaborateurs du cabinet.',
    equipe: 'Direction Générale',
    participantIds: ['user-admin-tarik'],
    lastMessage: '',
    lastMessageTime: ''
  }
];

export const initialChatMessages: ChatMessage[] = [];

