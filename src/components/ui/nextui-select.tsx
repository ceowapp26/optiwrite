"use client";
import React from "react";
import { Select as NextSelect, SelectItem } from "@nextui-org/react";
import { motion } from "framer-motion";
import { ChevronDown } from "react-feather";

interface OptionInterface {
  key: string;
  value: string;
}

interface SelectComponentProps {
  options: OptionInterface[];
  label: string;
  selectedOption: string;
  defaultOption?: string;
  setSelectedOption: (value: string) => void;
  handleAsyncConfig?: () => void;
}

export const Select: React.FC<SelectComponentProps> = ({
  options,
  label,
  selectedOption,
  defaultOption,
  setSelectedOption,
  handleAsyncConfig
}) => {

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = Array.from(new Set([e.target.value]))[0];
    setSelectedOption(selectedValue);
    if (handleAsyncConfig) {
      handleAsyncConfig(selectedValue);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <NextSelect
        value={selectedOption}
        label={label}
        defaultSelectedKeys={[defaultOption]}
        selectionMode="single"
        placeholder="Select an option"
        onChange={handleSelectionChange}
        selectorIcon={<ChevronDown className="text-purple-500 transition-transform duration-300 group-data-[open=true]:rotate-180" />}
        classNames={{
          base: "w-full", 
          trigger: "min-w-[142px] max-w-[150px] group bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-2 border-purple-200 dark:border-purple-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600",
          label: "text-purple-600 dark:text-purple-300 font-semibold",
          value: "text-gray-800 dark:text-gray-100",
          listbox: "bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-purple-100 dark:border-purple-800",
          popoverContent: "border-0 w-[256px]",
          innerWrapper: "gap-3",
          mainWrapper: "p-1",
        }}
      >
        {options.map((option) => (
          <SelectItem 
            key={option.key} 
            value={option.key}
            className="text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors duration-150 rounded-md whitespace-nowrap"
          >
            {option.value}
          </SelectItem>
        ))}
      </NextSelect>
    </motion.div>
  );
};



