import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const themes = {
  minimal: {
    primary: '#4B5563',
    background: 'bg-gray-50',
    gradient: 'from-gray-50 to-gray-100',
    accent: 'gray',
    text: 'text-gray-900',
    buttonBg: 'bg-gray-600 hover:bg-gray-700',
    cardBg: 'bg-white',
    borderColor: 'border-gray-200',
    headerBg: 'bg-gray-800',
    headerText: 'text-white',
    navBg: 'bg-gray-700',
    inputBg: 'bg-gray-50',
    inputBorder: 'border-gray-300',
    inputFocus: 'focus:ring-gray-500 focus:border-gray-500'
  },
  quantum: {
    primary: '#6366F1',
    background: 'bg-indigo-50',
    gradient: 'from-purple-50 via-indigo-100 to-purple-100',
    accent: 'indigo',
    text: 'text-indigo-900',
    buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
    cardBg: 'bg-white/80',
    borderColor: 'border-indigo-200',
    headerBg: 'bg-indigo-800',
    headerText: 'text-white',
    navBg: 'bg-indigo-700',
    inputBg: 'bg-indigo-50',
    inputBorder: 'border-indigo-300',
    inputFocus: 'focus:ring-indigo-500 focus:border-indigo-500'
  },
  warp: {
    primary: '#0EA5E9',
    background: 'bg-cyan-50',
    gradient: 'from-blue-50 via-cyan-100 to-blue-100',
    accent: 'cyan',
    text: 'text-cyan-900',
    buttonBg: 'bg-cyan-600 hover:bg-cyan-700',
    cardBg: 'bg-white/80',
    borderColor: 'border-cyan-200',
    headerBg: 'bg-cyan-800',
    headerText: 'text-white',
    navBg: 'bg-cyan-700',
    inputBg: 'bg-cyan-50',
    inputBorder: 'border-cyan-300',
    inputFocus: 'focus:ring-cyan-500 focus:border-cyan-500'
  },
  emoji: {
    primary: '#F59E0B',
    background: 'bg-amber-50',
    gradient: 'from-yellow-50 via-amber-100 to-yellow-100',
    accent: 'yellow',
    text: 'text-amber-900',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
    cardBg: 'bg-white/80',
    borderColor: 'border-amber-200',
    headerBg: 'bg-amber-800',
    headerText: 'text-white',
    navBg: 'bg-amber-700',
    inputBg: 'bg-amber-50',
    inputBorder: 'border-amber-300',
    inputFocus: 'focus:ring-amber-500 focus:border-amber-500'
  },
  confetti: {
    primary: '#EC4899',
    background: 'bg-pink-50',
    gradient: 'from-pink-50 via-rose-100 to-pink-100',
    accent: 'pink',
    text: 'text-pink-900',
    buttonBg: 'bg-pink-600 hover:bg-pink-700',
    cardBg: 'bg-white/80',
    borderColor: 'border-pink-200',
    headerBg: 'bg-pink-800',
    headerText: 'text-white',
    navBg: 'bg-pink-700',
    inputBg: 'bg-pink-50',
    inputBorder: 'border-pink-300',
    inputFocus: 'focus:ring-pink-500 focus:border-pink-500'
  },
  pattern: {
    primary: '#10B981',
    background: 'bg-emerald-50',
    gradient: 'from-teal-50 via-emerald-100 to-teal-100',
    accent: 'emerald',
    text: 'text-emerald-900',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
    cardBg: 'bg-white/80',
    borderColor: 'border-emerald-200',
    headerBg: 'bg-emerald-800',
    headerText: 'text-white',
    navBg: 'bg-emerald-700',
    inputBg: 'bg-emerald-50',
    inputBorder: 'border-emerald-300',
    inputFocus: 'focus:ring-emerald-500 focus:border-emerald-500'
  }
};

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('minimal');
  
  const value = {
    currentTheme,
    setCurrentTheme,
    themeColors: themes[currentTheme]
  };

  return (
    <ThemeContext.Provider value={value}>
      <div 
        className={`
          min-h-screen transition-all duration-500 ease-in-out
          bg-gradient-to-br ${themes[currentTheme].gradient}
          ${themes[currentTheme].text}
        `}
        style={{
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// Add this to your global CSS file (index.css)
const style = document.createElement('style');
style.textContent = `
  @keyframes gradient {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;
document.head.appendChild(style); 