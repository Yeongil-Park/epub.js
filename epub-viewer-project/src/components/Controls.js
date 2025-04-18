import React from "react";

const Controls = ({ rendition }) => {
  if (!rendition) return null;

  const nextPage = () => rendition.next();
  const prevPage = () => rendition.prev();

  return (
    <div>
      <button onClick={prevPage}>이전 페이지</button>
      <button onClick={nextPage}>다음 페이지</button>
    </div>
  );
};

export default Controls;
