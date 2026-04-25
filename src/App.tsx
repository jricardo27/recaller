import { useState, useEffect } from 'react';
import { Study } from './components/Study/Study';
import { WordManager } from './components/WordManager/WordManager';
import { Stats } from './components/Stats/Stats';
import { Exercise } from './components/Exercise/Exercise';
import { useWordStore } from './stores/wordStore';
import { useExerciseStore } from './stores/exerciseStore';
import type { WordsDatabase } from './types';
import type { ExerciseType, ExerciseDifficulty } from './types/exercise';
import { Play, Settings, BarChart3, BookOpen, Brain, Image, Type, ArrowRightLeft, Globe, Languages, ChevronRight } from 'lucide-react';

type View = 'home' | 'study' | 'words' | 'stats' | 'exercise';

const exerciseTypes: {
  type: ExerciseType;
  title: string;
  description: string;
  icon: typeof Image;
  color: string;
}[] = [
  {
    type: 'image-to-hanzi',
    title: 'Image to Word',
    description: 'See an image, select the matching hanzi',
    icon: Image,
    color: 'from-purple-500 to-pink-500',
  },
  {
    type: 'hanzi-to-pinyin',
    title: 'Hanzi to Pinyin',
    description: 'See hanzi, select the correct pinyin',
    icon: Type,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'pinyin-to-hanzi',
    title: 'Pinyin to Hanzi',
    description: 'Hear/see pinyin, select the matching hanzi',
    icon: ArrowRightLeft,
    color: 'from-green-500 to-emerald-500',
  },
  {
    type: 'english-to-hanzi',
    title: 'English to Hanzi',
    description: 'See English, select the correct hanzi/pinyin',
    icon: Globe,
    color: 'from-orange-500 to-red-500',
  },
  {
    type: 'hanzi-to-english',
    title: 'Hanzi to English',
    description: 'See hanzi, select the English meaning',
    icon: Languages,
    color: 'from-indigo-500 to-purple-500',
  },
];

function App() {
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<{ version: string; count: number } | null>(null);
  const [exerciseConfig, setExerciseConfig] = useState<{ type: ExerciseType; difficulty: ExerciseDifficulty } | null>(null);

  const stats = useWordStore(state => state.getStats());
  const words = useWordStore(state => state.words);
  const loadWords = useWordStore(state => state.loadWords);
  const exerciseStats = useExerciseStore(state => state.stats);
  const endSession = useExerciseStore(state => state.endSession);

  // Load words from JSON on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/src/data/words.json');
        if (!response.ok) {
          throw new Error('Failed to load words database');
        }

        const data: WordsDatabase = await response.json();
        setDbInfo({ version: data.version, count: data.wordCount });

        // Only load if we don't have words yet
        if (words.length === 0) {
          loadWords(data.words);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading words...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (view === 'study') {
    return (
      <Study
        onFinish={() => setView('home')}
        onExit={() => setView('home')}
      />
    );
  }

  if (view === 'words') {
    return (
      <div className="min-h-screen bg-gray-50">
        <WordManager />
        <div className="fixed bottom-4 left-4 right-4">
          <button
            onClick={() => setView('home')}
            className="w-full py-3 bg-white shadow-lg rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (view === 'stats') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Stats />
        <div className="fixed bottom-4 left-4 right-4">
          <button
            onClick={() => setView('home')}
            className="w-full py-3 bg-white shadow-lg rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (view === 'exercise' && exerciseConfig) {
    return (
      <Exercise
        key={exerciseConfig.type}
        type={exerciseConfig.type}
        difficulty={exerciseConfig.difficulty}
        onFinish={() => {
          endSession();
          setExerciseConfig(null);
          setView('home');
        }}
        onExit={() => {
          endSession();
          setExerciseConfig(null);
          setView('home');
        }}
      />
    );
  }

  // Home view
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Brain size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Hanzi Recall</h1>
          <p className="text-sm text-gray-500 mt-1">
            Spaced repetition for Mandarin
          </p>
          {dbInfo && (
            <p className="text-xs text-gray-400 mt-2">
              Database v{dbInfo.version} · {dbInfo.count} words
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white p-3 rounded-xl shadow-sm text-center">
            <div className="text-xl font-bold text-green-600">{stats.new}</div>
            <div className="text-xs text-gray-500">New</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center">
            <div className="text-xl font-bold text-red-600">{stats.due}</div>
            <div className="text-xs text-gray-500">Due</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center">
            <div className="text-xl font-bold text-yellow-600">{stats.mastered}</div>
            <div className="text-xs text-gray-500">Mastered</div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setView('study')}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3"
          >
            <Play size={24} />
            Start Studying
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setView('words')}
              className="py-3 bg-white text-gray-700 rounded-xl font-medium shadow hover:shadow-md transition flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              Words
            </button>
            <button
              onClick={() => setView('stats')}
              className="py-3 bg-white text-gray-700 rounded-xl font-medium shadow hover:shadow-md transition flex items-center justify-center gap-2"
            >
              <BarChart3 size={20} />
              Stats
            </button>
          </div>
        </div>

        {/* Exercise Types */}
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
            Practice Exercises
          </h2>
          <div className="space-y-3">
            {exerciseTypes.map((exercise) => {
              const Icon = exercise.icon;
              const typeStats = exerciseStats.byType[exercise.type];

              return (
                <button
                  key={exercise.type}
                  onClick={() => {
                    setExerciseConfig({ type: exercise.type, difficulty: 'medium' });
                    setView('exercise');
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-white bg-white hover:border-blue-200 hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${exercise.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{exercise.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{exercise.description}</p>
                      {typeStats && typeStats.completed > 0 && (
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{typeStats.completed} completed</span>
                          <span>•</span>
                          <span>{Math.round((typeStats.correct / typeStats.completed) * 100)}% accuracy</span>
                        </div>
                      )}
                    </div>
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start gap-3">
              <Settings size={20} className="text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Spaced Repetition</h3>
                <p className="text-sm text-blue-700 mt-1">
                  This app uses the SM-2 algorithm to optimize your learning.
                  Words you find easy will appear less frequently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
