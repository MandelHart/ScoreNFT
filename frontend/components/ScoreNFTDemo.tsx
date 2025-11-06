"use client";

import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useScoreNFT, ClearValueType } from "@/hooks/useScoreNFT";
import { useState } from "react";

// Sample quiz questions
const SAMPLE_QUIZ = {
  subject: "Blockchain Fundamentals",
  questions: [
    {
      id: 1,
      question: "What is the main purpose of a blockchain?",
      options: ["To store data", "To create a decentralized ledger", "To mine cryptocurrency", "To run smart contracts"],
      correctAnswer: 1,
    },
    {
      id: 2,
      question: "What does FHE stand for in FHEVM?",
      options: ["Fully Homomorphic Encryption", "Fast Hash Encryption", "Federated Hash Exchange", "Full Hash Encryption"],
      correctAnswer: 0,
    },
    {
      id: 3,
      question: "What is an NFT?",
      options: ["Non-Fungible Token", "Network File Transfer", "New File Type", "Network Function Test"],
      correctAnswer: 0,
    },
    {
      id: 4,
      question: "What is the pass threshold for this quiz?",
      options: ["50 points", "60 points", "70 points", "80 points"],
      correctAnswer: 1,
    },
    {
      id: 5,
      question: "Which technology does ScoreNFT use for privacy?",
      options: ["AES encryption", "RSA encryption", "FHEVM (Fully Homomorphic Encryption)", "SHA-256 hashing"],
      correctAnswer: 2,
    },
  ],
};

