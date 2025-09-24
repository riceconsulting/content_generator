import React, { ReactNode } from 'react';
import { DropdownOption } from '../types';

interface DropdownProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: DropdownOption[];
  icon: ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({ label, value, onChange, options, icon }) => {
  const selectId = `dropdown-${label.replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={selectId} className="flex items-center text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
        {icon}
        <span className="ml-2">{label}</span>
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          className="w-full appearance-none bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md py-2 pl-3 pr-10 text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent sm:text-sm transition"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary-light dark:text-text-secondary-dark">
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l3.47-3.47a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Dropdown;