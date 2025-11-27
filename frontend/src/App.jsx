import { useState, useEffect, useCallback } from "react";
import * as ethers from "ethers";
import Web3Modal from "web3modal";
import ComicManagementABI from "./ComicManagement.json";
import { contractAddress } from "./config";
import SubmitComicForm from "./components/SubmitComicForm";
import "./App.css";

const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "BỊ TỪ CHỐI",
};

// Component ComicReader-Trình đọc truyện cho Admin
const ComicReader = ({ comic, onClose }) => {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
// load ảnh từ ipfs
  useEffect(() => {
    const loadComicPages = async () => {
      if (!comic?.ipfsHash) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let imageUrls = [];
// load ảnh từ ipfs
        if (comic.ipfsHash.includes("|")) {
          // Multiple hashes - split by | and get all images
          const hashes = comic.ipfsHash.split("|").map(h => h.trim()).filter(Boolean);
          imageUrls = hashes.map(hash => `https://ipfs.io/ipfs/${hash}`);
        } else {
          // Single folder hash - try to list all images in folder
          const cid = comic.ipfsHash.trim();
          const folderUrl = `https://ipfs.io/ipfs/${cid}/`;
          
          try {
            const response = await fetch(folderUrl);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const links = Array.from(doc.querySelectorAll('a'))
              .map(a => a.getAttribute('href'))
              .filter(href => href && !href.includes('/'))
              .filter(href => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(href));
            
            // Sort files naturally by numbers in filename
            links.sort((a, b) => {
              const getNumber = (filename) => {
                const match = filename.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
              };
              return getNumber(a) - getNumber(b);
            });
            
            imageUrls = links.map(file => `${folderUrl}${file}`);
          } catch (error) {
            console.error('Error loading folder:', error);
            // Fallback: if folder access fails, try direct access
            imageUrls = [`https://ipfs.io/ipfs/${cid}`];
          }
        }

        console.log('Loaded pages:', imageUrls);
        setPages(imageUrls);
      } catch (error) {
        console.error('Error loading comic:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComicPages();
  }, [comic]);

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageIndex) => {
    setCurrentPage(pageIndex);
  };

  if (fullscreen) {
    return (
      <div className="comic-reader-fullscreen">
        <div className="fullscreen-controls">
          <button onClick={() => setFullscreen(false)} className="control-btn">
            ✕ Thoát toàn màn hình
          </button>
          <span className="page-indicator">
            Trang {currentPage + 1} / {pages.length}
          </span>
        </div>
        
        <div className="fullscreen-image-container" onClick={nextPage}>
          {pages[currentPage] && (
            <img 
              src={pages[currentPage]} 
              alt={`Page ${currentPage + 1}`}
              className="fullscreen-image"
            />
          )}
        </div>

        <div className="fullscreen-nav">
          <button onClick={prevPage} disabled={currentPage === 0} className="nav-btn">
            ← Trang trước
          </button>
          <button onClick={nextPage} disabled={currentPage === pages.length - 1} className="nav-btn">
            Trang sau →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="comic-reader-overlay">
      <div className="comic-reader-modal">
        {/* Header */}
        <div className="reader-header">
          <div className="reader-title">
            <h3>{comic?.title || 'Đọc truyện'}</h3>
            <p className="reader-subtitle">Tác giả: {comic?.author} | ID: {comic?.id}</p>
          </div>
          <div className="reader-controls">
            <button onClick={() => setFullscreen(true)} className="control-btn">
              ⛶ Toàn màn hình
            </button>
            <button onClick={onClose} className="close-reader-btn">
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* Comic Content */}
        <div className="reader-content">
          {loading ? (
            <div className="reader-loading">
              <div className="spinner"></div>
              <p>Đang tải truyện...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="no-pages">
              <p>Không có trang nào để hiển thị</p>
              <p className="ipfs-link">
                <a 
                  href={`https://ipfs.io/ipfs/${comic.ipfsHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Mở trên IPFS
                </a>
              </p>
            </div>
          ) : (
            <>
              {/* Main Page */}
              <div className="main-page-container">
                <div className="page-navigation">
                  <button 
                    onClick={prevPage} 
                    disabled={currentPage === 0}
                    className="page-nav-btn"
                  >
                    ←
                  </button>
                  
                  <div className="current-page-container">
                    <img 
                      src={pages[currentPage]} 
                      alt={`Page ${currentPage + 1}`}
                      className="comic-page"
                      onError={(e) => {
                        console.error('Error loading image:', pages[currentPage]);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  <button 
                    onClick={nextPage} 
                    disabled={currentPage === pages.length - 1}
                    className="page-nav-btn"
                  >
                    →
                  </button>
                </div>
                
                <div className="page-info">
                  <span>Trang {currentPage + 1} / {pages.length}</span>
                  <button 
                    onClick={() => setFullscreen(true)}
                    className="small-control-btn"
                  >
                    ⛶ Toàn màn hình
                  </button>
                </div>
              </div>

              {/* Thumbnail Navigation */}
              {pages.length > 1 && (
                <div className="thumbnail-section">
                  <h4 className="thumbnail-title">Chọn trang:</h4>
                  <div className="thumbnail-container">
                    {pages.map((page, index) => (
                      <div 
                        key={index}
                        className={`thumbnail ${currentPage === index ? 'thumbnail-active' : ''}`}
                        onClick={() => goToPage(index)}
                      >
                        <img 
                          src={page} 
                          alt={`Trang ${index + 1}`}
                          className="thumbnail-image"
                        />
                        <span className="thumbnail-number">{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
// component chính
function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComic, setSelectedComic] = useState(null);
//Kết nối ví metamask
  const connectWallet = useCallback(async () => {
    const web3Modal = new Web3Modal({
      network: "hardhat local",
      cacheProvider: true,
    });

    try {
      const connection = await web3Modal.connect();
      const newProvider = new ethers.providers.Web3Provider(connection);
      const newSigner = newProvider.getSigner();
      const newAccount = await newSigner.getAddress();

      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(newAccount);

      const contract = new ethers.Contract(
        contractAddress,
        ComicManagementABI.abi,
        newProvider
      );
      const adminAddress = await contract.adminAddress();
      setIsAdmin(newAccount.toLowerCase() === adminAddress.toLowerCase());
    } catch (error) {
      console.error("Lỗi kết nối ví:", error);
    }
  }, []);

  const fetchComics = useCallback(async () => {
    if (!provider) return;
    setLoading(true);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        ComicManagementABI.abi,
        provider
      );

      const ids = await contract.getAllComicIds();
      const comicDetails = await Promise.all(
        ids.map((id) => contract.comics(id))
      );

      setComics(
        comicDetails.map((c) => ({
          id: c.comicId.toNumber(),
          title: c.title,
          author: c.author,
          description: c.description,
          ipfsHash: c.ipfsHash,
          status: StatusMap[c.status],
          submitter: c.submitter,
          reviewer: c.reviewer,
        }))
      );
    } catch (error) {
      console.error("Lỗi khi tải truyện:", error);
    } finally {
      setLoading(false);
    }
  }, [provider]);
// duyệt/từ chối truyện
  const reviewComic = async (comicId, isApproved) => {
    if (!signer || !isAdmin) return;

    const newStatus = isApproved ? 1 : 2;

    try {
      const contract = new ethers.Contract(
        contractAddress,
        ComicManagementABI.abi,
        signer
      );
      const tx = await contract.reviewComic(comicId, newStatus);
      await tx.wait();

      alert(`Truyện ID ${comicId} đã được ${isApproved ? "DUYỆT" : "TỪ CHỐI"}`);
      await fetchComics();
    } catch (error) {
      console.error("Lỗi khi duyệt truyện:", error);
      alert("Lỗi giao dịch! Kiểm tra console và đảm bảo bạn là Admin.");
    }
  };

  useEffect(() => {
    connectWallet();
  }, [connectWallet]);

  useEffect(() => {
    if (provider) fetchComics();
  }, [provider, fetchComics]);

  if (!account) {
    return (
      <div className="container">
        <div className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">🎭 ComicVerse</h1>
            <p className="hero-subtitle">
              Nền tảng truyện tranh phi tập trung - Nơi sáng tạo gặp gỡ công nghệ blockchain
            </p>
            <div className="hero-features">
              <div className="feature">
                <span className="feature-icon">🖼️</span>
                <span>Đăng tải truyện dễ dàng</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🔒</span>
                <span>Bảo vệ bản quyền bằng blockchain</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🌐</span>
                <span>Lưu trữ phi tập trung trên IPFS</span>
              </div>
            </div>
            <button className="connect-btn hero-connect" onClick={connectWallet}>
              🔗 Kết nối MetaMask để bắt đầu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị Comic Reader nếu có truyện được chọn
  if (selectedComic) {
    return (
      <ComicReader 
        comic={selectedComic} 
        onClose={() => setSelectedComic(null)} 
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="user-container">
        <div className="user-header">
          <div className="user-info">
            <h1>📖 ComicVerse</h1>
            <div className="user-details">
              <span className="user-address">{account}</span>
              <span className="user-badge">Tác giả</span>
            </div>
          </div>
        </div>
        <SubmitComicForm 
          signer={signer} 
          account={account} 
          provider={provider} 
          onSubmission={fetchComics} 
        />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-info">
          <h1>🛡️ ComicVerse Admin</h1>
          <div className="admin-details">
            <span className="admin-address">{account}</span>
            <span className="admin-badge">Quản trị viên</span>
          </div>
        </div>
        <button className="refresh-btn" onClick={fetchComics}>
          🔄 Làm mới
        </button>
      </div>

      <div className="admin-stats">
        <div className="stat">
          <div className="stat-number">{comics.length}</div>
          <div className="stat-label">Tổng truyện</div>
        </div>
        <div className="stat">
          <div className="stat-number">
            {comics.filter(c => c.status === "CHỜ DUYỆT").length}
          </div>
          <div className="stat-label">Chờ duyệt</div>
        </div>
        <div className="stat">
          <div className="stat-number">
            {comics.filter(c => c.status === "ĐÃ DUYỆT").length}
          </div>
          <div className="stat-label">Đã duyệt</div>
        </div>
        <div className="stat">
          <div className="stat-number">
            {comics.filter(c => c.status === "BỊ TỪ CHỐI").length}
          </div>
          <div className="stat-label">Bị từ chối</div>
        </div>
      </div>

      <div className="comics-section">
        <h2 className="section-title">📚 Quản lý truyện đăng tải ({comics.length} truyện)</h2>
        
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Đang tải danh sách truyện...</p>
          </div>
        ) : comics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Chưa có truyện nào được đăng tải</p>
          </div>
        ) : (
          <div className="comics-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Thông tin truyện</th>
                  <th>Trạng thái</th>
                  <th>Người đăng</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {comics.map((comic) => (
                  <tr key={comic.id}>
                    <td className="comic-id">#{comic.id}</td>
                    <td className="comic-info">
                      <div className="comic-title">{comic.title}</div>
                      <div className="comic-author">Tác giả: {comic.author}</div>
                      {comic.description && comic.description !== "Không có mô tả" && (
                        <div className="comic-description">{comic.description}</div>
                      )}
                      <button 
                        className="btn-read"
                        onClick={() => setSelectedComic(comic)}
                      >
                        📖 Xem truyện
                      </button>
                    </td>
                    <td>
                      <span className={`status status-${comic.status.replace(/\s/g, "").toLowerCase()}`}>
                        {comic.status}
                      </span>
                    </td>
                    <td className="submitter">
                      {comic.submitter.substring(0, 8)}...{comic.submitter.substring(comic.submitter.length - 6)}
                    </td>
                    <td>
                      {comic.status === "CHỜ DUYỆT" ? (
                        <div className="action-buttons">
                          <button 
                            className="btn-approve" 
                            onClick={() => reviewComic(comic.id, true)}
                          >
                            ✅ Duyệt
                          </button>
                          <button 
                            className="btn-reject" 
                            onClick={() => reviewComic(comic.id, false)}
                          >
                            ❌ Từ chối
                          </button>
                        </div>
                      ) : (
                        <div className="review-info">
                          Đã {comic.status.toLowerCase()} bởi {comic.reviewer.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;