import React from "react";

function BookSelector({ selectedBookPath, onBookSelect }) {
  const availableBooks = [
    { title: "로미오와 줄리엣", path: "/books/romeo.epub" },
    { title: "모비 딕", path: "/books/moby-dick.epub" },
    { title: "로빈슨 크루소", path: "/books/Robinson-Crusoe.epub" },
    { title: "프랑켄슈타인", path: "/books/Frankenstein.epub" },
    { title: "걸리버 여행기", path: "/books/Gulliver's-Travels.epub" },
  ];

  return (
    <div className="book-selector">
      <h2>읽을 책을 선택하세요:</h2>
      {availableBooks.map((bookInfo) => (
        <button
          key={bookInfo.path}
          onClick={() => onBookSelect(bookInfo.path)}
          disabled={selectedBookPath === bookInfo.path}
        >
          {bookInfo.title}
        </button>
      ))}
    </div>
  );
}

export default BookSelector;
