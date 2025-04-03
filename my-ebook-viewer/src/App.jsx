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

  const availableBooks = [
    { title: "로미오와 줄리엣", path: "/books/romeo.epub" },
    { title: "모비 딕", path: "/books/moby-dick.epub" },
  ];

  useEffect(() => {
    console.log("selectedBookPath 변경:", selectedBookPath);

    if (!selectedBookPath) {
      return;
    }

    let newBook, newRendition;

    const loadBook = async () => {
      try {
        newBook = ePub(selectedBookPath);
        setBook(newBook);

        // 전체 페이지 생성 (중요: 책을 로드하기 전에 페이지 정보 초기화)
        await newBook.ready;
        await newBook.locations.generate(1024); // 더 정확한 페이지 계산을 위해 세그먼트 수 증가

        if (viewerRef.current) {
          newRendition = newBook.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "always",
          });
          setRendition(newRendition);

          // 테마 적용 및 초기 페이지 설정
          applyTheme(newRendition, isDarkMode);
          newRendition.display();

          // 페이지 정보 업데이트 이벤트 연결
          newRendition.on("relocated", (location) => {
            console.log("페이지 이동:", location);
            updatePageInfo(newRendition, newBook);
          });

          // 초기 페이지 정보 설정
          setTimeout(() => {
            updatePageInfo(newRendition, newBook);
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

  // 페이지 정보 업데이트 함수 개선
  const updatePageInfo = (renditionInstance, bookInstance) => {
    if (
      !renditionInstance ||
      !bookInstance ||
      !bookInstance.locations ||
      !bookInstance.locations.total
    ) {
      console.log("페이지 정보 업데이트 실패: 필요한 객체가 없음");
      return;
    }

    try {
      const currentLocation = renditionInstance.currentLocation();
      if (currentLocation && currentLocation.start) {
        const currentCfi = currentLocation.start.cfi;
        const currentPageNumber =
          bookInstance.locations.locationFromCfi(currentCfi);
        console.log(
          "현재 위치:",
          currentPageNumber,
          "전체:",
          bookInstance.locations.total
        );

        // 1부터 시작하는 페이지 번호로 표시
        setCurrentPage(currentPageNumber + 1);
        setTotalPages(bookInstance.locations.total);
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
    // 새 책을 선택할 때 페이지 정보 초기화
    setCurrentPage(0);
    setTotalPages(0);
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
            <span>
              {currentPage} / {totalPages} 페이지
            </span>
          ) : (
            <span>페이지 정보 로딩 중...</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
