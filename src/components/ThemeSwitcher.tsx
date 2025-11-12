import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Theme = 'brown' | 'dark' | 'blue' | 'purple' | 'green';

interface ThemeSwitcherProps {
  onThemeChange?: (theme: Theme) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ onThemeChange }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('brown');

  useEffect(() => {
    const savedTheme = localStorage.getItem('eth-explorer-theme') as Theme;
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eth-explorer-theme', theme);
    setCurrentTheme(theme);
    onThemeChange?.(theme);
  };

  const themes = [
    { id: 'brown' as Theme, name: 'Earth Brown', icon: '🌰', colors: 'bg-gradient-to-r from-amber-900 to-orange-900' },
    { id: 'dark' as Theme, name: 'Midnight Black', icon: '🌙', colors: 'bg-gradient-to-r from-gray-900 to-slate-900' },
    { id: 'blue' as Theme, name: 'Ocean Blue', icon: '🌊', colors: 'bg-gradient-to-r from-blue-900 to-cyan-900' },
    { id: 'purple' as Theme, name: 'Royal Purple', icon: '👑', colors: 'bg-gradient-to-r from-purple-900 to-pink-900' },
    { id: 'green' as Theme, name: 'Matrix Green', icon: '💚', colors: 'bg-gradient-to-r from-green-900 to-emerald-900' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="border-orange-500/40 bg-orange-600/20 hover:bg-orange-600/40 backdrop-blur-sm text-white"
          data-theme-button
          title="Change Theme"
        >
          <Palette className="h-5 w-5 text-orange-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur-xl border-white/20">
        <DropdownMenuLabel className="text-white">Choose Theme</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/20" />
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            className={`cursor-pointer hover:bg-white/10 ${
              currentTheme === theme.id ? 'bg-white/20' : ''
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              <span className="text-2xl">{theme.icon}</span>
              <div className="flex-1">
                <div className="text-white font-medium">{theme.name}</div>
                <div className={`h-2 rounded-full mt-1 ${theme.colors}`}></div>
              </div>
              {currentTheme === theme.id && (
                <span className="text-green-400">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
