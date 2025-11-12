"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { ScoreNFTAddresses } from "@/abi/ScoreNFTAddresses";
import { ScoreNFTABI } from "@/abi/ScoreNFTABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type ScoreNFTInfoType = {
  abi: typeof ScoreNFTABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

type NFTData = {
  tokenId: bigint;
  subject: string;
  encryptedPassStatusHandle: string | undefined;
  encryptedScoreHandle: string | undefined;
  decryptedPassStatus: ClearValueType | undefined;
  decryptedScore: ClearValueType | undefined;
};

function getScoreNFTByChainId(
  chainId: number | undefined
): ScoreNFTInfoType {
  if (!chainId) {
    return { abi: ScoreNFTABI.abi };
  }

  const entry =
    ScoreNFTAddresses[chainId.toString() as keyof typeof ScoreNFTAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: ScoreNFTABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: ScoreNFTABI.abi,
  };
}

export const useScoreNFT = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  // States
  const [studentTokens, setStudentTokens] = useState<bigint[]>([]);
  const [nftData, setNftData] = useState<Map<bigint, NFTData>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptingTokenId, setDecryptingTokenId] = useState<bigint | undefined>(undefined);
  const [message, setMessage] = useState<string>("");
  const [totalSupply, setTotalSupply] = useState<bigint | undefined>(undefined);

  const scoreNFTRef = useRef<ScoreNFTInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isSubmittingRef = useRef<boolean>(isSubmitting);
  const isDecryptingRef = useRef<boolean>(isDecrypting);

  // Contract info
  const scoreNFT = useMemo(() => {
    const c = getScoreNFTByChainId(chainId);
    scoreNFTRef.current = c;
    if (chainId !== undefined && !c.address) {
      setMessage(`ScoreNFT deployment not found for chainId=${chainId}.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!scoreNFT) {
      return undefined;
    }
    return (Boolean(scoreNFT.address) && scoreNFT.address !== ethers.ZeroAddress);
  }, [scoreNFT]);

  // Refresh student tokens and NFT data
  const refreshStudentTokens = useCallback(() => {
    if (isRefreshingRef.current || !ethersSigner) {
      return;
    }

    if (
      !scoreNFTRef.current ||
      !scoreNFTRef.current?.chainId ||
      !scoreNFTRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setStudentTokens([]);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = scoreNFTRef.current.chainId;
    const thisScoreNFTAddress = scoreNFTRef.current.address;
    const userAddress = ethersSigner.address;

    const thisScoreNFTContract = new ethers.Contract(
      thisScoreNFTAddress,
      scoreNFTRef.current.abi,
      ethersReadonlyProvider
    );

    Promise.all([
      thisScoreNFTContract.getStudentTokens(userAddress),
      thisScoreNFTContract.totalSupply(),
    ])
      .then(async ([tokenIds, supply]) => {
        if (
          sameChain.current(thisChainId) &&
          thisScoreNFTAddress === scoreNFTRef.current?.address
        ) {
          setStudentTokens(tokenIds);
          setTotalSupply(supply);

          // Fetch data for each NFT
          const nftDataMap = new Map<bigint, NFTData>();
          for (const tokenId of tokenIds) {
            try {
              const [subject, encryptedPassStatusHandle, encryptedScoreHandle] = await Promise.all([
                thisScoreNFTContract.getQuizSubject(tokenId),
                thisScoreNFTContract.getEncryptedPassStatus(tokenId),
                thisScoreNFTContract.getEncryptedScore(tokenId),
              ]);

              nftDataMap.set(tokenId, {
                tokenId,
                subject,
                encryptedPassStatusHandle: encryptedPassStatusHandle === ethers.ZeroHash ? undefined : encryptedPassStatusHandle,
                encryptedScoreHandle: encryptedScoreHandle === ethers.ZeroHash ? undefined : encryptedScoreHandle,
                decryptedPassStatus: undefined,
                decryptedScore: undefined,
              });
            } catch (e) {
              console.error(`Failed to fetch NFT data for token ${tokenId}:`, e);
            }
          }
          setNftData(nftDataMap);
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        setMessage("Failed to fetch student tokens! error=" + e);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, ethersSigner, sameChain]);

  useEffect(() => {
    refreshStudentTokens();
  }, [refreshStudentTokens]);

  // Submit encrypted score
  const canSubmitScore = useMemo(() => {
    return (
      scoreNFT.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isSubmitting
    );
  }, [scoreNFT.address, instance, ethersSigner, isRefreshing, isSubmitting]);

  const submitScore = useCallback(
    (score: number, subject: string, tokenURI: string) => {
      if (isRefreshingRef.current || isSubmittingRef.current) {
        return;
      }

      if (!scoreNFT.address || !instance || !ethersSigner) {
        return;
      }

      if (score < 0 || score > 100) {
        setMessage("Score must be between 0 and 100");
        return;
      }

      const thisChainId = chainId;
      const thisScoreNFTAddress = scoreNFT.address;
      const thisEthersSigner = ethersSigner;
      const thisScoreNFTContract = new ethers.Contract(
        thisScoreNFTAddress,
        scoreNFT.abi,
        thisEthersSigner
      );

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage(`Start submitting score ${score} for ${subject}...`);

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisScoreNFTAddress !== scoreNFTRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const input = instance.createEncryptedInput(
            thisScoreNFTAddress,
            thisEthersSigner.address
          );
          input.add32(score);

          const enc = await input.encrypt();

          if (isStale()) {
            setMessage(`Ignore submit score`);
            return;
          }

          setMessage(`Call submitScore...`);

          const tx: ethers.TransactionResponse =
            await thisScoreNFTContract.submitScore(
              thisEthersSigner.address,
              enc.handles[0],
              enc.inputProof,
              subject,
              tokenURI
            );

          setMessage(`Wait for tx:${tx.hash}...`);

          const receipt = await tx.wait();

          setMessage(`Submit score completed status=${receipt?.status}`);

          if (isStale()) {
            setMessage(`Ignore submit score`);
            return;
          }

          refreshStudentTokens();
        } catch (e) {
          setMessage(`Submit score failed! ${e}`);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      scoreNFT.address,
      scoreNFT.abi,
      instance,
      chainId,
      refreshStudentTokens,
      sameChain,
      sameSigner,
    ]
  );

  // Helper function to check if a token score can be decrypted
  const canDecryptToken = useCallback((tokenId: bigint) => {
    const nft = nftData.get(tokenId);
    return (
      scoreNFT.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      nft !== undefined &&
      nft.encryptedScoreHandle !== undefined &&
      nft.decryptedScore === undefined
    );
  }, [
    scoreNFT.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    nftData,
  ]);

  // Helper function to check if a token pass status can be decrypted
  const canDecryptPassStatus = useCallback((tokenId: bigint) => {
    const nft = nftData.get(tokenId);
    return (
      scoreNFT.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      nft !== undefined &&
      nft.encryptedPassStatusHandle !== undefined &&
      nft.decryptedPassStatus === undefined
    );
  }, [
    scoreNFT.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    nftData,
  ]);

  const decryptScore = useCallback(
    (tokenId: bigint) => {
      if (isRefreshingRef.current || isDecryptingRef.current) {
        return;
      }

      if (!scoreNFT.address || !instance || !ethersSigner) {
        return;
      }

      const nft = nftData.get(tokenId);
      if (!nft || !nft.encryptedScoreHandle) {
        setMessage("No encrypted score found for this NFT");
        return;
      }

      if (nft.decryptedScore) {
        setMessage("Score already decrypted");
        return;
      }

      const thisChainId = chainId;
      const thisScoreNFTAddress = scoreNFT.address;
      const thisScoreHandle = nft.encryptedScoreHandle;
      const thisTokenId = tokenId;
      const thisEthersSigner = ethersSigner;

      isDecryptingRef.current = true;
      setIsDecrypting(true);
      setDecryptingTokenId(tokenId);
      setMessage("Start decrypting score...");

      const run = async () => {
        const isStale = () =>
          thisScoreNFTAddress !== scoreNFTRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const sig: FhevmDecryptionSignature | null =
            await FhevmDecryptionSignature.loadOrSign(
              instance,
              [scoreNFT.address as `0x${string}`],
              ethersSigner,
              fhevmDecryptionSignatureStorage
            );

          if (!sig) {
            setMessage("Unable to build FHEVM decryption signature");
            return;
          }

          if (isStale()) {
            setMessage("Ignore FHEVM decryption");
            return;
          }

          setMessage("Call FHEVM userDecrypt...");

          const res = await instance.userDecrypt(
            [{ handle: thisScoreHandle, contractAddress: thisScoreNFTAddress }],
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          );

          setMessage("FHEVM userDecrypt completed!");

          if (isStale()) {
            setMessage("Ignore FHEVM decryption");
            return;
          }

          const decryptedValue: ClearValueType = {
            handle: thisScoreHandle,
            clear: res[thisScoreHandle],
          };

          // Update NFT data
          setNftData((currentNftData) => {
            const currentNft = currentNftData.get(thisTokenId);
            if (!currentNft) return currentNftData;
            const updatedNft = { ...currentNft, decryptedScore: decryptedValue };
            const updatedMap = new Map(currentNftData);
            updatedMap.set(thisTokenId, updatedNft);
            return updatedMap;
          });

          setMessage(`Score decrypted: ${decryptedValue.clear}`);
        } finally {
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          setDecryptingTokenId(undefined);
        }
      };

      run();
    },
    [
      fhevmDecryptionSignatureStorage,
      ethersSigner,
      scoreNFT.address,
      instance,
      chainId,
      nftData,
      sameChain,
      sameSigner,
    ]
  );

  const decryptPassStatus = useCallback(
    (tokenId: bigint) => {
      if (isRefreshingRef.current || isDecryptingRef.current) {
        return;
      }

      if (!scoreNFT.address || !instance || !ethersSigner) {
        return;
      }

      const nft = nftData.get(tokenId);
      if (!nft || !nft.encryptedPassStatusHandle) {
        setMessage("No encrypted pass status found for this NFT");
        return;
      }

      if (nft.decryptedPassStatus) {
        setMessage("Pass status already decrypted");
        return;
      }

      const thisChainId = chainId;
      const thisScoreNFTAddress = scoreNFT.address;
      const thisPassStatusHandle = nft.encryptedPassStatusHandle;
      const thisTokenId = tokenId;
      const thisEthersSigner = ethersSigner;

      isDecryptingRef.current = true;
      setIsDecrypting(true);
      setDecryptingTokenId(tokenId);
      setMessage("Start decrypting pass status...");

      const run = async () => {
        const isStale = () =>
          thisScoreNFTAddress !== scoreNFTRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const sig: FhevmDecryptionSignature | null =
            await FhevmDecryptionSignature.loadOrSign(
              instance,
              [scoreNFT.address as `0x${string}`],
              ethersSigner,
              fhevmDecryptionSignatureStorage
            );

          if (!sig) {
            setMessage("Unable to build FHEVM decryption signature");
            return;
          }

          if (isStale()) {
            setMessage("Ignore FHEVM decryption");
            return;
          }

          setMessage("Call FHEVM userDecrypt for pass status...");

          const res = await instance.userDecrypt(
            [{ handle: thisPassStatusHandle, contractAddress: thisScoreNFTAddress }],
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          );

          setMessage("FHEVM userDecrypt completed!");

          if (isStale()) {
            setMessage("Ignore FHEVM decryption");
            return;
          }

          const decryptedValue: ClearValueType = {
            handle: thisPassStatusHandle,
            clear: res[thisPassStatusHandle],
          };

          // Update NFT data
          setNftData((currentNftData) => {
            const currentNft = currentNftData.get(thisTokenId);
            if (!currentNft) return currentNftData;
            const updatedNft = { ...currentNft, decryptedPassStatus: decryptedValue };
            const updatedMap = new Map(currentNftData);
            updatedMap.set(thisTokenId, updatedNft);
            return updatedMap;
          });

          setMessage(`Pass status decrypted: ${decryptedValue.clear}`);
        } finally {
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          setDecryptingTokenId(undefined);
        }
      };

      run();
    },
    [
      fhevmDecryptionSignatureStorage,
      ethersSigner,
      scoreNFT.address,
      instance,
      chainId,
      nftData,
      sameChain,
      sameSigner,
    ]
  );

  // Create quiz bank
  const createQuizBank = useCallback(
    async (
      subject: string,
      questions: Array<{ question: string; options: string[]; correctAnswer: number }>
    ): Promise<bigint | undefined> => {
      if (!scoreNFT.address || !ethersSigner) {
        setMessage("Contract not available");
        return undefined;
      }

      const thisScoreNFTContract = new ethers.Contract(
        scoreNFT.address,
        scoreNFT.abi,
        ethersSigner
      );

      try {
        setMessage("Creating quiz bank...");
        const tx = await thisScoreNFTContract.createQuizBank(subject, questions);
        setMessage(`Waiting for transaction: ${tx.hash}...`);
        const receipt = await tx.wait();
        setMessage(`Quiz bank created! Transaction: ${receipt?.hash}`);

        // Get the quiz bank ID from the event
        const event = receipt?.logs?.find(
          (log: any) =>
            log.topics[0] === ethers.id("QuizBankCreated(address,uint256,string,uint256)")
        );
        if (event) {
          const decoded = thisScoreNFTContract.interface.parseLog(event);
          const quizBankId = decoded?.args[1] as bigint;
          return quizBankId;
        }
        return undefined;
      } catch (e) {
        setMessage(`Failed to create quiz bank: ${e}`);
        return undefined;
      }
    },
    [scoreNFT.address, scoreNFT.abi, ethersSigner]
  );

  // Get quiz bank info
  const getQuizBankInfo = useCallback(
    async (quizBankId: bigint) => {
      if (!scoreNFT.address || !ethersReadonlyProvider) {
        return undefined;
      }

      const thisScoreNFTContract = new ethers.Contract(
        scoreNFT.address,
        scoreNFT.abi,
        ethersReadonlyProvider
      );

      try {
        const [subject, questionCount, creator, createdAt] =
          await thisScoreNFTContract.getQuizBankInfo(quizBankId);
        return {
          subject,
          questionCount: Number(questionCount),
          creator,
          createdAt: Number(createdAt),
        };
      } catch (e) {
        console.error(`Failed to get quiz bank info: ${e}`);
        return undefined;
      }
    },
    [scoreNFT.address, scoreNFT.abi, ethersReadonlyProvider]
  );

  // Get all questions from a quiz bank
  const getQuizQuestions = useCallback(
    async (quizBankId: bigint) => {
      if (!scoreNFT.address || !ethersReadonlyProvider) {
        return undefined;
      }

      const thisScoreNFTContract = new ethers.Contract(
        scoreNFT.address,
        scoreNFT.abi,
        ethersReadonlyProvider
      );

      try {
        const questionCount = await thisScoreNFTContract.getQuestionCount(quizBankId);
        const count = Number(questionCount);
        const questions = [];

        for (let i = 0; i < count; i++) {
          const [question, options, correctAnswer] = await thisScoreNFTContract.getQuestion(
            quizBankId,
            i
          );
          questions.push({
            id: i + 1,
            question,
            options,
            correctAnswer: Number(correctAnswer),
          });
        }

        return questions;
      } catch (e) {
        console.error(`Failed to get quiz questions: ${e}`);
        return undefined;
      }
    },
    [scoreNFT.address, scoreNFT.abi, ethersReadonlyProvider]
  );

  // Check if quiz bank exists
  const checkQuizBankExists = useCallback(
    async (quizBankId: bigint): Promise<boolean> => {
      if (!scoreNFT.address || !ethersReadonlyProvider) {
        return false;
      }

      const thisScoreNFTContract = new ethers.Contract(
        scoreNFT.address,
        scoreNFT.abi,
        ethersReadonlyProvider
      );

      try {
        return await thisScoreNFTContract.quizBankExists(quizBankId);
      } catch (e) {
        console.error(`Failed to check quiz bank existence: ${e}`);
        return false;
      }
    },
    [scoreNFT.address, scoreNFT.abi, ethersReadonlyProvider]
  );

  return {
    contractAddress: scoreNFT.address,
    isDeployed,
    canSubmitScore,
    canDecryptToken,
    canDecryptPassStatus,
    submitScore,
    decryptScore,
    decryptPassStatus,
    refreshStudentTokens,
    message,
    studentTokens,
    nftData,
    totalSupply,
    isDecrypting,
    isRefreshing,
    isSubmitting,
    decryptingTokenId,
    // Quiz bank functions
    createQuizBank,
    getQuizBankInfo,
    getQuizQuestions,
    checkQuizBankExists,
  };
};

