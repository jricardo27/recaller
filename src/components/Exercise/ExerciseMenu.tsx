import { useState } from 'react';
import type { ExerciseType, ExerciseDifficulty } from '../../types/exercise';
import {
  Image,
  Type,
  Languages,
  ArrowRightLeft,
  Globe,
  Brain,
  ChevronRight,
  Trophy,
  Target,
  Layers
} from 'lucide-react';
import { useExerciseStore } from '../../stores/exerciseStore';

interface ExerciseMenuProps {
  onSelectExercise: (type: ExerciseType, difficulty: ExerciseDifficulty) => void;
  onBack: () => void;
}

const exerciseTypes: { 
  type: ExerciseType; 
  title: string; 
  description: string; 
  icon: typeof Image;
  color: string;
  difficulty: 'easy' | 'medium' | 'hard';
}[] = [
  {
    type: 'image-to-hanzi',
    title: 'Image to Word',
    description: 'See an image, select the matching hanzi',
    icon: Image,
    color: 'from-purple-500 to-pink-500',
    difficulty: 'easy'
  },
  {
    type: 'hanzi-to-pinyin',
    title: 'Hanzi to Pinyin',
    description: 'See hanzi, select the correct pinyin (with tone tricks!)',
    icon: Type,
    color: 'from-blue-500 to-cyan-500',
    difficulty: 'medium'
  },
  {
    type: 'pinyin-to-hanzi',
    title: 'Pinyin to Hanzi',
    description: 'Hear/see pinyin, select the matching hanzi',
    icon: ArrowRightLeft,
    color: 'from-green-500 to-emerald-500',
    difficulty: 'medium'
  },
  {
    type: 'english-to-hanzi',
    title: 'English to Hanzi',
    description: 'See English, select the correct hanzi/pinyin',
    icon: Globe,
    color: 'from-orange-500 to-red-500',
    difficulty: 'hard'
  },
  {
    type: 'hanzi-to-english',
    title: 'Hanzi to English',
    description: 'See hanzi, select the English meaning',
    icon: Languages,
    color: 'from-indigo-500 to-purple-500',
    difficulty: 'medium'
  },
  {
    type: 'triple-match',
    title: 'Triple Match',
    description: 'Match image + English to hanzi + pinyin (expert mode!)',
    icon: Layers,
    color: 'from-red-500 to-rose-600',
    difficulty: 'hard'
  },
];

export function ExerciseMenu({ onSelectExercise, onBack }: ExerciseMenuProps) {
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(null);
  const stats = useExerciseStore(state => state.stats);

  const handleStart = () => {
    if (selectedType) {
      onSelectExercise(selectedType, 'medium');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-200 rounded-full transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Exercise Modes</h1>
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <div className="font-medium">{stats.totalExercises}</div>
                <div className="text-xs text-gray-500">Total Questions</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-blue-600">{Math.round(stats.correctRate)}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
          </div>
        </div>

        {/* Exercise Types */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
            Choose Exercise Type
          </h2>
          
          {exerciseTypes.map((exercise) => {
            const Icon = exercise.icon;
            const isSelected = selectedType === exercise.type;
            const typeStats = stats.byType[exercise.type];
            
            return (
              <button
                key={exercise.type}
                onClick={() => setSelectedType(exercise.type)}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-white bg-white hover:border-blue-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${exercise.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800">{exercise.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        exercise.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        exercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{exercise.description}</p>
                    {typeStats && typeStats.completed > 0 && (
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{typeStats.completed} completed</span>
                        <span>•</span>
                        <span>{Math.round((typeStats.correct / typeStats.completed) * 100)}% accuracy</span>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <ChevronRight size={16} className="text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!selectedType}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition flex items-center justify-center gap-2 ${
            selectedType
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedType ? (
            <>
              Start Exercise
              <Target size={20} />
            </>
          ) : (
            'Select an exercise type'
          )}
        </button>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Brain size={18} />
            Learning Tips
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Mix different exercise types for better retention</li>
            <li>• Image exercises are great for visual learners</li>
            <li>• Pinyin exercises help with pronunciation</li>
            <li>• Try "hard" mode once you're comfortable</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
