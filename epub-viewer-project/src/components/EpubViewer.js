import React, { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import "./EpubViewer.css"; // 스타일시트 추가 필요

const EpubViewer = () => {
  const viewerRef = useRef(null);
  const renditionRef = useRef(null);
  const [book, setBook] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [toc, setToc] = useState([]);
  const [showToc, setShowToc] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [theme, setTheme] = useState("light");
  const [bookmarks, setBookmarks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bookMetadata, setBookMetadata] = useState({});
  const [showControls, setShowControls] = useState(true);
  const [locationsReady, setLocationsReady] = useState(false);

  // 책 로드 및 초기화
  useEffect(() => {
    if (!viewerRef.current) return;

    setIsLoading(true);
    const loadedBook = ePub("/sample.epub");
    setBook(loadedBook);

    // 메타데이터 로드
    loadedBook.ready
      .then(() => loadedBook.loaded.metadata)
      .then((metadata) => {
        console.log("EPUB 메타데이터:", metadata);
        setBookMetadata(metadata);
      });

    // 목차 로드
    loadedBook.ready
      .then(() => loadedBook.loaded.navigation)
      .then((nav) => {
        console.log("EPUB 목차 데이터:", nav.toc);
        setToc(nav.toc);
      });

    // 렌더링 및 이벤트 핸들러 설정
    loadedBook.ready.then(() => {
      const rendition = loadedBook.renderTo(viewerRef.current, {
        width: "100%",
        height: "80vh",
        spread: "none",
      });

      rendition.display();
      renditionRef.current = rendition;

      // 위치 변경 이벤트
      rendition.on("locationChanged", (loc) => {
        setCurrentLocation(loc.start.cfi);

        // locations가 준비된 후에만 퍼센트 계산
        if (locationsReady) {
          try {
            const currentPage = loadedBook.locations.percentageFromCfi(
              loc.start.cfi
            );
            setCurrentPage(Math.round(currentPage * 100));
          } catch (err) {
            console.warn("위치 계산 중 오류:", err);
          }
        }
      });

      // 키보드 이벤트 핸들러 등록
      rendition.on("keyup", (e) => {
        if (e.key === "ArrowRight") nextPage();
        if (e.key === "ArrowLeft") prevPage();
      });

      // 페이지 계산을 위한 locations 생성
      try {
        loadedBook.locations
          .generate(1024)
          .then(() => {
            setLocationsReady(true);
            setIsLoading(false);
            setTotalPages(100); // 백분율로 표시

            // locations가 준비되면 현재 위치에 대한 퍼센트 업데이트
            if (currentLocation) {
              try {
                const page =
                  loadedBook.locations.percentageFromCfi(currentLocation);
                setCurrentPage(Math.round(page * 100));
              } catch (err) {
                console.warn("위치 계산 중 오류:", err);
              }
            }
          })
          .catch((err) => {
            console.error("Locations 생성 중 오류:", err);
            setIsLoading(false);
            // Locations 생성에 실패해도 책은 읽을 수 있게 함
          });
      } catch (err) {
        console.error("Locations 초기화 중 오류:", err);
        setIsLoading(false);
      }

      // 테마 적용
      applyTheme(theme, rendition);
    });

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (renditionRef.current) renditionRef.current.destroy();
    };
  }, []);

  // 테마 변경 시 적용
  useEffect(() => {
    if (renditionRef.current) {
      applyTheme(theme, renditionRef.current);
    }
  }, [theme]);

  // 글꼴 크기 변경 시 적용
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);

  // 테마 적용 함수
  const applyTheme = (themeName, rendition) => {
    if (themeName === "dark") {
      rendition.themes.register("dark", {
        body: {
          background: "#262626",
          color: "#e8e8e8",
        },
        a: { color: "#63a4ff" },
      });
      rendition.themes.select("dark");
    } else {
      rendition.themes.register("light", {
        body: {
          background: "#fff",
          color: "#000",
        },
      });
      rendition.themes.select("light");
    }
  };

  // 페이지 이동 함수
  const nextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next().then(() => {
        console.log("다음 페이지로 이동");
      });
    }
  };

  const prevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev().then(() => {
        console.log("이전 페이지로 이동");
      });
    }
  };

  // 특정 위치(CFI)로 이동
  const goToLocation = (cfi) => {
    if (renditionRef.current) {
      renditionRef.current.display(cfi);
      setShowToc(false);
    }
  };

  // 목차 항목으로 이동
  const goToTocItem = (href) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
      setShowToc(false);
    }
  };

  // 북마크 추가/제거
  const toggleBookmark = () => {
    if (!currentLocation) return;

    const existing = bookmarks.find((b) => b.cfi === currentLocation);
    if (existing) {
      setBookmarks(bookmarks.filter((b) => b.cfi !== currentLocation));
    } else {
      // renditionRef.current가 존재하고 getContents() 메소드가 있는지 확인
      if (
        renditionRef.current &&
        renditionRef.current.getContents &&
        renditionRef.current.getContents().length > 0
      ) {
        const content = renditionRef.current.getContents()[0];
        // content.window가 존재하는지 확인
        if (content && content.window) {
          const selection = content.window.getSelection();
          let label = "페이지 " + (currentPage || "?");

          if (selection && selection.toString().length > 0) {
            label = selection.toString().substring(0, 30) + "...";
          }

          setBookmarks([
            ...bookmarks,
            {
              cfi: currentLocation,
              label,
              date: new Date().toLocaleString(),
            },
          ]);
        } else {
          // window 객체에 접근할 수 없는 경우 기본 레이블 사용
          setBookmarks([
            ...bookmarks,
            {
              cfi: currentLocation,
              label: "북마크 " + (bookmarks.length + 1),
              date: new Date().toLocaleString(),
            },
          ]);
        }
      } else {
        // getContents가 없거나 빈 배열인 경우 기본 레이블 사용
        setBookmarks([
          ...bookmarks,
          {
            cfi: currentLocation,
            label: "북마크 " + (bookmarks.length + 1),
            date: new Date().toLocaleString(),
          },
        ]);
      }
    }
  };

  // 검색 기능
  const handleSearch = () => {
    if (!book || !searchQuery.trim()) return;

    setSearchResults([]);
    setShowSearchResults(true);
    setIsLoading(true);

    const results = [];
    let searchCompleted = 0;
    const totalItems = book.spine.items.length;

    book.spine.each((item) => {
      item
        .load(book.load.bind(book))
        .then((doc) => {
          try {
            const query = searchQuery.toLowerCase();
            const textNodes = findTextNodesContaining(doc, query);

            textNodes.forEach((node) => {
              try {
                const range = doc.createRange();
                range.selectNodeContents(node);

                const cfi = item.cfiFromRange(range);
                let context = node.textContent;
                const index = context.toLowerCase().indexOf(query);

                context = context.substring(
                  Math.max(0, index - 40),
                  Math.min(context.length, index + query.length + 40)
                );

                if (index > 0) context = "..." + context;
                if (index + query.length + 40 < node.textContent.length)
                  context += "...";

                results.push({
                  cfi,
                  context,
                  query,
                });
              } catch (err) {
                console.warn("검색 결과 처리 중 오류:", err);
              }
            });
          } catch (err) {
            console.warn("검색 처리 중 오류:", err);
          }

          searchCompleted++;
          if (searchCompleted >= totalItems) {
            setSearchResults(results);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error("검색을 위한 항목 로드 중 오류:", err);
          searchCompleted++;
          if (searchCompleted >= totalItems) {
            setSearchResults(results);
            setIsLoading(false);
          }
        });
    });

    // 만약 spine이 비어있거나 오류가 발생할 경우를 대비한 타임아웃
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 5000);
  };

  // 텍스트 노드 찾기 헬퍼 함수
  const findTextNodesContaining = (doc, query) => {
    const textNodes = [];
    if (!doc || !doc.createTreeWalker) return textNodes;

    try {
      const walker = doc.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            if (
              node.nodeValue &&
              node.nodeValue.toLowerCase().includes(query)
            ) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          },
        },
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }
    } catch (err) {
      console.error("텍스트 노드 찾기 중 오류:", err);
    }

    return textNodes;
  };

  // 글꼴 크기 변경
  const changeFontSize = (delta) => {
    setFontSize((prevSize) => {
      const newSize = prevSize + delta;
      return Math.min(Math.max(50, newSize), 200); // 50% ~ 200% 제한
    });
  };

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 이미 useEffect 내에 등록되어 있으므로 추가 키 이벤트 처리만 여기에 추가
      if (e.key === "f") toggleFullscreen();
      if (e.key === "b") toggleBookmark();
      if (e.key === "t") setShowToc((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentLocation]);

  // 전체 화면 토글
  const toggleFullscreen = () => {
    const elem = document.documentElement;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 현재 북마크 여부 확인
  const isCurrentLocationBookmarked = () => {
    return bookmarks.some((b) => b.cfi === currentLocation);
  };

  // 슬라이더로 위치 이동 처리
  const handleSliderChange = (e) => {
    const percent = parseInt(e.target.value) / 100;

    if (book && locationsReady) {
      try {
        const cfi = book.locations.cfiFromPercentage(percent);
        if (cfi && renditionRef.current) {
          renditionRef.current.display(cfi);
        }
      } catch (err) {
        console.warn("슬라이더 위치 변경 중 오류:", err);
      }
    }
  };

  return (
    <div className={`epub-viewer ${theme}`}>
      {/* 상단 컨트롤 바 */}
      {showControls && (
        <div className="viewer-header">
          <div className="left-controls">
            <button onClick={() => setShowToc(!showToc)}>
              {showToc ? "목차 닫기" : "목차 보기"}
            </button>
            <button onClick={toggleBookmark}>
              {isCurrentLocationBookmarked() ? "북마크 제거" : "북마크 추가"}
            </button>
          </div>

          <div className="center-controls">
            <div className="title">{bookMetadata.title || "전자책"}</div>
          </div>

          <div className="right-controls">
            <button onClick={() => changeFontSize(-10)}>글자 작게</button>
            <span>{fontSize}%</span>
            <button onClick={() => changeFontSize(10)}>글자 크게</button>
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "다크 모드" : "라이트 모드"}
            </button>
            <button onClick={toggleFullscreen}>전체화면</button>
          </div>
        </div>
      )}

      {/* 사이드바 (목차/북마크/검색) */}
      {showToc && (
        <div className="sidebar">
          <div className="tabs">
            <button
              className={`tab ${showSearchResults ? "" : "active"}`}
              onClick={() => setShowSearchResults(false)}
            >
              목차
            </button>
            <button
              className={`tab ${showSearchResults ? "active" : ""}`}
              onClick={() => setShowSearchResults(true)}
            >
              검색
            </button>
          </div>

          {showSearchResults ? (
            <div className="search-container">
              <div className="search-input">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="검색어 입력..."
                />
                <button onClick={handleSearch}>검색</button>
              </div>

              <div className="search-results">
                {isLoading && searchQuery ? <div>검색 중...</div> : null}
                {!isLoading && searchResults.length === 0 && searchQuery ? (
                  <div>검색 결과가 없습니다.</div>
                ) : null}
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => goToLocation(result.cfi)}
                  >
                    <div
                      className="result-context"
                      dangerouslySetInnerHTML={{
                        __html: result.context.replace(
                          new RegExp(`(${result.query})`, "gi"),
                          "<mark>$1</mark>"
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="toc-container">
                <h3>목차</h3>
                <ul className="toc-list">
                  {toc.map((item, index) => (
                    <li key={index}>
                      <button
                        className="toc-item"
                        onClick={() => goToTocItem(item.href)}
                      >
                        {item.label}
                      </button>
                      {item.subitems && item.subitems.length > 0 && (
                        <ul className="sub-toc">
                          {item.subitems.map((subitem, idx) => (
                            <li key={`${index}-${idx}`}>
                              <button
                                className="toc-item sub-item"
                                onClick={() => goToTocItem(subitem.href)}
                              >
                                {subitem.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bookmarks-container">
                <h3>북마크</h3>
                {bookmarks.length === 0 ? (
                  <p>저장된 북마크가 없습니다.</p>
                ) : (
                  <ul className="bookmark-list">
                    {bookmarks.map((bookmark, index) => (
                      <li key={index} className="bookmark-item">
                        <button onClick={() => goToLocation(bookmark.cfi)}>
                          {bookmark.label}
                        </button>
                        <button
                          className="remove-bookmark"
                          onClick={() =>
                            setBookmarks(
                              bookmarks.filter((b) => b.cfi !== bookmark.cfi)
                            )
                          }
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 뷰어 컨테이너 */}
      <div
        className="viewer-container"
        onClick={() => setShowControls(!showControls)}
      >
        <div ref={viewerRef} className="epub-content"></div>
      </div>

      {/* 하단 컨트롤 바 */}
      {showControls && (
        <div className="viewer-footer">
          <button onClick={prevPage} className="nav-button prev">
            이전
          </button>

          <div className="progress-container">
            <input
              type="range"
              min="0"
              max={totalPages}
              value={currentPage || 0}
              onChange={handleSliderChange}
              disabled={!locationsReady}
              className="progress-slider"
            />
            <div className="progress-text">
              {isLoading
                ? "로딩 중..."
                : locationsReady
                ? `${currentPage || 0}% / ${totalPages}%`
                : "위치 정보 로딩 중..."}
            </div>
          </div>

          <button onClick={nextPage} className="nav-button next">
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default EpubViewer;
