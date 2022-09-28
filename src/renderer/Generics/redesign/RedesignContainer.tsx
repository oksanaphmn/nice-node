import React, { useState } from 'react';
import { darkTheme, lightTheme } from './theme.css';

const RedesignContainerStoryBook: React.FC = ({ children }) => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
      <p>Toggle dark mode</p>
      <button
        style={{ width: 150 }}
        type="button"
        onClick={() => setIsDarkTheme((currentValue: boolean) => !currentValue)}
      >
        Switch to {isDarkTheme ? 'light' : 'dark'} theme
      </button>
      <div
        id="onBoarding"
        className={isDarkTheme ? darkTheme : lightTheme}
        style={{
          marginTop: '1em',
          border: '1px dashed #E3E3E3',
          flexGrow: 1,
          /**
           * Then, because flex items cannot be smaller than the
           * size of their content – min-height: auto is the
           * default – add min-height: 0 to allow the item to
           * shrink to fit inside the container.
           * https://stackoverflow.com/questions/41674979/flex-child-is-growing-out-of-parent
           */
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};
export default RedesignContainerStoryBook;
