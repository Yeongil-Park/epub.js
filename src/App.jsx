import React, { useState } from "react";
import "./App.css";
import EpubViewer from "./EpubViewer";
import BookSelector from "./BookSelector";

function App() {
  const [selectedBookPath, setSelectedBookPath] = useState(null);

  const handleBookSelect = (path) => {
    setSelectedBookPath(path);
  };

  return (
    <div className="App">
      <h1>EPUB 뷰어</h1>
      <BookSelector
        selectedBookPath={selectedBookPath}
        onBookSelect={handleBookSelect}
      />
      <EpubViewer selectedBookPath={selectedBookPath} />
    </div>
  );
}

export default App;
