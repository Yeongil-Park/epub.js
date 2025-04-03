import React, { useState, useEffect, useRef } from "react";
import ePub from "epubjs";
import "./App.css";

function App() {
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [selectedBookPath, setSelectedBookPath] = useState(null);
  const viewerRef = useRef(null);
  const [fontSize, setFontSize] = useState(100);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  const [totalPages, setTotalPages] = useState(null);

  const availableBooks = [
    { title: "로미오와 줄리엣", path: "/books/romeo.epub" },
    { title: "모비 딕", path: "/books/moby-dick.epub" },
  ];

  useEffect(() => {
    console.log("selectedBookPath 변경:", selectedBookPath); // 추가

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
            spread: "always", // 추가
          });
          setRendition(newRendition);
          await newRendition.display();

          console.log("EPUB 렌더링 성공:", newRendition); // 추가

          updatePageInfo(newRendition);
          applyTheme(newRendition, isDarkMode);

          newRendition.on("rendered", () => updatePageInfo(newRendition));
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
  }, [selectedBookPath, isDarkMode]);

  const updatePageInfo = (renditionInstance) => {
    if (renditionInstance && book) {
      const currentLocation = renditionInstance.currentLocation();
      if (currentLocation && currentLocation.displayed) {
        setCurrentPage(currentLocation.displayed.page);
        setTotalPages(book.locations.total);
      }
    }
  };

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
      renditionInstance.themes.fontSize(`${fontSize}%`);
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
      rendition.themes.fontSize(`${value}%`);
    }
  };

  const handleDarkModeToggle = () => {
    setIsDarkMode((prevMode) => !prevMode);
    if (rendition) {
      applyTheme(rendition, !isDarkMode);
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
        <p className="page-info">
          {currentPage !== null ? currentPage : "-"} /{" "}
          {totalPages !== null ? totalPages : "-"}
        </p>
      </div>
    </div>
  );
}

export default App;
