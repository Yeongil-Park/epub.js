import React, { useState, useEffect, useRef, useCallback } from "react";
import ePub from "epubjs"; // epubjs 라이브러리 임포트
import "./App.css";

function App() {
  const [fileName, setFileName] = useState("");
  const [epubBook, setEpubBook] = useState(null); // epubjs Book 객체
  const [rendition, setRendition] = useState(null); // epubjs Rendition 객체
  const [location, setLocation] = useState(null); // 현재 위치 (epubjs location)
  const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수 (근사치)
  const [currentPage, setCurrentPage] = useState(0); // 현재 페이지 번호 (표시용)
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState("");
  const viewerRef = useRef(null); // EPUB 콘텐츠를 렌더링할 div 참조

  // 파일 선택 핸들러
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".epub")) {
        setError("'.epub' 파일만 열 수 있습니다.");
        setFileName("");
        setEpubBook(null); // 이전 책 정보 초기화
        setRendition(null);
        if (viewerRef.current) viewerRef.current.innerHTML = ""; // 뷰어 내용 지우기
        event.target.value = null;
        return;
      }

      setIsLoading(true);
      setError("");
      setFileName(file.name);

      // 이전 Rendition 정리 (중요)
      if (rendition) {
        rendition.destroy();
        setRendition(null);
      }
      if (viewerRef.current) {
        viewerRef.current.innerHTML = ""; // 이전 내용 클리어
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const book = ePub(e.target.result); // ArrayBuffer로 EPUB 로드
        setEpubBook(book);

        // 뷰어 div가 준비되었는지 확인 후 렌더링
        if (viewerRef.current) {
          // Rendition 생성 및 상태 저장
          const newRendition = book.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            // flow: "scrolled-doc", // 스크롤 모드 필요 시 주석 해제
            // manager: "continuous" // 스크롤 모드와 함께 사용
          });
          setRendition(newRendition);

          // 첫 페이지 표시
          newRendition.display();

          // 위치 정보(페이지 번호 등)를 위한 이벤트 리스너 설정
          newRendition.on("relocated", (location) => {
            // console.log('Relocated:', location); // 디버깅용
            setLocation(location); // 전체 위치 정보 저장
            // locations 정보가 로드된 후 페이지 번호 계산 시도
            if (
              book.locations &&
              book.locations.length() > 0 &&
              location.start.cfi
            ) {
              const currentPageNum = book.locations.locationFromCfi(
                location.start.cfi
              );
              // locationFromCfi는 0부터 시작하는 인덱스를 반환하므로 +1
              setCurrentPage(currentPageNum + 1);
            } else {
              // locations가 준비 안되었을 때는 CFI 기반으로 대략적 표시
              setCurrentPage(location.start.displayed.page);
            }
          });

          // 전체 페이지 수 계산 (비동기, 근사치)
          book.ready
            .then(() => {
              return book.locations.generate(1024); // 숫자가 클수록 정확하지만 느려짐
            })
            .then((locations) => {
              // console.log('Locations generated:', locations.length); // 디버깅용
              setTotalPages(book.locations.length());
              // 초기 페이지 번호 다시 설정 (locations 생성 후)
              if (location && location.start.cfi) {
                const currentPageNum = book.locations.locationFromCfi(
                  location.start.cfi
                );
                setCurrentPage(currentPageNum + 1);
              } else if (rendition && rendition.location) {
                // locations 생성 후 현재 rendition 위치로 다시 시도
                const currentPageNum = book.locations.locationFromCfi(
                  rendition.location.start.cfi
                );
                setCurrentPage(currentPageNum + 1);
              }
            })
            .catch((err) => console.error("Location generation error:", err));

          setIsLoading(false);
        } else {
          setError("뷰어 영역을 찾을 수 없습니다.");
          setIsLoading(false);
        }
      };

      reader.onerror = (e) => {
        console.error("파일 읽기 오류:", e);
        setError("파일을 읽는 중 오류가 발생했습니다.");
        setIsLoading(false);
        setFileName("");
        setEpubBook(null);
      };

      reader.readAsArrayBuffer(file); // EPUB은 ArrayBuffer로 읽어야 함
    } else {
      // 파일 선택 취소
      setFileName("");
      setError("");
      // 이전 책 정보 초기화
      if (rendition) {
        rendition.destroy();
      }
      setEpubBook(null);
      setRendition(null);
      if (viewerRef.current) viewerRef.current.innerHTML = "";
    }
  };

  // 이전 페이지 이동
  const goToPrevPage = useCallback(() => {
    if (rendition) {
      rendition.prev();
    }
  }, [rendition]);

  // 다음 페이지 이동
  const goToNextPage = useCallback(() => {
    if (rendition) {
      rendition.next();
    }
  }, [rendition]);

  // 컴포넌트 언마운트 시 Rendition 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (rendition) {
        rendition.destroy();
      }
      if (epubBook) {
        epubBook.destroy(); // epub.js 0.3.93+
      }
    };
  }, [rendition, epubBook]); // rendition 또는 epubBook이 변경될 때 이전 것을 정리

  return (
    <div className="ebook-viewer">
      <header className="viewer-header">
        <h1>EPUB E-book 뷰어</h1>
        <div className="file-input-area">
          <label htmlFor="file-upload" className="file-upload-button">
            .epub 파일 열기
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".epub" // epub 파일만 허용
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {fileName && (
            <span className="file-name-display">열린 파일: {fileName}</span>
          )}
        </div>
        {isLoading && (
          <p className="loading-message">EPUB 파일을 로딩 중입니다...</p>
        )}
        {error && <p className="error-message">{error}</p>}
      </header>

      {/* EPUB 콘텐츠가 렌더링될 영역 */}
      <main className="page-content epub-content" ref={viewerRef}></main>

      <footer className="viewer-footer">
        <button
          onClick={goToPrevPage}
          disabled={isLoading || !rendition || (location && location.atStart)}
        >
          ◀ 이전
        </button>
        <span className="page-info">
          {/* location.pages는 현재 화면에 보이는 페이지 수 이므로 totalPages 사용 */}
          페이지: {currentPage > 0 ? currentPage : "-"} /{" "}
          {totalPages > 0 ? totalPages : "-"}
        </span>
        <button
          onClick={goToNextPage}
          disabled={isLoading || !rendition || (location && location.atEnd)}
        >
          다음 ▶
        </button>
      </footer>
    </div>
  );
}

export default App;
