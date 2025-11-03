// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ScoreNFT - A privacy-preserving quiz scoring system with NFT generation
/// @notice This contract uses FHEVM to encrypt student scores and mint NFTs
contract ScoreNFT is SepoliaConfig, ERC721URIStorage, Ownable {
    // Token ID counter
    uint256 private _tokenIdCounter;
    
    // Pass threshold (60 points) - will be created as encrypted value when needed
    uint32 private constant PASS_THRESHOLD_VALUE = 60;
    
    // Mapping from token ID to encrypted score
    mapping(uint256 => euint32) private _encryptedScores;
    
    // Mapping from token ID to quiz subject
    mapping(uint256 => string) private _quizSubjects;
    
    // Mapping from token ID to encrypted pass status (ebool)
    mapping(uint256 => ebool) private _encryptedPassStatus;
    
    // Mapping from student address to array of token IDs
    mapping(address => uint256[]) private _studentTokens;
    
    // Quiz Bank structures
    struct Question {
        string question;
        string[] options;
        uint8 correctAnswer; // Index of correct answer (0-based)
    }
    
    struct QuizBank {
        uint256 id;
        string subject;
        Question[] questions;
        address creator;
        uint256 createdAt;
    }
    
    // Quiz bank counter
    uint256 private _quizBankCounter = 1; // Start from 1, 0 is reserved for default
    
    // Mapping from quiz bank ID to quiz bank
    mapping(uint256 => QuizBank) private _quizBanks;
    
    // Mapping to check if quiz bank exists
    mapping(uint256 => bool) private _quizBankExists;
    
    // Events
    event ScoreRecorded(
        address indexed student,
        uint256 indexed tokenId,
        string subject,
        bool passed
    );
    
    event NFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI
    );
    
    event QuizBankCreated(
        address indexed creator,
        uint256 indexed quizBankId,
        string subject,
        uint256 questionCount
    );
    
    constructor() ERC721("ScoreNFT", "SCORE") Ownable(msg.sender) {
        // Initialize default quiz bank (id = 0)
        QuizBank storage defaultQuizBank = _quizBanks[0];
        defaultQuizBank.id = 0;
        defaultQuizBank.subject = "Blockchain Fundamentals";
        defaultQuizBank.creator = msg.sender;
        defaultQuizBank.createdAt = block.timestamp;
        
        // Question 1
        Question storage q1 = defaultQuizBank.questions.push();
        q1.question = "What is the main purpose of a blockchain?";
        q1.options.push("To store data");
        q1.options.push("To create a decentralized ledger");
        q1.options.push("To mine cryptocurrency");
        q1.options.push("To run smart contracts");
        q1.correctAnswer = 1;
        
        // Question 2
        Question storage q2 = defaultQuizBank.questions.push();
        q2.question = "What does FHE stand for in FHEVM?";
        q2.options.push("Fully Homomorphic Encryption");
        q2.options.push("Fast Hash Encryption");
        q2.options.push("Federated Hash Exchange");
        q2.options.push("Full Hash Encryption");
        q2.correctAnswer = 0;
        
        // Question 3
        Question storage q3 = defaultQuizBank.questions.push();
        q3.question = "What is an NFT?";
        q3.options.push("Non-Fungible Token");
        q3.options.push("Network File Transfer");
        q3.options.push("New File Type");
        q3.options.push("Network Function Test");
        q3.correctAnswer = 0;
        
        // Question 4
        Question storage q4 = defaultQuizBank.questions.push();
        q4.question = "What is the pass threshold for this quiz?";
        q4.options.push("50 points");
        q4.options.push("60 points");
        q4.options.push("70 points");
        q4.options.push("80 points");
        q4.correctAnswer = 1;
        
        // Question 5
        Question storage q5 = defaultQuizBank.questions.push();
        q5.question = "Which technology does ScoreNFT use for privacy?";
        q5.options.push("AES encryption");
        q5.options.push("RSA encryption");
        q5.options.push("FHEVM (Fully Homomorphic Encryption)");
        q5.options.push("SHA-256 hashing");
        q5.correctAnswer = 2;
        
        _quizBankExists[0] = true;
    }
    
    /// @notice Submit encrypted quiz score and mint NFT
    /// @param studentAddress The address of the student
    /// @param encryptedScore The encrypted score (0-100)
    /// @param proof The proof for the encrypted score
    /// @param subject The quiz subject name
    /// @param tokenURI The metadata URI for the NFT
    function submitScore(
        address studentAddress,
        externalEuint32 encryptedScore,
        bytes calldata proof,
        string calldata subject,
        string calldata tokenURI
    ) external {
        // Convert external encrypted score to internal euint32
        euint32 score = FHE.fromExternal(encryptedScore, proof);
        
        // Create encrypted threshold value for comparison
        euint32 threshold = FHE.asEuint32(PASS_THRESHOLD_VALUE);
        
        // Check if score >= 60 (pass threshold)
        // Using le(threshold, score) which is equivalent to score >= threshold
        // This returns an encrypted boolean (ebool) that can be decrypted by the student in the frontend
        ebool passedEncrypted = FHE.le(threshold, score);
        
        // Mint NFT
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Store encrypted score, subject, and encrypted pass status
        _encryptedScores[tokenId] = score;
        _quizSubjects[tokenId] = subject;
        _encryptedPassStatus[tokenId] = passedEncrypted;
        
        // Add token to student's list
        _studentTokens[studentAddress].push(tokenId);
        
        // Mint NFT to student
        _safeMint(studentAddress, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Allow contract to decrypt this score
        FHE.allowThis(score);
        // Allow student to decrypt their own score
        FHE.allow(score, studentAddress);
        
        // Allow contract to decrypt pass status
        FHE.allowThis(passedEncrypted);
        // Allow student to decrypt their own pass status
        FHE.allow(passedEncrypted, studentAddress);
        
        // Note: pass status is encrypted, so we emit false in the event as a placeholder
        // The actual value can be decrypted by the student in the frontend
        emit ScoreRecorded(studentAddress, tokenId, subject, false);
        emit NFTMinted(studentAddress, tokenId, tokenURI);
    }
    
    /// @notice Get encrypted score for a token ID
    /// @param tokenId The NFT token ID
    /// @return The encrypted score
    function getEncryptedScore(uint256 tokenId) external view returns (euint32) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _encryptedScores[tokenId];
    }
    
    /// @notice Get quiz subject for a token ID
    /// @param tokenId The NFT token ID
    /// @return The quiz subject
    function getQuizSubject(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _quizSubjects[tokenId];
    }
    
    /// @notice Get encrypted pass status for a token ID
    /// @param tokenId The NFT token ID
    /// @return The encrypted pass status (ebool) - can be decrypted by the student in frontend
    function getEncryptedPassStatus(uint256 tokenId) external view returns (ebool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _encryptedPassStatus[tokenId];
    }
    
    /// @notice Get all token IDs for a student
    /// @param studentAddress The address of the student
    /// @return Array of token IDs
    function getStudentTokens(address studentAddress) external view returns (uint256[] memory) {
        return _studentTokens[studentAddress];
    }
    
    /// @notice Get total number of NFTs minted
    /// @return The total supply
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /// @notice Get encrypted pass status for a specific quiz (requires ownership)
    /// @param studentAddress The address of the student
    /// @param tokenId The token ID to check
    /// @return The encrypted pass status (ebool) - can be decrypted by the student in frontend
    function getEncryptedPassStatusForStudent(address studentAddress, uint256 tokenId) external view returns (ebool) {
        require(_ownerOf(tokenId) == studentAddress, "Student does not own this token");
        return _encryptedPassStatus[tokenId];
    }
    
    /// @notice Create a new quiz bank
    /// @param subject The subject/title of the quiz bank
    /// @param questions Array of questions with their options and correct answers
    /// @return The ID of the created quiz bank
    function createQuizBank(
        string calldata subject,
        Question[] calldata questions
    ) external returns (uint256) {
        require(bytes(subject).length > 0, "Subject cannot be empty");
        require(questions.length > 0, "Quiz bank must have at least one question");
        
        uint256 quizBankId = _quizBankCounter;
        _quizBankCounter++;
        
        QuizBank storage newQuizBank = _quizBanks[quizBankId];
        newQuizBank.id = quizBankId;
        newQuizBank.subject = subject;
        newQuizBank.creator = msg.sender;
        newQuizBank.createdAt = block.timestamp;
        
        // Copy questions
        for (uint256 i = 0; i < questions.length; i++) {
            require(bytes(questions[i].question).length > 0, "Question text cannot be empty");
            require(questions[i].options.length >= 2, "Question must have at least 2 options");
            require(questions[i].correctAnswer < questions[i].options.length, "Correct answer index out of range");
            
            Question storage q = newQuizBank.questions.push();
            q.question = questions[i].question;
            // Copy options one by one
            for (uint256 j = 0; j < questions[i].options.length; j++) {
                q.options.push(questions[i].options[j]);
            }
            q.correctAnswer = questions[i].correctAnswer;
        }
        
        _quizBankExists[quizBankId] = true;
        
        emit QuizBankCreated(msg.sender, quizBankId, subject, questions.length);
        
        return quizBankId;
    }
    
    /// @notice Get a quiz bank by ID
    /// @param quizBankId The ID of the quiz bank
    /// @return subject The subject/title of the quiz bank
    /// @return questionCount The number of questions in the quiz bank
    /// @return creator The address of the creator
    /// @return createdAt The timestamp when the quiz bank was created
    function getQuizBankInfo(uint256 quizBankId) external view returns (
        string memory subject,
        uint256 questionCount,
        address creator,
        uint256 createdAt
    ) {
        require(_quizBankExists[quizBankId], "Quiz bank does not exist");
        QuizBank storage quizBank = _quizBanks[quizBankId];
        return (
            quizBank.subject,
            quizBank.questions.length,
            quizBank.creator,
            quizBank.createdAt
        );
    }
    
    /// @notice Get a question from a quiz bank
    /// @param quizBankId The ID of the quiz bank
    /// @param questionIndex The index of the question (0-based)
    /// @return question The question text
    /// @return options Array of answer options
    /// @return correctAnswer The index of the correct answer
    function getQuestion(
        uint256 quizBankId,
        uint256 questionIndex
    ) external view returns (
        string memory question,
        string[] memory options,
        uint8 correctAnswer
    ) {
        require(_quizBankExists[quizBankId], "Quiz bank does not exist");
        QuizBank storage quizBank = _quizBanks[quizBankId];
        require(questionIndex < quizBank.questions.length, "Question index out of range");
        
        Question storage q = quizBank.questions[questionIndex];
        return (q.question, q.options, q.correctAnswer);
    }
    
    /// @notice Get the number of questions in a quiz bank
    /// @param quizBankId The ID of the quiz bank
    /// @return The number of questions
    function getQuestionCount(uint256 quizBankId) external view returns (uint256) {
        require(_quizBankExists[quizBankId], "Quiz bank does not exist");
        return _quizBanks[quizBankId].questions.length;
    }
    
    /// @notice Check if a quiz bank exists
    /// @param quizBankId The ID of the quiz bank
    /// @return True if the quiz bank exists
    function quizBankExists(uint256 quizBankId) external view returns (bool) {
        return _quizBankExists[quizBankId];
    }
}

