import { Avatar as AvatarContainer, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Avatar, AvatarRef } from '@/types';

type AvatarViewProps = {
  avatar?: Partial<Avatar & AvatarRef>;
  icon?: React.ReactNode;
  className?: string;
};

function AvatarView({ avatar, icon, className }: AvatarViewProps) {
  return (
    <AvatarContainer className={className}>
      {avatar?.url && <AvatarImage src={avatar?.url} />}
      <AvatarFallback color={avatar?.color}>
        {avatar?.fallback || icon || avatar?.name}
      </AvatarFallback>
    </AvatarContainer>
  );
}

export default AvatarView;
