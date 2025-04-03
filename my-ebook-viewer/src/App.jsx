import React, { useState, useEffect, useRef } from "react";
import ePub from "epubjs";
import "./App.css";

function App() {
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [selectedBookPath, setSelectedBookPath] = useState(null);
  const viewerRef = useRef(null);

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
        }
      } catch (error) {
        console.error("EPUB 로딩 오류:", error);
        // 오류 처리: 사용자에게 오류 메시지 표시 또는 다른 적절한 조치
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
  }, [selectedBookPath]);

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
        <div className="navigation">
          <button onClick={prevPage}>이전 페이지</button>
          <button onClick={nextPage}>다음 페이지</button>
        </div>
      )}
    </div>
  );
}

export default App;
