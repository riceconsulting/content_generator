import React from 'react';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  return (
    <header className="bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-lg border-b border-border-light dark:border-border-dark sticky top-0 z-40 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo and Branding */}
          <div className="flex items-center">
              <a 
                href="https://riceai.net" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-shrink-0 flex items-center space-x-3 group"
              >
                <img 
                  src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AGB2yyJJKXfD527r/rice-ai-consulting-2-AoPWxvnWOju2GwOz.png" 
                  alt="RICE AI Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain transition-transform group-hover:scale-105" 
                />
                <div className="flex flex-col leading-tight">
                    <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                        RICE AI
                    </h1>
                    <p className="font-sans text-xs sm:text-sm text-accent-light dark:text-accent-dark tracking-wide opacity-90">
                        Content Generator
                    </p>
                </div>
              </a>
          </div>

          {/* Right side: Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;