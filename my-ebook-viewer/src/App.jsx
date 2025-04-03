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
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [progress, setProgress] = useState(0); // 진행률 추가

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

        // 전체 페이지 생성
        await newBook.ready;
        await newBook.locations.generate(1024);

        if (viewerRef.current) {
          newRendition = newBook.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "always",
          });
          setRendition(newRendition);

          applyTheme(newRendition, isDarkMode);
          newRendition.display();

          // 페이지 이동 이벤트 리스너
          newRendition.on("relocated", (location) => {
            updatePageInfo(newRendition, newBook, location);
          });

          // 초기 페이지 정보 설정
          setTimeout(() => {
            const location = newRendition.currentLocation();
            updatePageInfo(newRendition, newBook, location);
          }, 1000);
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

  // 개선된 페이지 정보 업데이트 함수
  const updatePageInfo = (renditionInstance, bookInstance, location) => {
    if (
      !renditionInstance ||
      !bookInstance ||
      !bookInstance.locations ||
      !bookInstance.locations.total
    ) {
      return;
    }

    try {
      if (location && location.start) {
        const currentCfi = location.start.cfi;

        // EPUB 내의 위치 인덱스 (0부터 시작)
        const locationIndex =
          bookInstance.locations.locationFromCfi(currentCfi);

        // 사용자를 위한 페이지 번호 (1부터 시작)
        const displayPageNum = locationIndex + 1;

        // 전체 페이지 수
        const totalPageCount = bookInstance.locations.total;

        // 진행률 계산 (퍼센트)
        const progressPercentage = Math.round(
          (locationIndex / (totalPageCount - 1)) * 100
        );

        setCurrentPage(displayPageNum);
        setTotalPages(totalPageCount);
        setProgress(progressPercentage);
      }
    } catch (error) {
      console.error("페이지 정보 계산 오류:", error);
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
    setCurrentPage(0);
    setTotalPages(0);
    setProgress(0);
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

        <div className="page-info">
          {totalPages > 0 ? (
            <>
              <span className="page-numbers">
                {currentPage} / {totalPages}
              </span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-percent">{progress}%</span>
            </>
          ) : (
            <span>페이지 정보 로딩 중...</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
