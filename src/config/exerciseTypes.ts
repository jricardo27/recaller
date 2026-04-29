import { Image, Type, ArrowRightLeft, Globe, Languages, Layers } from 'lucide-react';
import type { ExerciseType } from '../types/exercise';

export interface ExerciseTypeConfig {
  type: ExerciseType;
  title: string;
  description: string;
  icon: typeof Image;
  color: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const exerciseTypes: ExerciseTypeConfig[] = [
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
  }
];

export const defaultExerciseStats = {
  flashcard: { completed: 0, correct: 0 },
  'image-to-hanzi': { completed: 0, correct: 0 },
  'hanzi-to-pinyin': { completed: 0, correct: 0 },
  'pinyin-to-hanzi': { completed: 0, correct: 0 },
  'english-to-hanzi': { completed: 0, correct: 0 },
  'hanzi-to-english': { completed: 0, correct: 0 },
  'triple-match': { completed: 0, correct: 0 }
};
