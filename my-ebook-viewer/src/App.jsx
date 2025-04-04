import React, { useState, useEffect, useRef } from "react";
import ePub from "epubjs";
import "./App.css";

function App() {
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [selectedBookPath, setSelectedBookPath] = useState(null);
  const viewerRef = useRef(null);
  const [fontSize, setFontSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentCfi, setCurrentCfi] = useState(null); // 현재 위치 CFI 저장

  // 페이지 계산을 위한 참조 값
  const pageCountRef = useRef(1);

  const availableBooks = [
    { title: "로미오와 줄리엣", path: "/books/romeo.epub" },
    { title: "모비 딕", path: "/books/moby-dick.epub" },
  ];

  // 책 로딩 효과
  useEffect(() => {
    if (!selectedBookPath) {
      return;
    }

    let newBook, newRendition;
    // 페이지 카운트 초기화
    pageCountRef.current = 1;
    setCurrentPage(1);

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

          // 저장된 위치가 있으면 해당 위치로, 없으면 처음부터 시작
          if (currentCfi) {
            newRendition.display(currentCfi);
          } else {
            newRendition.display();
          }

          // 전체 페이지 수 예상
          const estimatedTotalPages = Math.ceil(newBook.locations.total * 1.2);
          setTotalPages(estimatedTotalPages);

          // 페이지 이동 이벤트 리스너
          newRendition.on("relocated", (location) => {
            // 현재 CFI 저장
            if (location && location.start) {
              setCurrentCfi(location.start.cfi);
            }

            // 페이지 정보 업데이트
            setCurrentPage(pageCountRef.current);
            updatePageInfo(newRendition, newBook, location);
          });

          // 키보드 이벤트 리스너
          window.addEventListener("keydown", handleKeyDown);
        }
      } catch (error) {
        console.error("EPUB 로딩 오류:", error);
      }
    };

    loadBook();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (newRendition) {
        newRendition.destroy();
      }
      if (newBook) {
        newBook.destroy();
      }
    };
  }, [selectedBookPath]);

  // 키보드 이벤트 처리
  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      nextPage();
    } else if (e.key === "ArrowLeft") {
      prevPage();
    }
  };

  // 페이지 정보 업데이트 함수
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

        // 진행률 계산을 위한 위치 인덱스
        const locationIndex =
          bookInstance.locations.locationFromCfi(currentCfi);

        // 진행률 계산 (퍼센트)
        const progressPercentage = Math.round(
          (locationIndex / (bookInstance.locations.total - 1)) * 100
        );

        setProgress(progressPercentage);
      }
    } catch (error) {
      console.error("페이지 정보 계산 오류:", error);
    }
  };

  // 이전 페이지로 이동
  const prevPage = () => {
    if (rendition) {
      rendition.prev();
      pageCountRef.current = Math.max(pageCountRef.current - 1, 1);
      setCurrentPage(pageCountRef.current);
    }
  };

  // 다음 페이지로 이동
  const nextPage = () => {
    if (rendition) {
      rendition.next();
      pageCountRef.current = Math.min(pageCountRef.current + 1, totalPages);
      setCurrentPage(pageCountRef.current);
    }
  };

  const handleBookSelect = (path) => {
    setCurrentPage(0);
    setTotalPages(0);
    setProgress(0);
    setCurrentCfi(null); // 새 책을 선택하면 CFI 초기화
    pageCountRef.current = 1;
    setSelectedBookPath(path);
  };

  const handleFontSizeChange = (value) => {
    setFontSize(value);
    if (rendition) {
      rendition.themes.fontSize(`${value}%`);
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
