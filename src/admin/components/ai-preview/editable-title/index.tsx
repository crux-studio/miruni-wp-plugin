import { useEffect, useState } from 'react';

import { Textarea, Text } from '@chakra-ui/react';

export const EditableTitle = ({
  title,
  onUpdate,
  rows = 2,
}: {
  title: string;
  onUpdate: (newTitle: string) => void;
  rows?: number;
}) => {
  const [isEditable, setIsEditable] = useState(false);

  const [currentTitle, setCurrentTitle] = useState(title);
  const fontsize = currentTitle?.length && currentTitle?.length > 30 ? 'lg' : 'xl';

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentTitle(e.target.value.trim());
  };

  const handleClick = () => {
    setIsEditable(true);
  };

  const handleBlur = () => {
    setIsEditable(false);
    onUpdate(currentTitle);
  };
  if (!isEditable && currentTitle) {
    return (
      <Text fontWeight="400" fontSize={fontsize} onClick={handleClick} wordBreak="break-word">
        {currentTitle}
      </Text>
    );
  }

  return (
    <Textarea
      fontWeight="400"
      fontSize={fontsize}
      wordBreak="break-word"
      border="unset"
      w="100%"
      placeholder={'Add a summary to your story'}
      padding="0"
      resize="none"
      rows={rows}
      _focusVisible={{
        zIndex: 1,
        borderColor: 'fuchsia.900',
        boxShadow: '0 0 0 1px #c93df1',
      }}
      maxLength={999}
      value={currentTitle || ''}
      onChange={onChange}
      onBlur={handleBlur}
    />
  );
};
