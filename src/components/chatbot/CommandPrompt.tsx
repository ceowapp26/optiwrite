import React, { useEffect, useRef, useState } from 'react';
import { useZustandStore } from '@/stores/zustand/store';
import { useTranslation } from 'react-i18next';
import { matchSorter } from 'match-sorter';
import { Prompt } from '@/types/prompt';
import { useDisclosure } from "@nextui-org/react";
import { PromptLibraryButton, PromptLibraryModal } from './PromptLibraryMenu';
import { useHideOnOutsideClick } from '@/hooks/useHideonOutsideClick';
import { Search, Command } from 'lucide-react';

const CommandPrompt = ({
  setContent,
}: {
  setContent: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { t } = useTranslation();
  const prompts = useZustandStore((state) => state.prompts);
  const [_prompts, _setPrompts] = useState(prompts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const [dropDown, setDropDown, dropDownRef] = useHideOnOutsideClick();
  const onOpenChange = () => setIsModalOpen(prev => !prev);
  const onOpen = () => {
    setIsModalOpen(true);
    setDropDown(false);
  };
  const onClose = () => setIsModalOpen(false);

  useEffect(() => {
    if (dropDown && inputRef.current) {
      inputRef.current.focus();
    }
  }, [dropDown]);

  useEffect(() => {
    const filteredPrompts = matchSorter(useZustandStore.getState().prompts, input, {
      keys: ['name'],
    });
    _setPrompts(filteredPrompts);
  }, [input]);

  useEffect(() => {
    _setPrompts(prompts);
    setInput('');
  }, [prompts]);

  return (
    <div className='absolute right-2 -bottom-5' ref={dropDownRef}>
      <button
        className='p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200'
        aria-label='prompt library'
        onClick={() => setDropDown(!dropDown)}
      >
        <Command size={18} className="text-gray-600 dark:text-gray-300" />
      </button>
      {dropDown && (
        <div className='absolute top-full py-4 px-3 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[99999]'>
          <div className='px-4 py-3 bg-gray-100 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-sm font-medium text-gray-700'>{t('promptLibrary')}</h3>
          </div>
          <div className='p-2'>
            <div className='relative'>
              <input
                ref={inputRef}
                type='text'
                className='w-full px-3 py-2 pl-10 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent'
                value={input}
                placeholder={t('search')}
                onChange={(e) => setInput(e.target.value)}
              />
              <Search size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
            </div>
          </div>
          <ul className='max-h-60 overflow-y-auto'>
            {_prompts.map((cp) => (
              <li
                key={cp.id}
                className='px-4 py-2 mb-2 rounded-md bg-amber-200/50 hover:bg-amber-200/80 dark:hover:bg-amber-700 cursor-pointer transition-colors duration-150'
                onClick={() => {
                  setContent((prev) => prev + cp.prompt);
                  setDropDown(false);
                }}
              >
                <p className='text-sm text-gray-700 dark:text-gray-200'>{cp.name}</p>
              </li>
            ))}
          </ul>
          <PromptLibraryButton 
            onOpen={onOpen} 
          />
        </div>
      )}
      <PromptLibraryModal 
        isOpen={isModalOpen} 
        onOpenChange={onOpenChange} 
        onClose={onClose} 
      />
    </div>
  );
};

export default CommandPrompt;