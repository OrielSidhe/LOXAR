import { useState, useRef, Children, isValidElement, cloneElement, ReactNode, memo, ReactElement } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

interface DropdownProps {
  trigger: ReactNode;
  children?: ReactNode;
  menuClasses?: string;
}

interface HasOnClick {
  onClick?: (...args: any[]) => void;
}

const Dropdown = ({ trigger, children, menuClasses = '' }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const toggleOpen = () => setIsOpen(prev => !prev);

  const childrenWithProps = Children.map(children, child => {
    if (isValidElement<HasOnClick>(child) && typeof child.props.onClick === 'function') {
      const originalOnClick = child.props.onClick;
      return cloneElement(child, {
        onClick: (...args: any[]) => {
          originalOnClick(...args);
          setIsOpen(false); 
        } 
      });
    }
    return child;
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={toggleOpen} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-surface shadow-lg ring-1 ring-subtle focus:outline-none z-20 animate-fade-in-fast ${menuClasses}`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {childrenWithProps}
          </div>
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps {
    children?: ReactNode;
    onClick: () => void;
}

export const DropdownItem = memo(({ children, onClick }: DropdownItemProps) => (
    <button
        onClick={onClick}
        className="text-text-primary block w-full text-left px-4 py-2 text-sm hover:bg-subtle transition-colors"
        role="menuitem"
    >
        {children}
    </button>
));
DropdownItem.displayName = 'DropdownItem';


export default memo(Dropdown);