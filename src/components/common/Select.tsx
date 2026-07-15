/*
 * Copyright (C) 2026 Yukthi Systems Private Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

// import React, { useMemo, type ReactNode } from 'react';
// import Select, { components } from 'react-select';
// import type {
//   MultiValue,
//   SingleValue,
//   StylesConfig,
//   GroupBase,
//   OptionProps,
//   MultiValueProps,
//   MultiValueRemoveProps,
//   DropdownIndicatorProps,
// } from 'react-select';
// import { FaChevronDown, FaCheck, FaX } from 'react-icons/fa6';
// import { FaSearch, FaTimes } from 'react-icons/fa';

// export interface DropdownOption {
//   value: string;
//   label: string;
//   icon?: ReactNode;
//   disabled?: boolean;
//   description?: string;
// }

// interface CustomSelectProps {
//   options: DropdownOption[];
//   value?: string | string[];
//   onChange: (value: string | string[]) => void;
//   placeholder?: string;
//   label?: string;
//   multiSelect?: boolean;
//   searchable?: boolean;
//   disabled?: boolean;
//   clearable?: boolean;
//   width?: string;
//   className?: string;
//   menuPortalTarget?: any;
// }

// interface SelectOption {
//   value: string;
//   label: string;
//   icon?: ReactNode;
//   description?: string;
//   isDisabled?: boolean;
// }

// const CustomSelect = ({
//   options,
//   value,
//   onChange,
//   placeholder = 'Select option...',
//   label,
//   multiSelect = false,
//   searchable = true,
//   disabled = false,
//   clearable = false,
//   width = '100%',
//   className = '',
//   menuPortalTarget,
// }: CustomSelectProps) => {
//   // Convert options to react-select format
//   const selectOptions = useMemo(
//     () =>
//       options.map((option) => ({
//         value: option.value,
//         label: option.label,
//         icon: option.icon,
//         description: option.description,
//         isDisabled: option.disabled,
//       })),
//     [options]
//   );

//   // Convert value to react-select format
//   const selectValue = useMemo(() => {
//     if (multiSelect) {
//       if (!Array.isArray(value)) return [];
//       return value.map((val) => selectOptions.find((opt) => opt.value === val)).filter(Boolean);
//     } else {
//       return selectOptions.find((opt) => opt.value === value) || null;
//     }
//   }, [value, selectOptions, multiSelect]);

//   // Handle value changes
//   const handleChange = (newValue: MultiValue<SelectOption> | SingleValue<SelectOption>) => {
//     if (multiSelect) {
//       const values = (newValue as MultiValue<SelectOption>).map((item) => item.value);
//       onChange(values);
//     } else {
//       onChange((newValue as SingleValue<SelectOption>)?.value || '');
//     }
//   };

//   // Enhanced custom styles with modal compatibility
//   const customStyles: StylesConfig<SelectOption, boolean, GroupBase<SelectOption>> = {
//     control: (provided, state: any) => ({
//       ...provided,
//       minHeight: '44px',
//       border: '1px solid var(--gray-6)',
//       borderRadius: '8px',
//       backgroundColor: 'var(--gray-1)',
//       boxShadow: state.isFocused
//         ? '0 0 0 2px var(--accent-8), 0 4px 12px rgba(0,0,0,0.08)'
//         : state.isHovered
//           ? '0 2px 8px rgba(0,0,0,0.06)'
//           : 'none',
//       borderColor: state.isFocused
//         ? 'var(--accent-8)'
//         : state.menuIsOpen
//           ? 'var(--accent-7)'
//           : state.isHovered
//             ? 'var(--gray-7)'
//             : 'var(--gray-6)',
//       transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
//       cursor: disabled ? 'not-allowed' : 'pointer',
//       opacity: disabled ? 0.6 : 1,
//       position: 'relative',
//       zIndex: 1,
//       '&:hover': {
//         borderColor: disabled ? 'var(--gray-6)' : 'var(--gray-7)',
//         transform: disabled ? 'none' : 'translateY(-1px)',
//       },
//     }),
//     menu: (provided) => ({
//       ...provided,
//       backgroundColor: 'var(--gray-1)',
//       border: '1px solid var(--gray-6)',
//       borderRadius: '12px',
//       boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.08)',
//       zIndex: 999999,
//       backdropFilter: 'blur(12px)',
//       overflow: 'hidden',
//       position: 'relative',
//     }),
//     menuPortal: (provided) => ({
//       ...provided,
//       zIndex: 999999,
//       position: 'fixed',
//     }),
//     menuList: (provided) => ({
//       ...provided,
//       padding: '4px',
//       maxHeight: '300px',
//       overflowY: 'auto',
//       '::-webkit-scrollbar': {
//         width: '6px',
//       },
//       '::-webkit-scrollbar-track': {
//         backgroundColor: 'var(--gray-3)',
//         borderRadius: '3px',
//       },
//       '::-webkit-scrollbar-thumb': {
//         backgroundColor: 'var(--gray-7)',
//         borderRadius: '3px',
//         '&:hover': {
//           backgroundColor: 'var(--gray-8)',
//         },
//       },
//     }),
//     option: () => ({
//       // Custom component handles all styling
//     }),
//     multiValue: (provided) => ({
//       backgroundColor: 'var(--accent-4)',
//       color: 'var(--accent-12)',
//       border: '1px solid var(--accent-7)',
//       borderRadius: '8px',
//       margin: '2px',
//       padding: '0',
//       fontSize: '12px',
//       fontWeight: '500',
//       boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
//       transition: 'all 0.2s ease',
//       '&:hover': {
//         backgroundColor: 'var(--accent-5)',
//         boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
//       },
//     }),
//     multiValueLabel: (provided) => ({
//       ...provided,
//       color: 'var(--accent-12)',
//       padding: '6px 8px',
//       fontWeight: '500',
//       fontSize: '12px',
//     }),
//     multiValueRemove: (provided) => ({
//       ...provided,
//       color: 'var(--accent-11)',
//       padding: '4px',
//       borderRadius: '0 6px 6px 0',
//       transition: 'all 0.15s ease',
//       '&:hover': {
//         backgroundColor: 'var(--accent-6)',
//         color: 'var(--accent-12)',
//       },
//     }),
//     placeholder: (provided) => ({
//       ...provided,
//       color: 'var(--gray-9)',
//       fontSize: '14px',
//       fontWeight: '400',
//     }),
//     singleValue: (provided) => ({
//       ...provided,
//       color: 'var(--gray-12)',
//       fontSize: '14px',
//       fontWeight: '500',
//     }),
//     input: (provided) => ({
//       ...provided,
//       color: 'var(--gray-12)',
//       fontSize: '14px',
//       caretColor: 'var(--accent-8)',
//     }),
//     dropdownIndicator: () => ({
//       // Custom component
//     }),
//     clearIndicator: () => ({
//       // Custom component
//     }),
//     indicatorSeparator: () => ({
//       display: 'none',
//     }),
//     valueContainer: (provided) => ({
//       ...provided,
//       padding: '4px 12px',
//       gap: '4px',
//     }),
//     loadingIndicator: (provided) => ({
//       ...provided,
//       color: 'var(--accent-8)',
//     }),
//   };

//   // Enhanced Custom Option component with better event handling
//   const CustomOption = (props: OptionProps<SelectOption, boolean, GroupBase<SelectOption>>) => {
//     const { data, isSelected, isFocused, innerRef, innerProps } = props;

//     return (
//       <div
//         ref={innerRef}
//         {...innerProps}
//         onMouseDown={(e) => {
//           // Prevent default to avoid conflicts with modal event handling
//           e.preventDefault();
//         }}
//         onClick={(e) => {
//           // Ensure click events are properly handled
//           e.stopPropagation();
//           if (!props.isDisabled && innerProps.onClick) {
//             innerProps.onClick(e);
//           }
//         }}
//         className={`
//           relative px-4 py-3 cursor-pointer transition-all duration-200 ease-out rounded-md mx-1 my-0.5
//           ${
//             props.isDisabled
//               ? 'opacity-50 cursor-not-allowed text-[var(--gray-8)] bg-[var(--gray-2)]'
//               : 'text-[var(--gray-12)]'
//           }
//           ${
//             isSelected
//               ? 'bg-[var(--accent-5)] text-[var(--accent-12)] shadow-md  transform scale-[1.02]'
//               : isFocused && !props.isDisabled
//                 ? 'bg-[var(--gray-3)] shadow-sm transform translateY-[-1px]'
//                 : !props.isDisabled
//                   ? 'hover:bg-[var(--gray-2)] hover:shadow-sm hover:transform hover:translateY-[-1px]'
//                   : ''
//           }
//         `}
//       >
//         <div className="flex items-start gap-3 w-full">
//           {data.icon && (
//             <div
//               className={`flex-shrink-0 w-4 h-4 flex items-center justify-center mt-0.5 transition-colors duration-200 ${
//                 isSelected ? 'text-[var(--accent-11)]' : 'text-[var(--gray-10)]'
//               }`}
//             >
//               {data.icon}
//             </div>
//           )}
//           <div className="flex-1 min-w-0">
//             <div
//               className={`text-sm font-medium truncate transition-colors duration-200 ${
//                 isSelected ? 'text-[var(--accent-12)]' : 'text-[var(--gray-12)]'
//               }`}
//             >
//               {data.label}
//             </div>
//             {data.description && (
//               <div
//                 className={`text-xs truncate mt-1 transition-colors duration-200 ${
//                   isSelected ? 'text-[var(--accent-11)]' : 'text-[var(--gray-10)]'
//                 }`}
//               >
//                 {data.description}
//               </div>
//             )}
//           </div>
//           {isSelected && (
//             <div className="flex-shrink-0 flex items-center">
//               <div className="w-5 h-5 rounded-full bg-[var(--accent-8)] flex items-center justify-center">
//                 <FaCheck className="w-3 h-3 text-white" />
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // Custom MultiValue component with icon support
//   const CustomMultiValue = (
//     props: MultiValueProps<SelectOption, boolean, GroupBase<SelectOption>>
//   ) => {
//     const { data } = props;

//     return (
//       <components.MultiValue {...props}>
//         <div className="flex items-center gap-1.5">
//           {data.icon && (
//             <span className="w-3 h-3 flex-shrink-0 text-[var(--accent-11)]">{data.icon}</span>
//           )}
//           <components.MultiValueLabel {...props} />
//         </div>
//       </components.MultiValue>
//     );
//   };

//   // Custom MultiValueRemove component
//   const CustomMultiValueRemove = (
//     props: MultiValueRemoveProps<SelectOption, boolean, GroupBase<SelectOption>>
//   ) => (
//     <components.MultiValueRemove {...props}>
//       <FaX className="w-2.5 h-2.5" />
//     </components.MultiValueRemove>
//   );

//   // Custom DropdownIndicator with rotation
//   const CustomDropdownIndicator = (
//     props: DropdownIndicatorProps<SelectOption, boolean, GroupBase<SelectOption>>
//   ) => (
//     <div className="px-3 text-[var(--gray-10)] hover:text-[var(--gray-12)] transition-all duration-200">
//       <FaChevronDown
//         className={`w-3.5 h-3.5 transition-transform duration-200 ${
//           props.selectProps.menuIsOpen ? 'rotate-180' : 'rotate-0'
//         }`}
//       />
//     </div>
//   );

//   // Custom ClearIndicator
//   const CustomClearIndicator = (props: any) => (
//     <div
//       {...props.innerProps}
//       className="px-2 text-[var(--gray-10)] hover:text-[var(--red-9)] cursor-pointer transition-all duration-200 hover:bg-[var(--red-2)] rounded-md p-1 mr-1"
//     >
//       <FaTimes className="w-3 h-3" />
//     </div>
//   );

//   // Custom NoOptionsMessage
//   const CustomNoOptionsMessage = (props: any) => (
//     <div className="px-6 py-12 text-sm text-center text-[var(--gray-10)]">
//       <div className="flex flex-col items-center gap-3">
//         <div className="w-12 h-12 rounded-full bg-[var(--gray-3)] flex items-center justify-center">
//           <FaSearch className="w-5 h-5 text-[var(--gray-8)]" />
//         </div>
//         <div>
//           <div className="font-medium text-[var(--gray-11)] mb-1">No options found</div>
//           <div className="text-xs text-[var(--gray-9)]">Try adjusting your search terms</div>
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <div className={`${className}`} style={{ width }}>
//       {label && (
//         <label className="block text-sm font-medium mb-2 text-[var(--gray-12)]">{label}</label>
//       )}

//       <Select<SelectOption, boolean, GroupBase<SelectOption>>
//         options={selectOptions}
//         value={selectValue as any}
//         onChange={handleChange}
//         isMulti={multiSelect}
//         isSearchable={searchable}
//         isClearable={clearable}
//         isDisabled={disabled}
//         placeholder={placeholder}
//         styles={customStyles}
//         components={{
//           Option: CustomOption,
//           MultiValue: CustomMultiValue,
//           MultiValueRemove: CustomMultiValueRemove,
//           DropdownIndicator: CustomDropdownIndicator,
//           ClearIndicator: clearable ? CustomClearIndicator : undefined,
//           NoOptionsMessage: CustomNoOptionsMessage,
//           IndicatorSeparator: null,
//         }}
//         menuPortalTarget={menuPortalTarget || document.body}
//         menuPosition="fixed"
//         menuShouldBlockScroll={false}
//         menuShouldScrollIntoView={false}
//         captureMenuScroll={false}
//         closeMenuOnSelect={!multiSelect}
//         hideSelectedOptions={false}
//         blurInputOnSelect={!multiSelect}
//         backspaceRemovesValue={multiSelect}
//         escapeClearsValue={!multiSelect}
//         tabSelectsValue={false}
//         openMenuOnFocus={false}
//         onMenuOpen={() => {
//           if (menuPortalTarget) {
//             document.body.style.overflow = 'hidden';
//           }
//         }}
//         onMenuClose={() => {
//           if (menuPortalTarget) {
//             document.body.style.overflow = 'unset';
//           }
//         }}
//         filterOption={(option, inputValue) => {
//           if (!inputValue) return true;
//           const searchText = inputValue.toLowerCase();
//           return (
//             option.label.toLowerCase().includes(searchText) ||
//             !!(
//               option.data.description && option.data.description.toLowerCase().includes(searchText)
//             )
//           );
//         }}
//       />
//     </div>
//   );
// };

// export default CustomSelect;
