export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  isAnonymous: boolean;
  name?: string;
  image?: string;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
}
