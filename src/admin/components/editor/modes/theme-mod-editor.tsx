import { useState, useEffect, useCallback, useRef } from 'react';

import {
  Box,
  useColorModeValue,
  keyframes,
  Input,
  FormControl,
  FormLabel,
  Textarea,
} from '@chakra-ui/react';

import { SettingsIcon } from '@miruni/eds/src/icons';

import { Change } from '#/admin/types/suggestion';
import { logError } from '#/admin/utils/logging';

import { ModeViewHeader } from './mode-view-header';

type ValueType = 'string' | 'number' | 'json' | 'longtext';

// Helper function to detect value type
const getValueType = (value: string): ValueType => {
  // Check if it's a valid JSON object or array
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' || Array.isArray(parsed)) {
      return 'json';
    }
  } catch (e) {
    // Not JSON
  }

  // Check if it's a number
  if (!isNaN(Number(value)) && value.trim() !== '') {
    return 'number';
  }

  // Check if it's a long text
  if (value.length > 50) {
    return 'longtext';
  }

  // Default to string
  return 'string';
};

// Helper to format JSON for display
const formatJSON = (value: string): string => {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return value;
  }
};

// Component for rendering the appropriate input based on value type
const ValueInput = ({
  value,
  onChange,
  isReadOnly = false,
  bg,
  valueType,
  onKeyPress,
}: {
  value: string;
  onChange?: (val: string) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isReadOnly?: boolean;
  bg?: string;
  valueType: ValueType;
}) => {
  const inputProps = {
    value,
    onChange: onChange
      ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)
      : undefined,
    isReadOnly,
    bg,
    _focus: {
      borderColor: 'fuchsia.400',
      boxShadow: '0 0 0 1px var(--chakra-colors-fuchsia-400)',
    },
    fontSize: 'sm',
    _hover: isReadOnly ? { cursor: 'not-allowed' } : undefined,
  };

  if (valueType === 'json' || valueType === 'longtext') {
    return (
      <Textarea
        {...inputProps}
        rows={valueType === 'json' ? 8 : 4}
        fontFamily={valueType === 'json' ? 'mono' : 'body'}
        onKeyDown={onKeyPress}
      />
    );
  } else if (valueType === 'number') {
    return <Input {...inputProps} type="number" onKeyDown={onKeyPress} />;
  }

  return <Input {...inputProps} onKeyDown={onKeyPress} />;
};

interface ThemeModEditorProps {
  change: Change;
  updateSuggestion: (suggestionId: number, updatedContent: string) => Promise<void>;
}

export const ThemeModEditor = ({ change, updateSuggestion }: ThemeModEditorProps) => {
  // Use color mode values for better theming
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.100');
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const inputBg = useColorModeValue('white', 'gray.700');
  const readonlyBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('fuchsia.900', 'fuchsia.300');

  // Track content state
  const [value, setValue] = useState<string>(change.newContent || '');
  const [isModified, setIsModified] = useState<boolean>(false);
  const [valueType, setValueType] = useState<ValueType>('string');

  // Animation for the box shadow
  const glowAnimation = keyframes`
    0% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.6), 0 0 10px rgba(167, 139, 250, 0.4); }
    50% { box-shadow: 0 0 10px rgba(236, 72, 153, 0.8), 0 0 20px rgba(167, 139, 250, 0.6); }
    100% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.6), 0 0 10px rgba(167, 139, 250, 0.4); }
  `;

  useEffect(() => {
    // Format value based on type for better readability
    const content = change.newContent || '';
    const type = getValueType(content);
    setValueType(type);

    // Format JSON if needed
    setValue(type === 'json' ? formatJSON(content) : content);
    setIsModified(false);
  }, [change.newContent, change.suggestionId]);

  // Handle value changes
  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    setIsModified(newValue !== change.newContent);
  };

  // Save the content
  const handleSave = useCallback(
    async ({
      isModified,
      value,
      valueType,
      suggestionId,
      updateSuggestion,
    }: {
      isModified: boolean;
      value: string;
      valueType: ValueType;
      suggestionId: number;
      updateSuggestion: (suggestionId: number, updatedContent: string) => Promise<void>;
    }) => {
      if (!isModified) return;

      let finalValue = value;

      // For JSON, try to minify and validate before saving
      if (valueType === 'json') {
        try {
          const parsed = JSON.parse(value);
          finalValue = JSON.stringify(parsed);
        } catch (e) {
          // If JSON is invalid, use as-is
          logError(e as Error);
        }
      }

      try {
        await updateSuggestion(suggestionId || 0, finalValue);
        setIsModified(false);
      } catch (error) {
        logError(error as Error);
      }
    },
    [],
  );

  // Get the theme mod key (filename is the key)
  const themeModKey = change.fileIdentifier;
  const originalContent = change.originalContent || '';
  // Detect the type of the original content independently
  const originalValueType = getValueType(originalContent);

  // Reference to the container element to focus
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <Box
      ref={containerRef}
      tabIndex={-1} // Make element focusable without showing focus ring
      outline="none" // Remove outline when focused
      style={{ width: '100%', height: '100%' }}
    >
      <ModeViewHeader
        label="Theme Modification"
        saveDisabled={!isModified}
        textColor={textColor}
        icon={SettingsIcon}
        accentColor={accentColor}
        handleSave={() =>
          handleSave({
            isModified,
            value,
            valueType,
            suggestionId: change.suggestionId || 0,
            updateSuggestion,
          })
        }
      />

      {/* Theme mod editor with single key-value pair */}
      <Box flex="1" bg={bgColor} position="relative" px={5} py={6} overflowY="auto">
        <Box
          borderWidth="1px"
          borderColor="transparent"
          borderRadius="md"
          overflow="hidden"
          transition="all 0.2s"
          bg={inputBg}
          p={5}
          css={{
            animation: `${glowAnimation} 4s ease infinite`,
            '&::-webkit-scrollbar': {
              width: '8px',
              borderRadius: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
            },
          }}
        >
          <FormControl>
            <FormLabel fontSize="md" fontWeight="bold" color={accentColor}>
              {themeModKey}
            </FormLabel>

            <Box mt={4} mb={5}>
              <FormLabel fontSize="sm" color={labelColor}>
                New Value
              </FormLabel>
              <ValueInput
                value={value}
                onChange={handleValueChange}
                bg={inputBg}
                valueType={valueType}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey) && e.key === 's')) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSave({
                      isModified,
                      value,
                      valueType,
                      suggestionId: change.suggestionId || 0,
                      updateSuggestion,
                    }).catch(logError);
                  }
                }}
              />
            </Box>

            <Box mt={5}>
              <FormLabel fontSize="sm" color={labelColor}>
                Previous Value
              </FormLabel>
              <ValueInput
                value={originalValueType === 'json' ? formatJSON(originalContent) : originalContent}
                isReadOnly
                bg={readonlyBg}
                valueType={originalValueType}
              />
            </Box>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
};
