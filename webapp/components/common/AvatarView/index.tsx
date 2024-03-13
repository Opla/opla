import { Avatar as AvatarContainer, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Avatar } from '@/types';

type AvatarViewProps = {
  avatar?: Avatar;
  icon?: React.ReactNode;
  className?: string;
};

function AvatarView({ avatar, icon, className }: AvatarViewProps) {
  return (
    <AvatarContainer className={className}>
      {avatar?.url && <AvatarImage src={avatar?.url} />}
      <AvatarFallback color={avatar?.color}>{icon || avatar?.name}</AvatarFallback>
    </AvatarContainer>
  );
}

export default AvatarView;
