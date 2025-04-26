import { AIProvider } from '../../blocksuite/ai/provider';
import { IconButton } from '@affine/component';
import { AiIcon } from '@blocksuite/icons/rc';
import { Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useCallback, useEffect, useState } from 'react';
import { useEnableAI } from '../hooks/affine/use-enable-ai';

const StyledButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

interface AIToolbarButtonProps {
  host?: any; // The editor host
  doc?: any; // The current document
}

export const AIToolbarButton = ({ host, doc }: AIToolbarButtonProps) => {
  const [enabled, setEnabled] = useState(false);
  const enableAI = useEnableAI();

  useEffect(() => {
    if (!AIProvider.capabilities) {
      setEnabled(false);
      return;
    }
    
    setEnabled(enableAI && AIProvider.capabilities.chat);
  }, [enableAI]);

  const handleClick = useCallback(() => {
    if (!host || !enabled) return;
    
    // Trigger opening the AI chat panel
    AIProvider.slots.requestOpenWithChat.emit({ host });
    
    // Track the event
    try {
      window.track?.ai?.toolbar?.openChat();
    } catch (e) {
      console.error('Failed to track AI chat open event', e);
    }
  }, [host, enabled]);

  if (!enabled) return null;

  return (
    <Tooltip title="Ask AI Assistant" placement="top">
      <StyledButton onClick={handleClick} data-testid="ai-toolbar-button">
        <AiIcon />
      </StyledButton>
    </Tooltip>
  );
};