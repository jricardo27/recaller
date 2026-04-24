import { useEffect, useState } from 'react';
import { useWordStore } from '../../stores/wordStore';
import { Flashcard } from '../Flashcard/Flashcard';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { config } from '../../config/env';

interface StudyProps {
  onFinish: () => void;
  onExit: () => void;
}

export function Study({ onFinish, onExit }: StudyProps) {
  const session = useWordStore(state => state.session);
  const getSessionWord = useWordStore(state => state.getSessionWord);
  const rateCard = useWordStore(state => state.rateCard);
  const startSession = useWordStore(state => state.startSession);

  const [currentWord, setCurrentWord] = useState(getSessionWord());
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [sessionComplete, setSessionComplete] = useState(false);

  // Start session on mount
  useEffect(() => {
    if (!session) {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update current word when session changes
  useEffect(() => {
    const word = getSessionWord();
    if (word) {
      setCurrentWord(word);
      loadImage(word);
    } else if (session && session.currentIndex >= session.queue.length) {
      setSessionComplete(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentIndex]);

  const loadImage = async (word: NonNullable<typeof currentWord>) => {
    if (!config.unsplashKey) {
      setImageUrl(undefined);
      return;
    }

    try {
      const query = word.translation || word.hanzi;
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`,
        {
          headers: {
            Authorization: `Client-ID ${config.unsplashKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setImageUrl(data.results[0].urls?.small);
        }
      }
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  };

  const handleRate = (quality: number) => {
    if (currentWord) {
      rateCard(currentWord.id, quality);
    }
  };

  const handleSkip = () => {
    // Move to end of queue
    if (session && currentWord) {
      session.queue.push(currentWord.id);
      session.currentIndex++;
    }
  };

  if (sessionComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={48} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Session Complete!</h2>
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {session?.stats.correct || 0}
                </div>
                <div className="text-sm text-gray-500">Correct</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600">
                  {session?.stats.incorrect || 0}
                </div>
                <div className="text-sm text-gray-500">Needs Review</div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                startSession();
                setSessionComplete(false);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <RotateCcw size={20} />
              Continue Studying
            </button>
            <button
              onClick={onFinish}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition flex items-center gap-2"
            >
              <Home size={20} />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const progress = session
    ? ((session.currentIndex / session.queue.length) * 100)
    : 0;

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="max-w-md mx-auto mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onExit}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ✕ Exit
          </button>
          <span className="text-sm text-gray-500">
            {session?.currentIndex || 0} / {session?.queue.length || 0}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <Flashcard
        key={currentWord.id}
        word={currentWord}
        onRate={handleRate}
        onSkip={handleSkip}
        imageUrl={imageUrl}
      />
    </div>
  );
}
