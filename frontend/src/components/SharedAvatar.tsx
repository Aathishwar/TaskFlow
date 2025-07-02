import React from 'react';
import { Box, Avatar, Text, HStack } from '@chakra-ui/react';

interface SharedAvatarProps {
    users: { name: string; avatarUrl: string }[];
    onAvatarClick: () => void;
}

const SharedAvatar: React.FC<SharedAvatarProps> = ({ users, onAvatarClick }) => {
    return (
        <Box display="flex" alignItems="center" cursor="pointer" onClick={onAvatarClick}>
            {users.length === 1 && (
                <HStack spacing={1} align="center">
                    <Avatar
                        name={users[0].name}
                        src={users[0].avatarUrl}
                        boxSize="24px"
                    />
                    <Text marginLeft="5px">{users[0].name}</Text>
                </HStack>
            )}
            {users.length === 2 && (
                <Box display="flex" alignItems="center" position="relative">
                    <Avatar
                        name={users[0].name}
                        src={users[0].avatarUrl}
                        boxSize="24px"
                        position="relative"
                        zIndex={2}
                    />
                    <Avatar
                        name={users[1].name}
                        src={users[1].avatarUrl}
                        boxSize="24px"
                        position="relative"
                        zIndex={1}
                        marginLeft="-11px" // Adjusted marginLeft specifically for 2 users
                        // Removed marginTop to align vertically
                    />
                </Box>
            )}
            {users.length > 2 && (
                <Box display="flex" alignItems="center" position="relative">
                    <Avatar
                        name={users[0].name}
                        src={users[0].avatarUrl}
                        boxSize="24px"
                        position="relative"
                        zIndex={2}
                    />
                    <Avatar
                        name={users[1].name}
                        src={users[1].avatarUrl}
                        boxSize="24px"
                        position="relative"
                        zIndex={1}
                        marginLeft="-11px" // Keep this value for > 2 users
                        // Removed marginTop to align vertically
                    />
                    <Text marginLeft="5px" fontSize="0.8rem" color="#666">
                        +{users.length - 2} more
                    </Text>
                </Box>
            )}
        </Box>
    );
};

export default SharedAvatar;
