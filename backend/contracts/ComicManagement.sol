// backend/contracts/ComicManagement.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ComicManagement {
    // 1. Enum trạng thái truyện tranh
    enum ComicStatus { PENDING, APPROVED, REJECTED }

    // 2. Struct lưu trữ thông tin truyện tranh
    struct Comic {
        uint256 comicId;
        string title;
        string author;
        string description;
        string ipfsHash;         // Hash IPFS của file truyện tranh
        ComicStatus status;
        address submitter;
        address reviewer;
    }

    // Mapping lưu truyện tranh theo ID
    mapping(uint256 => Comic) public comics;

    uint256 public nextComicId = 1;
    address public adminAddress;

    // Events
    event ComicSubmitted(uint256 comicId, address indexed submitter);
    event ComicReviewed(uint256 comicId, ComicStatus newStatus, address indexed reviewer);

    constructor(address _adminAddress) {
        adminAddress = _adminAddress;
    }

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "Only Admin can perform this action.");
        _;
    }

    // 3. Submit comic (User)
    function submitComic(
        string memory _title,
        string memory _author,
        string memory _description,
        string memory _ipfsHash
    ) public {
        uint256 id = nextComicId++;
        comics[id] = Comic(
            id,
            _title,
            _author,
            _description,
            _ipfsHash,
            ComicStatus.PENDING,
            msg.sender,
            address(0)
        );

        emit ComicSubmitted(id, msg.sender);
    }

    // 4. Review comic (Admin)
    function reviewComic(uint256 _comicId, ComicStatus _newStatus) public onlyAdmin {
        require(_comicId > 0 && _comicId < nextComicId, "Invalid Comic ID.");
        require(_newStatus == ComicStatus.APPROVED || _newStatus == ComicStatus.REJECTED, "Invalid Status.");

        Comic storage comic = comics[_comicId];
        require(comic.status == ComicStatus.PENDING, "Comic already reviewed.");

        comic.status = _newStatus;
        comic.reviewer = msg.sender;

        emit ComicReviewed(_comicId, _newStatus, msg.sender);
    }

    // 5. Lấy tất cả ID comics
    function getAllComicIds() public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](nextComicId - 1);
        for (uint256 i = 1; i < nextComicId; i++) {
            ids[i - 1] = i;
        }
        return ids;
    }
}
