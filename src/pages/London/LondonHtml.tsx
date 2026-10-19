import React from 'react';
import './LondonStyles.css'

const LondonHtml = () => {
  return (
    <div style={{height: '100%', position: 'relative', zIndex: 1}} className="page">
      <header className="header">
        <h1>Мой сайт</h1>
      </header>

      <main className="main">
        <h2>Добро пожаловать!</h2>
        <p>Это простая страница с тремя основными блоками: шапка, контент и подвал.</p>
        <p>Флексбокс на контейнере прижимает футер к низу экрана, даже если контента мало.</p>
      </main>

      <footer className="footer">
        &copy; 2026 Мой сайт. Все права защищены.
      </footer>
    </div>
  );
};

export default LondonHtml;
