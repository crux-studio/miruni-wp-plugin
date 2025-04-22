import { SystemStyleObject } from '@chakra-ui/react';

export const autocompleteDropdownStyles = {
  menu: (provided: SystemStyleObject) => ({
    ...provided,
    position: 'static',
  }),
  menuList: (provided: SystemStyleObject) => ({
    ...provided,
    borderRadius: '4px',
    position: 'absolute',
  }),
  control: (provided: SystemStyleObject) => ({
    ...provided,
    pt: '0px',
    borderRadius: '4px',
    mb: '8px',
  }),
  placeholder: (provided: SystemStyleObject) => ({
    ...provided,
    ml: '28px',
  }),
  inputContainer: (provided: SystemStyleObject) => ({
    ...provided,
    borderRadius: '4px',
    pl: '19px',
  }),
  singleValue: (provided: SystemStyleObject) => ({
    ...provided,
    overflow: 'hidden',
    width: '85%',
    pl: '19px',
  }),
};
