import React from 'react';
import { Flex, Text } from 'rebass';

import { colors } from '../theme';

import { MeshLogo } from './MeshLogo';

export const Navigation: React.FC = () => (
  <Flex py={3} bg={colors.black} alignItems="center">
    <MeshLogo />
    <Text ml={2} p={2} color={colors.whiteText} fontSize={32}>
      Ethereum Network Viz
    </Text>
  </Flex>
);