export const ScoreNFTDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const scoreNFT = useScoreNFT({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [quizMode, setQuizMode] = useState<"quiz" | "results" | "nfts" | "create">("quiz");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | undefined>(undefined);
  const [subjectInput, setSubjectInput] = useState<string>("Blockchain Fundamentals");
  
  // Quiz bank search state
  const [quizBankIdInput, setQuizBankIdInput] = useState<string>("");
  const [currentQuizBankId, setCurrentQuizBankId] = useState<bigint | undefined>(undefined);
  const [currentQuiz, setCurrentQuiz] = useState<{ subject: string; questions: any[] } | undefined>(undefined);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);
  
  // Create quiz bank state
  const [createSubject, setCreateSubject] = useState<string>("");
  const [createQuestions, setCreateQuestions] = useState<Array<{ question: string; options: string[]; correctAnswer: number }>>([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 }
  ]);
  const [createdQuizBankId, setCreatedQuizBankId] = useState<bigint | undefined>(undefined);

  const buttonClass =
    "inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white shadow-lg " +
    "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 " +
    "transition-all duration-200 transform hover:scale-105 active:scale-95 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";

  const cardClass = "bg-white rounded-xl p-6 shadow-xl border-2 border-gray-200";

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to ScoreNFT</h2>
          <p className="text-gray-600 max-w-md">
            Connect your MetaMask wallet to start taking quizzes and minting your score NFTs
          </p>
        </div>
        <button className={buttonClass + " text-lg px-8 py-4"} onClick={connect}>
          Connect to MetaMask
        </button>
      </div>
    );
  }

  if (scoreNFT.isDeployed === false && chainId !== undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-red-600">Contract Not Deployed</h2>
          <p className="text-gray-600 max-w-md">
            The ScoreNFT contract is not deployed on the current network
          </p>
          <p className="text-sm text-gray-500 font-mono">Chain ID: {chainId}</p>
        </div>
      </div>
    );
  }

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const calculateScore = () => {
    if (!currentQuiz) return;
    let correct = 0;
    currentQuiz.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    const calculatedScore = Math.round((correct / currentQuiz.questions.length) * 100);
    setScore(calculatedScore);
    setQuizMode("results");
  };

  const handleSubmitScore = () => {
    if (score === undefined) return;
    const tokenURI = `https://score-nft.com/metadata/${Date.now()}`;
    // Use current quiz subject if available, otherwise use subjectInput
    const subject = currentQuiz?.subject || subjectInput;
    scoreNFT.submitScore(score, subject, tokenURI);
    setQuizMode("nfts");
    setAnswers({});
    setScore(undefined);
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className={cardClass}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ScoreNFT - Quiz Platform</h1>
            <p className="text-gray-600 mt-1">Privacy-preserving quiz scoring with NFT generation</p>
          </div>
          <div className="flex gap-3">
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                quizMode === "quiz"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => setQuizMode("quiz")}
            >
              Take Quiz
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                quizMode === "create"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => setQuizMode("create")}
            >
              Create Quiz Bank
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                quizMode === "nfts"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => {
                setQuizMode("nfts");
                scoreNFT.refreshStudentTokens();
              }}
            >
              My NFTs ({scoreNFT.studentTokens.length})
            </button>
          </div>
        </div>
      </div>

      {/* Status Info */}
      <div className={cardClass}>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Chain ID: </span>
            <span className="font-mono font-semibold">{chainId || "Unknown"}</span>
          </div>
          <div>
            <span className="text-gray-600">FHEVM Status: </span>
            <span className={`font-semibold ${fhevmStatus === "ready" ? "text-green-600" : "text-yellow-600"}`}>
              {fhevmStatus}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Contract: </span>
            <span className="font-mono text-xs">{scoreNFT.contractAddress || "Not deployed"}</span>
          </div>
        </div>
      </div>

      {/* Quiz Mode */}
      {quizMode === "quiz" && (
        <div className={cardClass}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Take Quiz</h2>
          {!currentQuiz ? (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">Enter a quiz bank ID to start:</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={quizBankIdInput}
                  onChange={(e) => setQuizBankIdInput(e.target.value)}
                  placeholder="Enter Quiz Bank ID (e.g., 0 for default)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  className={buttonClass}
                  onClick={async () => {
                    const id = BigInt(quizBankIdInput || "0");
                    setIsLoadingQuiz(true);
                    const exists = await scoreNFT.checkQuizBankExists(id);
                    if (exists) {
                      const info = await scoreNFT.getQuizBankInfo(id);
                      const questions = await scoreNFT.getQuizQuestions(id);
                      if (info && questions) {
                        setCurrentQuizBankId(id);
                        setCurrentQuiz({
                          subject: info.subject,
                          questions: questions,
                        });
                        setAnswers({});
                      }
                    } else {
                      scoreNFT.message = "Quiz bank not found";
                    }
                    setIsLoadingQuiz(false);
                  }}
                  disabled={isLoadingQuiz}
                >
                  {isLoadingQuiz ? "Loading..." : "Search"}
                </button>
              </div>
              {currentQuizBankId !== undefined && (
                <p className="text-sm text-gray-500">Quiz Bank ID: {currentQuizBankId.toString()}</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">{currentQuiz.subject}</h3>
                <button
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    setCurrentQuiz(undefined);
                    setCurrentQuizBankId(undefined);
                    setQuizBankIdInput("");
                    setAnswers({});
                  }}
                >
                  Search Another Quiz
                </button>
              </div>
              <div className="space-y-6">
                {currentQuiz.questions.map((q) => (
              <div key={q.id} className="border-b border-gray-200 pb-4">
                <p className="font-semibold text-gray-900 mb-3">
                  {q.id}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option: string, idx: number) => (
                    <label
                      key={idx}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        answers[q.id] === idx
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-gray-50 border-2 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        checked={answers[q.id] === idx}
                        onChange={() => handleAnswerSelect(q.id, idx)}
                        className="mr-3"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
                <div className="flex gap-3">
                  <button
                    className={buttonClass}
                    onClick={calculateScore}
                    disabled={Object.keys(answers).length !== currentQuiz.questions.length}
                  >
                    Submit Quiz
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Results Mode */}
      {quizMode === "results" && score !== undefined && (
        <div className={cardClass}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Results</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-lg font-semibold text-gray-700 mb-2">Your Score:</p>
              <p className="text-4xl font-bold text-blue-600">{score} / 100</p>
              <p className={`mt-2 font-semibold ${score >= 60 ? "text-green-600" : "text-red-600"}`}>
                {score >= 60 ? "✓ Passed" : "✗ Failed"} (Pass threshold: 60)
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quiz Subject:
              </label>
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quiz subject"
              />
            </div>
            <div className="flex gap-3">
              <button
                className={buttonClass}
                onClick={handleSubmitScore}
                disabled={!scoreNFT.canSubmitScore || scoreNFT.isSubmitting || !subjectInput}
              >
                {scoreNFT.isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit Score & Mint NFT"
                )}
              </button>
              <button
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                onClick={() => {
                  setQuizMode("quiz");
                  setAnswers({});
                  setScore(undefined);
                }}
              >
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFTs Mode */}
      {quizMode === "nfts" && (
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Score NFTs</h2>
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              onClick={scoreNFT.refreshStudentTokens}
              disabled={scoreNFT.isRefreshing}
            >
              {scoreNFT.isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {scoreNFT.studentTokens.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No NFTs found. Take a quiz to mint your first ScoreNFT!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from(scoreNFT.nftData.values()).map((nft) => {
                // Helper function to check if decrypted pass status is true
                const isPassed = (decryptedPassStatus: ClearValueType | undefined): boolean => {
                  if (!decryptedPassStatus) return false;
                  const value = decryptedPassStatus.clear;
                  if (typeof value === "boolean") return value;
                  if (typeof value === "string") return value === "true" || value === "1";
                  if (typeof value === "bigint") return value !== BigInt(0);
                  return false;
                };
                const passed = isPassed(nft.decryptedPassStatus);

                return (
                <div key={nft.tokenId.toString()} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Token ID</p>
                      <p className="font-mono font-semibold text-gray-900">#{nft.tokenId.toString()}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        nft.decryptedPassStatus
                          ? passed
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {nft.decryptedPassStatus
                        ? passed
                          ? "Passed"
                          : "Failed"
                        : "Encrypted"}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Subject</p>
                      <p className="font-semibold text-gray-900">{nft.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Encrypted Score</p>
                      <p className="font-mono text-xs text-gray-600">
                        {nft.encryptedScoreHandle
                          ? `${nft.encryptedScoreHandle.substring(0, 20)}...`
                          : "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Decrypted Score</p>
                      <p className="font-bold text-lg text-blue-600">
                        {nft.decryptedScore
                          ? `${nft.decryptedScore.clear} / 100`
                          : "••••••"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pass Status</p>
                      <p className="font-semibold text-gray-900">
                        {nft.decryptedPassStatus
                          ? passed
                            ? "✓ Passed"
                            : "✗ Failed"
                          : "Encrypted (Decrypt to view)"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      className={buttonClass + " w-full"}
                      onClick={() => scoreNFT.decryptScore(nft.tokenId)}
                      disabled={
                        !scoreNFT.canDecryptToken(nft.tokenId) ||
                        scoreNFT.isDecrypting ||
                        scoreNFT.decryptingTokenId === nft.tokenId ||
                        !!nft.decryptedScore ||
                        !nft.encryptedScoreHandle
                      }
                    >
                      {scoreNFT.isDecrypting && scoreNFT.decryptingTokenId === nft.tokenId ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Decrypting...
                        </>
                      ) : nft.decryptedScore ? (
                        "✓ Score Decrypted"
                      ) : (
                        "Decrypt Score"
                      )}
                    </button>
                    <button
                      className={buttonClass + " w-full"}
                      onClick={() => scoreNFT.decryptPassStatus(nft.tokenId)}
                      disabled={
                        !scoreNFT.canDecryptPassStatus(nft.tokenId) ||
                        scoreNFT.isDecrypting ||
                        scoreNFT.decryptingTokenId === nft.tokenId ||
                        !!nft.decryptedPassStatus ||
                        !nft.encryptedPassStatusHandle
                      }
                    >
                      {scoreNFT.isDecrypting && scoreNFT.decryptingTokenId === nft.tokenId ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Decrypting...
                        </>
                      ) : nft.decryptedPassStatus ? (
                        "✓ Pass Status Decrypted"
                      ) : (
                        "Decrypt Pass Status"
                      )}
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Quiz Bank Mode */}
      {quizMode === "create" && (
        <div className={cardClass}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Quiz Bank</h2>
          {createdQuizBankId !== undefined ? (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-green-800 mb-2">Quiz Bank Created Successfully!</h3>
                <p className="text-lg font-semibold text-gray-900">
                  Quiz Bank ID: <span className="font-mono text-blue-600">{createdQuizBankId.toString()}</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">Save this ID to use this quiz bank later.</p>
              </div>
              <button
                className={buttonClass}
                onClick={() => {
                  setCreatedQuizBankId(undefined);
                  setCreateSubject("");
                  setCreateQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
                }}
              >
                Create Another Quiz Bank
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quiz Subject/Title:
                </label>
                <input
                  type="text"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  placeholder="e.g., Blockchain Fundamentals"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold text-gray-700">Questions:</label>
                  <button
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    onClick={() => {
                      setCreateQuestions([...createQuestions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
                    }}
                  >
                    + Add Question
                  </button>
                </div>
                
                <div className="space-y-6">
                  {createQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-900">Question {qIdx + 1}</h4>
                        {createQuestions.length > 1 && (
                          <button
                            className="text-sm text-red-600 hover:text-red-800"
                            onClick={() => {
                              setCreateQuestions(createQuestions.filter((_, idx) => idx !== qIdx));
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Question Text:
                        </label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...createQuestions];
                            updated[qIdx].question = e.target.value;
                            setCreateQuestions(updated);
                          }}
                          placeholder="Enter question text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Options:
                        </label>
                        {q.options.map((option, optIdx) => (
                          <div key={optIdx} className="mb-2 flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={q.correctAnswer === optIdx}
                              onChange={() => {
                                const updated = [...createQuestions];
                                updated[qIdx].correctAnswer = optIdx;
                                setCreateQuestions(updated);
                              }}
                              className="mr-2"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const updated = [...createQuestions];
                                updated[qIdx].options[optIdx] = e.target.value;
                                setCreateQuestions(updated);
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                className={buttonClass + " w-full"}
                onClick={async () => {
                  if (!createSubject.trim()) {
                    scoreNFT.message = "Please enter a subject";
                    return;
                  }
                  if (createQuestions.some(q => !q.question.trim() || q.options.some(opt => !opt.trim()))) {
                    scoreNFT.message = "Please fill in all questions and options";
                    return;
                  }
                  
                  const quizBankId = await scoreNFT.createQuizBank(createSubject, createQuestions);
                  if (quizBankId !== undefined) {
                    setCreatedQuizBankId(quizBankId);
                  }
                }}
                disabled={scoreNFT.isSubmitting || !createSubject.trim()}
              >
                {scoreNFT.isSubmitting ? "Creating..." : "Create Quiz Bank"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message Display */}
      {scoreNFT.message && (
        <div className={cardClass + " bg-blue-50 border-blue-200"}>
          <p className="text-blue-800">{scoreNFT.message}</p>
        </div>
      )}
    </div>
  );
};

