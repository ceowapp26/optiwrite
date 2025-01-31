import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Avatar } from "@nextui-org/react";
import { IoLanguage } from 'react-icons/io5';
import { languageCodeToName, selectableLanguages } from '@/constants/language';

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  useEffect(() => {
    setSelectedLanguage(i18n.language);
  }, [i18n.language]);

  const handleSelectionChange = (lang) => {
    setSelectedLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button 
          variant="light"
          startContent={
            <Avatar
              icon={<IoLanguage />}
              size="sm"
              color="primary"
              isBordered
              className="mr-2 w-5 h-5"
            />
          }
          endContent={<span className="ml-2">▼</span>}
          className="min-w-[200px] p-2 justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {languageCodeToName[selectedLanguage] || selectedLanguage}
        </Button>
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="Language selection" 
        selectionMode="single" 
        selectedKeys={[selectedLanguage]} 
        onSelectionChange={(keys) => handleSelectionChange(keys.currentKey)}
        className="max-h-[300px] overflow-y-auto"
      >
        {selectableLanguages.map((lang) => (
          <DropdownItem key={lang} textValue={languageCodeToName[lang]}>
            <div className="flex h-full p-2 items-center">
              <Avatar
                icon={<IoLanguage />}
                size="sm"
                color={lang === selectedLanguage ? "primary" : "default"}
                isBordered={lang === selectedLanguage}
                className="mr-2 w-5 h-5"
              />
              <span>{languageCodeToName[lang]}</span>
            </div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default LanguageSelector;