import React, { useState, useEffect, useRef } from "react";
import ePub from "epubjs";
import "./App.css";

function App() {
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [selectedBookPath, setSelectedBookPath] = useState(null);
  const viewerRef = useRef(null);
  const [fontSize, setFontSize] = useState(100); // 글자 크기 상태
  const [isDarkMode, setIsDarkMode] = useState(false); // 다크 모드 상태

  const availableBooks = [
    { title: "로미오와 줄리엣", path: "/books/romeo.epub" },
    { title: "모비 딕", path: "/books/moby-dick.epub" },
  ];

  useEffect(() => {
    if (!selectedBookPath) {
      return;
    }

    let newBook, newRendition;

    const loadBook = async () => {
      try {
        newBook = ePub(selectedBookPath);
        setBook(newBook);

        if (viewerRef.current) {
          newRendition = await newBook.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
          });
          setRendition(newRendition);
          await newRendition.display();

          // 다크 모드 초기 설정
          applyTheme(newRendition, isDarkMode);
        }
      } catch (error) {
        console.error("EPUB 로딩 오류:", error);
      }
    };

    loadBook();

    return () => {
      if (newRendition) {
        newRendition.destroy();
      }
      if (newBook) {
        newBook.destroy();
      }
    };
  }, [selectedBookPath, isDarkMode]); // fontSize 제거

  // 테마 적용 함수
  const applyTheme = (renditionInstance, darkMode) => {
    if (renditionInstance) {
      if (darkMode) {
        renditionInstance.themes.override({
          body: {
            "background-color": "#333",
            color: "#eee",
          },
        });
      } else {
        renditionInstance.themes.override({
          body: {
            "background-color": "white",
            color: "black",
          },
        });
      }
      renditionInstance.themes.fontSize(`${fontSize}%`); // 초기 글자 크기 설정
    }
  };

  const prevPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  const nextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };

  const handleBookSelect = (path) => {
    setSelectedBookPath(path);
  };

  const handleFontSizeChange = (value) => {
    setFontSize(value);
    if (rendition) {
      rendition.themes.fontSize(`${value}%`); // 현재 페이지에서 글자 크기 변경
    }
  };

  const handleDarkModeToggle = () => {
    setIsDarkMode((prevMode) => !prevMode);
    if (rendition) {
      applyTheme(rendition, !isDarkMode); // 현재 페이지에서 다크 모드 변경
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <div className="App">
      <h1>EPUB 뷰어</h1>

      <div className="book-selector">
        <h2>읽을 책을 선택하세요:</h2>
        {availableBooks.map((bookInfo) => (
          <button
            key={bookInfo.path}
            onClick={() => handleBookSelect(bookInfo.path)}
            disabled={selectedBookPath === bookInfo.path}
          >
            {bookInfo.title}
          </button>
        ))}
      </div>

      <div className="viewer-container">
        {selectedBookPath ? (
          <div ref={viewerRef} className="epub-viewer"></div>
        ) : (
          <p>위 목록에서 책을 선택하여 읽기를 시작하세요.</p>
        )}
      </div>

      {selectedBookPath && (
        <div className="controls">
          <button onClick={prevPage}>이전 페이지</button>
          <button onClick={nextPage}>다음 페이지</button>
          <button onClick={() => handleFontSizeChange(fontSize - 10)}>
            글자 작게
          </button>
          <button onClick={() => handleFontSizeChange(fontSize + 10)}>
            글자 크게
          </button>
          <button onClick={handleDarkModeToggle}>
            {isDarkMode ? "라이트 모드" : "다크 모드"}
          </button>
          <button onClick={toggleFullscreen}>전체 화면</button>
        </div>
      )}
    </div>
  );
}

export default App;
