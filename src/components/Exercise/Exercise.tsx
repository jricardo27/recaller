import { useState, useEffect, useCallback } from 'react';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useWordStore } from '../../stores/wordStore';
import type { ExerciseType, ExerciseDifficulty } from '../../types/exercise';
import { Trophy, X, Check, ArrowRight, RotateCcw, Image as ImageIcon } from 'lucide-react';

interface ExerciseProps {
  type: ExerciseType;
  difficulty?: ExerciseDifficulty;
  onFinish: () => void;
  onExit: () => void;
}

export function Exercise({ type, difficulty = 'medium', onFinish, onExit }: ExerciseProps) {
  const words = useWordStore(state => state.words);
  const session = useExerciseStore(state => state.session);
  const startSession = useExerciseStore(state => state.startSession);
  const answerQuestion = useExerciseStore(state => state.answerQuestion);
  const nextQuestion = useExerciseStore(state => state.nextQuestion);
  const skipQuestion = useExerciseStore(state => state.skipQuestion);
  const endSession = useExerciseStore(state => state.endSession);
  const getCurrentExercise = useExerciseStore(state => state.getCurrentExercise);
  const getProgress = useExerciseStore(state => state.getProgress);
  const getScore = useExerciseStore(state => state.getScore);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  // Triple-match: track hanzi and pinyin selections separately
  const [selectedHanzi, setSelectedHanzi] = useState<string | null>(null);
  const [selectedPinyin, setSelectedPinyin] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [autoContinue, setAutoContinue] = useState(() => {
    const saved = localStorage.getItem('autoContinue');
    return saved ? JSON.parse(saved) : true;
  });
  const [finalScore, setFinalScore] = useState<{correct: number; total: number; percentage: number; maxStreak: number; score: number} | null>(null);

  // Helper function to complete session - extracted to avoid duplication
  const completeSession = useCallback(() => {
    if (session) {
      setFinalScore({
        ...getScore(),
        maxStreak: session.maxStreak,
        score: session.score
      });
    }
    endSession();
    setSessionComplete(true);
  }, [session, getScore, endSession]);

  // Start session on mount
  useEffect(() => {
    if (!session) {
      startSession(type, words, difficulty);
    } else {
      endSession();
      startSession(type, words, difficulty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Check if session is complete
  useEffect(() => {
    if (session && session.currentIndex >= session.queue.length) {
      completeSession();
    }
  }, [session, completeSession]);

  // Reset state when exercise changes
  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
    setIsCorrect(false);
  }, [session?.currentIndex]);

  // Save autoContinue preference
  useEffect(() => {
    localStorage.setItem('autoContinue', JSON.stringify(autoContinue));
  }, [autoContinue]);

  // Auto-continue when result is shown
  useEffect(() => {
    if (showResult && autoContinue) {
      const timer = setTimeout(() => {
        handleNext();
      }, 1500); // 1.5 second delay
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, autoContinue]);

  const handleAnswer = (optionId: string) => {
    if (showResult) return;

    setSelectedOption(optionId);
    const result = answerQuestion(getCurrentExercise()?.id || '', optionId);
    setIsCorrect(result.correct);
    setShowResult(true);
  };

  // Triple-match: handle hanzi selection
  const handleHanziSelect = (hanziId: string) => {
    if (showResult) return;
    setSelectedHanzi(hanziId);
  };

  // Triple-match: handle pinyin selection
  const handlePinyinSelect = (pinyinId: string) => {
    if (showResult) return;
    setSelectedPinyin(pinyinId);
  };

  // Triple-match: submit answer when both selected
  const handleTripleMatchAnswer = () => {
    if (showResult || !selectedHanzi || !selectedPinyin) return;

    const exercise = getCurrentExercise();
    if (!exercise || !exercise.correctHanziAnswer || !exercise.correctPinyinAnswer) return;

    const hanziCorrect = selectedHanzi === exercise.correctHanziAnswer;
    const pinyinCorrect = selectedPinyin === exercise.correctPinyinAnswer;
    const bothCorrect = hanziCorrect && pinyinCorrect;

    setIsCorrect(bothCorrect);
    setShowResult(true);

    // Call store answer with combined result
    // Only pass the correct hanzi ID when BOTH hanzi and pinyin are correct
    // If either is wrong, pass a dummy value so store records it as incorrect
    answerQuestion(exercise.id, bothCorrect ? selectedHanzi : '__incorrect__');
  };

  const handleNext = () => {
    setSelectedOption(null);
    setSelectedHanzi(null);
    setSelectedPinyin(null);
    setShowResult(false);
    setIsCorrect(false);

    // Get fresh session from store to avoid stale closure issues
    const currentSession = useExerciseStore.getState().session;
    if (currentSession && currentSession.currentIndex >= currentSession.queue.length - 1) {
      completeSession();
    } else {
      nextQuestion();
    }
  };

  const handleSkip = () => {
    skipQuestion();
    setSelectedOption(null);
    setShowResult(false);
  };

  if (sessionComplete) {
    const score = finalScore || { correct: 0, total: 0, percentage: 0, maxStreak: 0, score: 0 };
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center max-w-md w-full">
          <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={48} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Exercise Complete!</h2>
          <p className="text-gray-500 mb-6">
            Great job completing the exercise session
          </p>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-3xl font-bold text-green-600">{score.correct}</div>
                <div className="text-xs text-gray-500">Correct</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-400">{score.total - score.correct}</div>
                <div className="text-xs text-gray-500">Incorrect</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{score.percentage}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              🔥 Max Streak: {score.maxStreak} · Score: {score.score}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSessionComplete(false);
                startSession(type, words, difficulty);
              }}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              Try Again
            </button>
            <button
              onClick={onFinish}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const exercise = getCurrentExercise();
  const progress = getProgress();

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading exercise...</p>
        </div>
      </div>
    );
  }

  const handleImageError = () => {
    setImageErrors(prev => ({ ...prev, [exercise.id]: true }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onExit}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ✕ Exit
          </button>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoContinue}
                onChange={(e) => setAutoContinue(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Auto-continue</span>
            </label>
            <span className="text-sm text-gray-500">
              {progress.current} / {progress.total}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Question type indicator */}
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-4 text-center">
            {exercise.type === 'image-to-hanzi' && '🖼️ Image to Word'}
            {exercise.type === 'hanzi-to-pinyin' && '📝 Hanzi to Pinyin'}
            {exercise.type === 'pinyin-to-hanzi' && '🔊 Pinyin to Hanzi'}
            {exercise.type === 'english-to-hanzi' && '🌐 English to Hanzi'}
            {exercise.type === 'hanzi-to-english' && '🇨🇳 Hanzi to English'}
            {exercise.type === 'triple-match' && '🎯 Triple Match (Expert)'}
          </div>

          {/* Question content */}
          <div className="text-center mb-8">
            {exercise.type === 'image-to-hanzi' && (
              <div className="mb-4">
                {exercise.questionData?.imageUrl && !imageErrors[exercise.id] ? (
                  <img
                    src={exercise.questionData.imageUrl}
                    alt="Question"
                    className="w-full h-48 object-cover rounded-xl"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <ImageIcon size={48} className="text-gray-400" />
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">Select the matching word</p>
              </div>
            )}

            {exercise.type === 'hanzi-to-pinyin' && (
              <div>
                <div className="text-7xl text-gray-800 mb-2 font-hanzi">{exercise.question}</div>
                <p className="text-gray-500">Select the correct pinyin</p>
              </div>
            )}

            {exercise.type === 'pinyin-to-hanzi' && (
              <div>
                <div className="text-7xl text-blue-600 mb-2 font-hanzi-sans">{exercise.question}</div>
                <p className="text-gray-500">Select the correct hanzi</p>
              </div>
            )}

            {exercise.type === 'english-to-hanzi' && (
              <div>
                <div className="text-2xl font-medium text-gray-800 mb-2">{exercise.question}</div>
                <p className="text-gray-500">Select the correct hanzi</p>
              </div>
            )}

            {exercise.type === 'hanzi-to-english' && (
              <div>
                <div className="text-5xl font-bold text-gray-800 mb-2">{exercise.question}</div>
                {exercise.questionData?.pinyin && (
                  <p className="text-lg text-blue-500 mb-2">{exercise.questionData.pinyin}</p>
                )}
                <p className="text-gray-500">Select the correct meaning</p>
              </div>
            )}

            {exercise.type === 'triple-match' && (
              <div className="mb-4">
                <div className="text-xl font-medium text-gray-800 mb-3">
                  {exercise.questionData?.english}
                </div>
                {exercise.questionData?.imageUrl && !imageErrors[exercise.id] ? (
                  <img
                    src={exercise.questionData.imageUrl}
                    alt="Question"
                    className="w-48 h-48 object-contain mx-auto rounded-lg"
                    onError={() => setImageErrors(prev => ({ ...prev, [exercise.id]: true }))}
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon size={48} className="text-gray-300" />
                  </div>
                )}
                <p className="text-gray-500 mt-3">Select BOTH hanzi AND pinyin</p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {exercise.type === 'triple-match' && exercise.hanziOptions && exercise.pinyinOptions ? (
              <div className="space-y-6">
                {/* Hanzi Options */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Select Hanzi:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {exercise.hanziOptions.map((option) => {
                      let buttonClass = 'p-4 rounded-xl border-2 text-center transition-all font-hanzi text-2xl ';

                      if (showResult) {
                        if (option.id === exercise.correctHanziAnswer) {
                          buttonClass += 'border-green-500 bg-green-50 text-green-700';
                        } else if (selectedHanzi === option.id && option.id !== exercise.correctHanziAnswer) {
                          buttonClass += 'border-red-500 bg-red-50 text-red-700';
                        } else {
                          buttonClass += 'border-gray-200 bg-white text-gray-500 opacity-50';
                        }
                      } else {
                        buttonClass += selectedHanzi === option.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50';
                      }

                      return (
                        <button
                          key={option.id}
                          onClick={() => handleHanziSelect(option.id)}
                          disabled={showResult}
                          className={buttonClass}
                        >
                          {option.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pinyin Options */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Select Pinyin:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {exercise.pinyinOptions.map((option) => {
                      let buttonClass = 'p-3 rounded-xl border-2 text-center transition-all ';

                      if (showResult) {
                        if (option.id === exercise.correctPinyinAnswer) {
                          buttonClass += 'border-green-500 bg-green-50 text-green-700';
                        } else if (selectedPinyin === option.id && option.id !== exercise.correctPinyinAnswer) {
                          buttonClass += 'border-red-500 bg-red-50 text-red-700';
                        } else {
                          buttonClass += 'border-gray-200 bg-white text-gray-500 opacity-50';
                        }
                      } else {
                        buttonClass += selectedPinyin === option.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50';
                      }

                      return (
                        <button
                          key={option.id}
                          onClick={() => handlePinyinSelect(option.id)}
                          disabled={showResult}
                          className={buttonClass}
                        >
                          {option.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              exercise.options.map((option) => {
              let buttonClass = 'w-full p-4 rounded-xl border-2 text-left transition-all ';

              // Only show result state if the selected option belongs to this exercise
              const selectedOptionBelongsToCurrentExercise = selectedOption && exercise.options.some(opt => opt.id === selectedOption);

              if (showResult && selectedOptionBelongsToCurrentExercise) {
                if (option.isCorrect) {
                  buttonClass += 'border-green-500 bg-green-50 text-green-700';
                } else if (selectedOption === option.id && !isCorrect) {
                  buttonClass += 'border-red-500 bg-red-50 text-red-700';
                } else {
                  buttonClass += 'border-gray-200 bg-white text-gray-500 opacity-50';
                }
              } else {
                buttonClass += selectedOption === option.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50';
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleAnswer(option.id)}
                  disabled={!!(showResult && selectedOptionBelongsToCurrentExercise)}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-3xl ${exercise.type === 'pinyin-to-hanzi' || exercise.type === 'hanzi-to-english' ? 'font-hanzi-sans' : ''}`}>{option.text}</div>
                      {option.subtext && (
                        <div className="text-sm text-gray-500 mt-1">{option.subtext}</div>
                      )}
                    </div>
                    {showResult && selectedOptionBelongsToCurrentExercise && option.isCorrect && (
                      <Check className="text-green-500" size={24} />
                    )}
                    {showResult && selectedOptionBelongsToCurrentExercise && selectedOption === option.id && !isCorrect && (
                      <X className="text-red-500" size={24} />
                    )}
                  </div>
                </button>
              );
            }))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!showResult ? (
            <>
              <button
                onClick={handleSkip}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  if (exercise.type === 'triple-match') {
                    handleTripleMatchAnswer();
                  } else if (selectedOption) {
                    handleAnswer(selectedOption);
                  }
                }}
                disabled={exercise.type === 'triple-match' ? (!selectedHanzi || !selectedPinyin) : !selectedOption}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Submit
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              {progress.current >= progress.total ? 'Finish' : 'Next Question'}
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        {/* Result feedback */}
        {showResult && (
          exercise.type === 'triple-match' || (selectedOption && exercise.options.some(opt => opt.id === selectedOption))
        ) && (
          <div className={`mt-4 p-4 rounded-xl text-center ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isCorrect ? (
              <div className="flex items-center justify-center gap-2">
                <Check size={20} />
                <span className="font-medium">
                  {exercise.type === 'triple-match' ? 'Perfect! Both hanzi and pinyin correct!' : 'Correct! Well done!'}
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <X size={20} />
                  <span className="font-medium">Incorrect</span>
                </div>
                <p className="text-sm opacity-80">
                  The correct answer was highlighted above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
