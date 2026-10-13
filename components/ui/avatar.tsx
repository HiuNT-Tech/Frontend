import { Avatar as AntAvatar, AvatarProps } from 'antd';
import React from 'react';

const Avatar: React.FC<AvatarProps> = props => {
  return <AntAvatar {...props} />;
};

export { Avatar };
