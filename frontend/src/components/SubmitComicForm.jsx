import React, { useState, useEffect, useCallback } from 'react';
import * as ethers from "ethers";
import { ipfsClient } from '../ipfsClient';
import ComicManagementABI from '../ComicManagement.json';
import { contractAddress } from '../config';

const StatusMap = {
    0: "CHỜ DUYỆT",
    1: "ĐÃ DUYỆT",
    2: "BỊ TỪ CHỐI",
};

// Sử dụng gateway nhất quán cho toàn bộ ứng dụng
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

// ===== Comic Reader Component =====
const ComicReader = ({ comic, onClose }) => {
    const [pages, setPages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);
//load ảnh từ ipfs
    useEffect(() => {
        const loadComicPages = async () => {
            if (!comic?.ipfsHash) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                let imageUrls = [];

                if (comic.ipfsHash.includes("|")) {
                    // Multiple hashes
                    const hashes = comic.ipfsHash.split("|").map(h => h.trim()).filter(Boolean);
                    imageUrls = hashes.map(hash => `${IPFS_GATEWAY}${hash}`);
                } else {
                    // Single folder hash
                    const cid = comic.ipfsHash.trim();
                    const folderUrl = `${IPFS_GATEWAY}${cid}/`;
                    
                    try {
                        const response = await fetch(folderUrl);
                        const html = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        const links = Array.from(doc.querySelectorAll('a'))
                            .map(a => a.getAttribute('href'))
                            .filter(href => href && !href.includes('/'))
                            .filter(href => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(href));
                        
                        // Sort files naturally
                        links.sort((a, b) => {
                            const numA = parseInt(a.match(/\d+/)) || 0;
                            const numB = parseInt(b.match(/\d+/)) || 0;
                            return numA - numB;
                        });
                        
                        imageUrls = links.map(file => `${folderUrl}${file}`);
                    } catch (error) {
                        console.error('Error loading folder:', error);
                    }
                }

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
            <div style={fullscreenStyle}>
                <div style={fullscreenControlsStyle}>
                    <button onClick={() => setFullscreen(false)} style={controlButtonStyle}>
                        ✕ Thoát toàn màn hình
                    </button>
                    <span style={pageIndicatorStyle}>
                        Trang {currentPage + 1} / {pages.length}
                    </span>
                </div>
                
                <div style={fullscreenImageContainerStyle} onClick={nextPage}>
                    {pages[currentPage] && (
                        <img 
                            src={pages[currentPage]} 
                            alt={`Page ${currentPage + 1}`}
                            style={fullscreenImageStyle}
                        />
                    )}
                </div>

                <div style={fullscreenNavStyle}>
                    <button onClick={prevPage} disabled={currentPage === 0} style={navButtonStyle}>
                        ← Trang trước
                    </button>
                    <button onClick={nextPage} disabled={currentPage === pages.length - 1} style={navButtonStyle}>
                        Trang sau →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={readerOverlayStyle}>
            <div style={readerModalStyle}>
                {/* Header */}
                <div style={readerHeaderStyle}>
                    <div style={readerTitleStyle}>
                        <h3>{comic?.title || 'Đọc truyện'}</h3>
                        <p style={readerSubtitleStyle}>Tác giả: {comic?.author}</p>
                    </div>
                    <div style={readerControlsStyle}>
                        <button onClick={() => setFullscreen(true)} style={controlButtonStyle}>
                            ⛶ Toàn màn hình
                        </button>
                        <button onClick={onClose} style={closeReaderButtonStyle}>
                            ✕ Đóng
                        </button>
                    </div>
                </div>

                {/* Comic Content */}
                <div style={readerContentStyle}>
                    {loading ? (
                        <div style={loadingStyle}>
                            <div style={spinnerStyle}></div>
                            <p>Đang tải truyện...</p>
                        </div>
                    ) : pages.length === 0 ? (
                        <div style={noPagesStyle}>
                            <p>Không có trang nào để hiển thị</p>
                            <p style={ipfsLinkStyle}>
                                <a 
                                    href={`${IPFS_GATEWAY}${comic.ipfsHash}`} 
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
                            <div style={mainPageContainerStyle}>
                                <div style={pageNavigationStyle}>
                                    <button 
                                        onClick={prevPage} 
                                        disabled={currentPage === 0}
                                        style={pageNavButtonStyle}
                                    >
                                        ←
                                    </button>
                                    
                                    <div style={currentPageContainerStyle}>
                                        <img 
                                            src={pages[currentPage]} 
                                            alt={`Page ${currentPage + 1}`}
                                            style={comicPageStyle}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    
                                    <button 
                                        onClick={nextPage} 
                                        disabled={currentPage === pages.length - 1}
                                        style={pageNavButtonStyle}
                                    >
                                        →
                                    </button>
                                </div>
                                
                                <div style={pageInfoStyle}>
                                    <span>Trang {currentPage + 1} / {pages.length}</span>
                                    <button 
                                        onClick={() => setFullscreen(true)}
                                        style={smallControlButtonStyle}
                                    >
                                        ⛶ Toàn màn hình
                                    </button>
                                </div>
                            </div>

                            {/* Thumbnail Navigation */}
                            {pages.length > 1 && (
                                <div style={thumbnailSectionStyle}>
                                    <h4 style={thumbnailTitleStyle}>Chọn trang:</h4>
                                    <div style={thumbnailContainerStyle}>
                                        {pages.slice(0, 20).map((page, index) => (
                                            <div 
                                                key={index}
                                                style={thumbnailStyle(currentPage === index)}
                                                onClick={() => goToPage(index)}
                                            >
                                                <img 
                                                    src={page} 
                                                    alt={`Trang ${index + 1}`}
                                                    style={thumbnailImageStyle}
                                                />
                                                <span style={thumbnailNumberStyle}>{index + 1}</span>
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

// ===== Comic Card Component =====
const ComicCard = ({ comic, onRead }) => {
    const [coverImage, setCoverImage] = useState('');

    useEffect(() => {
        const loadCoverImage = async () => {
            if (!comic?.ipfsHash) return;

            try {
                let coverUrl = '';

                if (comic.ipfsHash.includes("|")) {
                    // Multiple hashes - use first one as cover
                    const firstHash = comic.ipfsHash.split("|")[0].trim();
                    coverUrl = `${IPFS_GATEWAY}${firstHash}`;
                } else {
                    // Single folder hash - try to find cover image
                    const cid = comic.ipfsHash.trim();
                    const folderUrl = `${IPFS_GATEWAY}${cid}/`;
                    
                    try {
                        const response = await fetch(folderUrl);
                        const html = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        const links = Array.from(doc.querySelectorAll('a'))
                            .map(a => a.getAttribute('href'))
                            .filter(href => href && !href.includes('/'))
                            .filter(href => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(href));
                        
                        if (links.length > 0) {
                            // Sort and get first image
                            links.sort((a, b) => {
                                const numA = parseInt(a.match(/\d+/)) || 0;
                                const numB = parseInt(b.match(/\d+/)) || 0;
                                return numA - numB;
                            });
                            coverUrl = `${folderUrl}${links[0]}`;
                        }
                    } catch (error) {
                        console.error('Error loading cover:', error);
                    }
                }

                if (coverUrl) {
                    setCoverImage(coverUrl);
                }
            } catch (error) {
                console.error('Error loading comic cover:', error);
            }
        };

        loadCoverImage();
    }, [comic]);

    return (
        <div style={comicCardStyle} onClick={onRead}>
            {coverImage && (
                <img 
                    src={coverImage} 
                    alt={`Bìa ${comic.title}`}
                    style={comicCoverStyle}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            )}
            <div style={comicCardContentStyle}>
                <h3 style={comicCardTitleStyle}>{comic.title}</h3>
                <p style={comicCardAuthorStyle}>Tác giả: {comic.author}</p>
                {comic.description && (
                    <p style={comicCardDescStyle}>{comic.description}</p>
                )}
                <div style={comicCardFooterStyle}>
                    <span style={statusBadgeStyle(comic.status)}>
                        {comic.status}
                    </span>
                    <span style={comicIdStyle}>ID: {comic.id}</span>
                </div>
            </div>
        </div>
    );
};

// ===== Main Form Component =====
const SubmitComicForm = ({ signer, account, onSubmission, provider }) => {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userComics, setUserComics] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [selectedComic, setSelectedComic] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadMethod, setUploadMethod] = useState('multiple'); // 'multiple' or 'folder'

    const fetchUserComics = useCallback(async () => {
        if (!provider || !account) return;
        setIsLoadingHistory(true);
        try {
            const contract = new ethers.Contract(contractAddress, ComicManagementABI.abi, provider);
            const ids = await contract.getAllComicIds();
            const comicDetails = await Promise.all(ids.map(id => contract.comics(id)));
            const filteredComics = comicDetails
                .filter(c => c.submitter.toLowerCase() === account.toLowerCase())
                .map(c => ({
                    id: c.comicId.toNumber(),
                    title: c.title,
                    author: c.author,
                    description: c.description,
                    ipfsHash: c.ipfsHash,
                    status: StatusMap[c.status],
                    submitter: c.submitter,
                    reviewer: c.reviewer
                }));
            setUserComics(filteredComics);
        } catch (error) {
            console.error("Lỗi tải lịch sử truyện:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [provider, account]);

    useEffect(() => {
        if (provider && account) fetchUserComics();
    }, [provider, account, fetchUserComics]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
    };

    const handleFolderUpload = (e) => {
        const fileList = e.target.files;
        if (fileList.length > 0) {
            processFiles(Array.from(fileList));
        }
    };

    const processFiles = (fileList) => {
        const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        const validFiles = fileList.filter(file => imageTypes.includes(file.type));
        
        if (validFiles.length !== fileList.length) {
            alert(`Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP, BMP). Đã bỏ qua ${fileList.length - validFiles.length} file không hợp lệ.`);
        }
        
        if (validFiles.length === 0) {
            alert("Không có file ảnh hợp lệ nào được chọn.");
            return;
        }
        
        // Sort files naturally by name
        const sortedFiles = validFiles.sort((a, b) => {
            const getNumber = (filename) => {
                const match = filename.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };
            return getNumber(a.name) - getNumber(b.name);
        });
        
        setFiles(sortedFiles);
        alert(`Đã chọn ${sortedFiles.length} ảnh từ thư mục. Hãy kiểm tra thứ tự hiển thị bên dưới.`);
    };

    const removeFile = (index) => {
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    const clearAllFiles = () => {
        setFiles([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!signer || files.length === 0 || !title || !author) {
            alert("Vui lòng điền đầy đủ thông tin và chọn ít nhất một file ảnh.");
            return;
        }

        setIsSubmitting(true);
        try {
            const uploadedHashes = [];
            
            for (const file of files) {
                const added = await ipfsClient.add(file);
                uploadedHashes.push(added.path);
            }

            const combinedHash = uploadedHashes.join("|");
            const contract = new ethers.Contract(contractAddress, ComicManagementABI.abi, signer);
            const tx = await contract.submitComic(title, author, description || "Không có mô tả", combinedHash);
            await tx.wait();

            alert("✅ Nộp truyện thành công! Truyện đang chờ Admin duyệt.");
            setTitle(''); 
            setAuthor(''); 
            setDescription(''); 
            setFiles([]);
            fetchUserComics();
            if (onSubmission) onSubmission();
        } catch (error) {
            console.error("Lỗi khi nộp truyện:", error);
            alert("❌ Lỗi nộp truyện: " + (error.message || "Kiểm tra kết nối"));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Kiểm tra trình duyệt hỗ trợ chọn thư mục
    const isFolderSelectionSupported = () => {
        const input = document.createElement('input');
        input.type = 'file';
        return 'webkitdirectory' in input || 'directory' in input;
    };

    return (
        <div style={pageContainerStyle}>
            {selectedComic && (
                <ComicReader comic={selectedComic} onClose={() => setSelectedComic(null)} />
            )}

            {/* Submit Form */}
            <div style={formContainerStyle}>
                <div style={formHeaderStyle}>
                    <h2 style={formTitleStyle}>📖 Đăng tải truyện mới</h2>
                    <p style={formSubtitleStyle}>Tải lên truyện tranh của bạn và xuất bản trên blockchain</p>
                </div>

                <form onSubmit={handleSubmit} style={formStyle}>
                    <div style={inputGridStyle}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Tên truyện *</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                style={inputStyle}
                                placeholder="Nhập tên truyện..."
                                required
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Tác giả *</label>
                            <input 
                                type="text" 
                                value={author} 
                                onChange={(e) => setAuthor(e.target.value)} 
                                style={inputStyle}
                                placeholder="Nhập tên tác giả..."
                                required
                            />
                        </div>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Mô tả truyện</label>
                        <textarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            style={{...inputStyle, minHeight: '80px'}}
                            placeholder="Mô tả ngắn về nội dung truyện..."
                            rows="3"
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>
                            Trang truyện * 
                            <span style={hintStyle}> (Chọn nhiều file ảnh hoặc upload cả thư mục)</span>
                        </label>
                        
                        {/* Upload Method Selection */}
                        <div style={uploadMethodStyle}>
                            <label style={methodLabelStyle}>
                                <input
                                    type="radio"
                                    value="multiple"
                                    checked={uploadMethod === 'multiple'}
                                    onChange={(e) => setUploadMethod(e.target.value)}
                                    style={radioInputStyle}
                                />
                                <span style={methodTextStyle}>📄 Chọn nhiều file ảnh</span>
                            </label>
                            <label style={methodLabelStyle}>
                                <input
                                    type="radio"
                                    value="folder"
                                    checked={uploadMethod === 'folder'}
                                    onChange={(e) => setUploadMethod(e.target.value)}
                                    style={radioInputStyle}
                                    disabled={!isFolderSelectionSupported()}
                                />
                                <span style={methodTextStyle}>
                                    📁 Chọn thư mục 
                                    {!isFolderSelectionSupported() && (
                                        <span style={unsupportedStyle}> (Không hỗ trợ trên trình duyệt này)</span>
                                    )}
                                </span>
                            </label>
                        </div>

                        <div
                            style={dragAreaStyle(dragActive)}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {uploadMethod === 'multiple' ? (
                                <>
                                    <input
                                        type="file"
                                        id="file-upload"
                                        multiple
                                        onChange={handleFileChange}
                                        style={fileInputStyle}
                                        accept="image/*"
                                    />
                                    <label htmlFor="file-upload" style={dragLabelStyle}>
                                        <div style={dragIconStyle}>🖼️</div>
                                        <p style={dragTextStyle}>
                                            Kéo thả ảnh vào đây hoặc <span style={browseTextStyle}>chọn nhiều file ảnh</span>
                                        </p>
                                        <p style={fileHintStyle}>Hỗ trợ JPEG, PNG, GIF, WebP, BMP</p>
                                        <p style={fileHintStyle}>Giữ Ctrl/Shift để chọn nhiều file</p>
                                    </label>
                                </>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        id="folder-upload"
                                        {...(isFolderSelectionSupported() ? { webkitdirectory: "true", directory: "true" } : {})}
                                        multiple
                                        onChange={handleFolderUpload}
                                        style={fileInputStyle}
                                        accept="image/*"
                                    />
                                    <label htmlFor="folder-upload" style={dragLabelStyle}>
                                        <div style={dragIconStyle}>📁</div>
                                        <p style={dragTextStyle}>
                                            <span style={browseTextStyle}>Chọn thư mục chứa ảnh</span>
                                        </p>
                                        <p style={fileHintStyle}>Tất cả ảnh trong thư mục sẽ được chọn tự động</p>
                                        <p style={fileHintStyle}>
                                            {isFolderSelectionSupported() 
                                                ? "Trình duyệt của bạn hỗ trợ chọn thư mục" 
                                                : "Vui lòng sử dụng Chrome/Edge để chọn thư mục"}
                                        </p>
                                    </label>
                                </>
                            )}
                        </div>

                        <div style={uploadTipsStyle}>
                            <div style={tipItemStyle}>
                                <strong>💡 Cách 1 (Chọn nhiều file):</strong> Giữ Ctrl/Shift để chọn nhiều ảnh từ thư mục
                            </div>
                            <div style={tipItemStyle}>
                                <strong>💡 Cách 2 (Chọn thư mục):</strong> Chọn trực tiếp thư mục chứa ảnh (Chỉ hỗ trợ Chrome/Edge)
                            </div>
                            <div style={tipItemStyle}>
                                <strong>📝 Lưu ý:</strong> Các file sẽ được sắp xếp theo số trong tên file (ví dụ: 1.jpg, 2.jpg, ...)
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div style={fileListStyle}>
                                <div style={fileListHeaderStyle}>
                                    <h4 style={fileListTitleStyle}>
                                        📚 Đã chọn {files.length} trang (thứ tự hiển thị):
                                    </h4>
                                    <button 
                                        type="button"
                                        onClick={clearAllFiles}
                                        style={clearAllButtonStyle}
                                    >
                                        🗑️ Xóa tất cả
                                    </button>
                                </div>
                                <div style={fileItemsStyle}>
                                    {files.map((file, index) => (
                                        <div key={index} style={fileItemStyle}>
                                            <div style={filePreviewStyle}>
                                                <span style={fileNumberStyle}>{index + 1}</span>
                                                <img 
                                                    src={URL.createObjectURL(file)} 
                                                    alt={`Preview ${index + 1}`}
                                                    style={fileThumbnailStyle}
                                                    onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                                />
                                            </div>
                                            <span style={fileNameStyle}>
                                                {file.name}
                                            </span>
                                            <button 
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                style={removeButtonStyle}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        style={submitButtonStyle(isSubmitting)}
                    >
                        {isSubmitting ? (
                            <>
                                <div style={spinnerSmallStyle}></div>
                                Đang upload và ký giao dịch...
                            </>
                        ) : (
                            '📤 Đăng tải truyện lên blockchain'
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div style={historyContainerStyle}>
                <div style={historyHeaderStyle}>
                    <h3 style={historyTitleStyle}>📒 Truyện đã đăng tải</h3>
                    <button onClick={fetchUserComics} style={refreshButtonStyle}>
                        🔄 Làm mới
                    </button>
                </div>

                {isLoadingHistory ? (
                    <div style={loadingStateStyle}>
                        <div style={spinnerStyle}></div>
                        <p>Đang tải danh sách truyện...</p>
                    </div>
                ) : userComics.length === 0 ? (
                    <div style={emptyStateStyle}>
                        <div style={emptyIconStyle}>📭</div>
                        <p>Chưa có truyện nào được đăng tải</p>
                        <p style={emptySubtextStyle}>Hãy bắt đầu bằng cách đăng tải truyện đầu tiên của bạn!</p>
                    </div>
                ) : (
                    <div style={comicGridStyle}>
                        {userComics.map(comic => (
                            <ComicCard 
                                key={comic.id} 
                                comic={comic} 
                                onRead={() => setSelectedComic(comic)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmitComicForm;

// ===== STYLES =====
const PRIMARY = '#FF6B35';
const PRIMARY_HOVER = '#E55A2B';
const BACKGROUND = '#0f0f23';
const CARD_BG = '#1a1a2e';
const CARD_BG_LIGHT = '#2a2a3e';
const TEXT = '#ffffff';
const TEXT_MUTED = '#a0a0b0';
const BORDER = '#333346';
const SUCCESS = '#28a745';
const WARNING = '#ffc107';
const DANGER = '#dc3545';

// Upload Method Styles
const uploadMethodStyle = {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
    flexWrap: 'wrap'
};

const methodLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '10px 15px',
    backgroundColor: CARD_BG_LIGHT,
    borderRadius: '8px',
    border: `1px solid ${BORDER}`,
    transition: 'all 0.2s ease'
};

const methodTextStyle = {
    color: TEXT,
    fontSize: '14px'
};

const unsupportedStyle = {
    color: TEXT_MUTED,
    fontSize: '12px',
    fontStyle: 'italic'
};

const radioInputStyle = {
    margin: 0
};

const uploadTipsStyle = {
    background: 'rgba(255, 107, 53, 0.1)',
    border: '1px solid rgba(255, 107, 53, 0.3)',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '10px'
};

const tipItemStyle = {
    marginBottom: '8px',
    fontSize: '0.9rem',
    color: TEXT,
    lineHeight: '1.4'
};

// File List Styles
const fileListHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
};

const clearAllButtonStyle = {
    background: DANGER,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600'
};

const filePreviewStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
};

const fileThumbnailStyle = {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px'
};

const fileNumberStyle = {
    background: PRIMARY,
    color: 'white',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
};

const fileListStyle = {
    marginTop: '20px'
};

const fileListTitleStyle = {
    color: TEXT,
    fontSize: '16px',
    margin: 0
};

const fileItemsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
};

const fileItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: CARD_BG_LIGHT,
    borderRadius: '6px',
    border: `1px solid ${BORDER}`
};

const fileNameStyle = {
    color: TEXT,
    fontSize: '14px',
    flex: 1,
    marginLeft: '10px'
};

const removeButtonStyle = {
    background: DANGER,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '12px'
};

// Comic Card Styles
const comicCardStyle = {
    background: CARD_BG,
    borderRadius: '12px',
    overflow: 'hidden',
    border: `1px solid ${BORDER}`,
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
};

const comicCoverStyle = {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderBottom: `1px solid ${BORDER}`
};

const comicCardContentStyle = {
    padding: '15px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
};

const comicCardTitleStyle = {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: TEXT,
    marginBottom: '8px',
    lineHeight: '1.3'
};

const comicCardAuthorStyle = {
    fontSize: '0.9rem',
    color: TEXT_MUTED,
    marginBottom: '10px'
};

const comicCardDescStyle = {
    fontSize: '0.8rem',
    color: TEXT_MUTED,
    marginBottom: '15px',
    lineHeight: '1.4',
    flex: 1
};

const comicCardFooterStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto'
};

// Reader Styles
const readerOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
    overflow: 'auto'
};

const readerModalStyle = {
    minHeight: '100vh',
    backgroundColor: BACKGROUND,
    color: TEXT
};

const readerHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: `1px solid ${BORDER}`,
    backgroundColor: CARD_BG
};

const readerTitleStyle = {
    flex: 1
};

const readerSubtitleStyle = {
    color: TEXT_MUTED,
    margin: 0,
    fontSize: '14px'
};

const readerControlsStyle = {
    display: 'flex',
    gap: '10px'
};

const readerContentStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
};

const mainPageContainerStyle = {
    marginBottom: '30px'
};

const pageNavigationStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '15px'
};

const currentPageContainerStyle = {
    flex: 1,
    textAlign: 'center',
    maxWidth: '900px'
};

const comicPageStyle = {
    maxWidth: '100%',
    maxHeight: '70vh',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
};

const pageNavButtonStyle = {
    padding: '15px 20px',
    fontSize: '20px',
    backgroundColor: PRIMARY,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    minWidth: '60px'
};

const pageInfoStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 10px',
    color: TEXT_MUTED
};

const thumbnailSectionStyle = {
    borderTop: `1px solid ${BORDER}`,
    paddingTop: '20px'
};

const thumbnailTitleStyle = {
    margin: '0 0 15px 0',
    color: TEXT_MUTED,
    fontSize: '16px'
};

const thumbnailContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '10px'
};

const thumbnailStyle = (isActive) => ({
    position: 'relative',
    borderRadius: '6px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: `2px solid ${isActive ? PRIMARY : 'transparent'}`,
    opacity: isActive ? 1 : 0.7,
    transition: 'all 0.2s ease'
});

const thumbnailImageStyle = {
    width: '100%',
    height: '60px',
    objectFit: 'cover'
};

const thumbnailNumberStyle = {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    fontSize: '10px',
    padding: '1px 4px',
    borderRadius: '3px'
};

// Fullscreen Styles
const fullscreenStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 2000
};

const fullscreenControlsStyle = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2001
};

const fullscreenImageContainerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
};

const fullscreenImageStyle = {
    maxWidth: '95%',
    maxHeight: '95%',
    objectFit: 'contain'
};

const fullscreenNavStyle = {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '20px',
    zIndex: 2001
};

// Common Component Styles
const controlButtonStyle = {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: TEXT,
    border: `1px solid ${BORDER}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
};

const smallControlButtonStyle = {
    padding: '4px 8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: TEXT,
    border: `1px solid ${BORDER}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
};

const closeReaderButtonStyle = {
    padding: '8px 16px',
    backgroundColor: DANGER,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
};

const navButtonStyle = {
    padding: '10px 20px',
    backgroundColor: PRIMARY,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
};

const pageIndicatorStyle = {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold'
};

// Main App Styles
const pageContainerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box'
};

const formContainerStyle = {
    background: CARD_BG,
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '30px',
    border: `1px solid ${BORDER}`
};

const formHeaderStyle = {
    textAlign: 'center',
    marginBottom: '30px'
};

const formTitleStyle = {
    color: TEXT,
    fontSize: '28px',
    margin: '0 0 8px 0'
};

const formSubtitleStyle = {
    color: TEXT_MUTED,
    fontSize: '16px',
    margin: 0
};

const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
};

const inputGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
};

const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const labelStyle = {
    color: TEXT,
    fontWeight: '600',
    fontSize: '14px'
};

const hintStyle = {
    color: TEXT_MUTED,
    fontWeight: 'normal',
    fontSize: '12px'
};

const inputStyle = {
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${BORDER}`,
    background: CARD_BG_LIGHT,
    color: TEXT,
    fontSize: '14px',
    fontFamily: 'inherit'
};

// File Upload Styles
const dragAreaStyle = (isActive) => ({
    border: `2px dashed ${isActive ? PRIMARY : BORDER}`,
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: isActive ? 'rgba(255,107,53,0.1)' : CARD_BG_LIGHT,
    transition: 'all 0.3s ease',
    cursor: 'pointer'
});

const fileInputStyle = {
    display: 'none'
};

const dragLabelStyle = {
    cursor: 'pointer'
};

const dragIconStyle = {
    fontSize: '48px',
    marginBottom: '10px'
};

const dragTextStyle = {
    color: TEXT,
    fontSize: '16px',
    margin: '0 0 8px 0'
};

const browseTextStyle = {
    color: PRIMARY,
    textDecoration: 'underline'
};

const fileHintStyle = {
    color: TEXT_MUTED,
    fontSize: '14px',
    margin: 0
};

// Button Styles
const submitButtonStyle = (loading) => ({
    padding: '15px',
    backgroundColor: loading ? TEXT_MUTED : PRIMARY,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.2s'
});

const refreshButtonStyle = {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: TEXT,
    border: `1px solid ${BORDER}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
};

// History Styles
const historyContainerStyle = {
    background: CARD_BG,
    borderRadius: '12px',
    padding: '30px',
    border: `1px solid ${BORDER}`
};

const historyHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
};

const historyTitleStyle = {
    color: TEXT,
    fontSize: '24px',
    margin: 0
};

const comicGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
};

// Status Badge
const statusBadgeStyle = (status) => ({
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: 
        status === 'ĐÃ DUYỆT' ? 'rgba(40,167,69,0.2)' :
        status === 'BỊ TỪ CHỐI' ? 'rgba(220,53,69,0.2)' :
        'rgba(255,193,7,0.2)',
    color: 
        status === 'ĐÃ DUYỆT' ? '#28a745' :
        status === 'BỊ TỪ CHỐI' ? '#dc3545' :
        '#ffc107'
});

const comicIdStyle = {
    color: TEXT_MUTED,
    fontSize: '12px'
};

// Loading States
const loadingStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px',
    color: TEXT
};

const loadingStateStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px',
    color: TEXT
};

const spinnerStyle = {
    width: '40px',
    height: '40px',
    border: `4px solid ${BORDER}`,
    borderLeft: `4px solid ${PRIMARY}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
};

const spinnerSmallStyle = {
    width: '16px',
    height: '16px',
    border: `2px solid rgba(255,255,255,0.3)`,
    borderLeft: `2px solid white`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
};

const emptyStateStyle = {
    textAlign: 'center',
    padding: '60px 20px',
    color: TEXT_MUTED
};

const emptyIconStyle = {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5
};

const emptySubtextStyle = {
    fontSize: '14px',
    marginTop: '8px'
};

const noPagesStyle = {
    textAlign: 'center',
    padding: '40px 20px',
    color: TEXT_MUTED
};

const ipfsLinkStyle = {
    marginTop: '10px'
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    input:focus, textarea:focus {
        border-color: ${PRIMARY} !important;
        outline: none;
    }
    
    button:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
    }
    
    .comic-card:hover {
        transform: translateY(-2px);
    }
`;

// Thêm vào cuối file, trong phần CSS
const globalStyles = document.createElement('style');
globalStyles.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    input:focus, textarea:focus {
        border-color: ${PRIMARY} !important;
        outline: none;
    }
    
    button:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
    }
    
    .comic-card:hover {
        transform: translateY(-2px);
    }
    
    /* Thêm styles để căn giữa toàn bộ ứng dụng */
    body {
        margin: 0;
        padding: 0;
        background-color: ${BACKGROUND};
        display: flex;
        justify-content: center;
        min-height: 100vh;
    }
    
    #root {
        width: 100%;
        max-width: 1200px;
    }
`;
document.head.appendChild(globalStyles);
document.head.appendChild(style);