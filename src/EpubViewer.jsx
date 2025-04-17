import React, { useState, useEffect, useRef } from "react";
import ePub from "epubjs";

function EpubViewer({ selectedBookPath }) {
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const viewerRef = useRef(null);
  const [fontSize, setFontSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentCfi, setCurrentCfi] = useState(null);
  const [toc, setToc] = useState([]);
  const [showToc, setShowToc] = useState(false);

  // 페이지 계산을 위한 참조 값
  const pageCountRef = useRef(1);

  // 책 변경 시 상태 리셋
  useEffect(() => {
    if (selectedBookPath) {
      // 상태 초기화
      setCurrentPage(1);
      setTotalPages(0);
      setProgress(0);
      setCurrentCfi(null);
      setToc([]);
      pageCountRef.current = 1;
    }
  }, [selectedBookPath]);

  // 책 로딩 효과
  useEffect(() => {
    if (!selectedBookPath) {
      return;
    }

    let newBook, newRendition;

    const loadBook = async () => {
      try {
        // 이전 인스턴스 정리
        if (rendition) {
          rendition.destroy();
        }
        if (book) {
          book.destroy();
        }

        newBook = ePub(selectedBookPath);
        setBook(newBook);

        // 전체 페이지 생성
        await newBook.ready;
        await newBook.locations.generate(1024);

        // 목차 정보 가져오기
        newBook.loaded.navigation.then((nav) => {
          setToc(nav.toc);
        });

        if (viewerRef.current) {
          newRendition = newBook.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "always",
          });
          setRendition(newRendition);

          // 항상 처음부터 시작 (새 책을 선택했으므로)
          newRendition.display();

          // 전체 페이지 수 예상
          const estimatedTotalPages = Math.ceil(newBook.locations.total * 1.2);
          setTotalPages(estimatedTotalPages);

          // 페이지 이동 이벤트 리스너
          newRendition.on("relocated", (location) => {
            // 현재 CFI 저장
            if (location && location.start) {
              setCurrentCfi(location.start.cfi);

              // 전체 페이지 중 현재 위치의 상대적 위치를 계산
              const locationIndex = newBook.locations.locationFromCfi(
                location.start.cfi
              );
              const estimatedPage = Math.ceil(
                (locationIndex / newBook.locations.total) * estimatedTotalPages
              );

              // 페이지 카운트 업데이트
              pageCountRef.current = Math.max(1, estimatedPage);
              setCurrentPage(pageCountRef.current);

              // 진행률 계산 (퍼센트)
              const progressPercentage = Math.round(
                (locationIndex / (newBook.locations.total - 1)) * 100
              );
              setProgress(progressPercentage);
            }
          });
        }
      } catch (error) {
        console.error("EPUB 로딩 오류:", error);
      }
    };

    loadBook();

    // 키보드 이벤트 리스너 설정
    const keyDownHandler = (e) => {
      if (e.key === "ArrowRight") {
        if (rendition) rendition.next();
      } else if (e.key === "ArrowLeft") {
        if (rendition) rendition.prev();
      }
    };

    window.addEventListener("keydown", keyDownHandler);

    return () => {
      window.removeEventListener("keydown", keyDownHandler);
      if (newRendition) {
        newRendition.destroy();
      }
      if (newBook) {
        newBook.destroy();
      }
    };
  }, [selectedBookPath]); // currentCfi 제거하여 무한 렌더링 방지

  // 이전 페이지로 이동
  const prevPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  // 다음 페이지로 이동
  const nextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };

  // 챕터 이동 함수
  const navigateToChapter = (chapterHref) => {
    if (book && rendition) {
      // 목차 숨기기
      setShowToc(false);

      // 해당 챕터로 이동
      rendition.display(chapterHref);
    }
  };

  const handleFontSizeChange = (value) => {
    const newSize = Math.max(50, Math.min(200, value)); // 크기 제한
    setFontSize(newSize);
    if (rendition) {
      rendition.themes.fontSize(`${newSize}%`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("전체 화면 모드 전환 오류:", err);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  // 목차 토글 함수
  const toggleToc = () => {
    setShowToc(!showToc);
  };

  // 목차 렌더링
  const renderTableOfContents = () => {
    if (!showToc) return null;

    return (
      <div className="toc-container">
        <h3>목차</h3>
        <button className="close-toc" onClick={toggleToc}>
          닫기
        </button>
        <ul className="toc-list">
          {toc.map((item, index) => (
            <li key={index} className="toc-item">
              <button
                className="toc-button"
                onClick={() => navigateToChapter(item.href)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      <div className="viewer-container">
        {selectedBookPath ? (
          <>
            <div ref={viewerRef} className="epub-viewer"></div>
            {renderTableOfContents()}
          </>
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
        {book && <button onClick={toggleToc}>목차</button>}
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

      <div className="keyboard-nav-hint">
        키보드 화살표(← →)를 사용하여 페이지를 넘길 수 있습니다.
      </div>
    </>
  );
}

export default EpubViewer;
