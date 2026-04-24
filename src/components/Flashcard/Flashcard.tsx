import { useState } from 'react';
import type { WordWithProgress, Quality } from '../../types';
import { getQualityColor, getIntervalPreview } from '../../algorithms/sm2';
import { Eye, EyeOff, Image as ImageIcon, RotateCcw } from 'lucide-react';

interface FlashcardProps {
  word: WordWithProgress;
  onRate: (quality: Quality) => void;
  onSkip?: () => void;
  imageUrl?: string;
}

export function Flashcard({ word, onRate, onSkip, imageUrl }: FlashcardProps) {
  const [revealed, setRevealed] = useState(false);
  const [showImage, setShowImage] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleRate = (quality: Quality) => {
    setRevealed(false);
    onRate(quality);
  };

  const qualityButtons: { quality: Quality; label: string }[] = [
    { quality: 1, label: 'Again' },
    { quality: 2, label: 'Hard' },
    { quality: 3, label: 'Good' },
    { quality: 4, label: 'Easy' },
    { quality: 5, label: 'Perfect' },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div
        className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
          revealed ? 'min-h-[400px]' : 'min-h-[300px]'
        }`}
      >
        {/* Image Section */}
        {showImage && imageUrl && !imageError && (
          <div className="relative h-48 bg-gray-100">
            <img
              src={imageUrl}
              alt={word.hanzi}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <button
              onClick={() => setShowImage(false)}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
            >
              <EyeOff size={16} />
            </button>
          </div>
        )}

        {(!imageUrl || imageError) && (
          <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <ImageIcon size={48} className="text-gray-400" />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Hanzi - Always visible */}
          <div className="text-center mb-6">
            <h2 className="text-7xl text-gray-800 mb-2 font-hanzi">{word.hanzi}</h2>
            {word.isNew && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                New
              </span>
            )}
          </div>

          {/* Hidden content */}
          <div
            className={`transition-all duration-300 ${
              revealed ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'
            }`}
          >
            <div className="text-center border-t pt-4 mb-6">
              <p className="text-2xl text-blue-600 font-medium mb-1">{word.pinyin}</p>
              <p className="text-xl text-gray-600">{word.translation}</p>
            </div>
          </div>

          {/* Reveal button */}
          {!revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
            >
              <Eye className="inline mr-2" size={20} />
              Tap to reveal
            </button>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {qualityButtons.map(({ quality, label }) => (
            <button
              key={quality}
              onClick={() => handleRate(quality as Quality)}
              className={`py-3 px-2 rounded-xl text-white font-medium transition-all ${getQualityColor(
                quality as Quality
              )}`}
            >
              <div className="text-xs mb-1">{label}</div>
              <div className="text-[10px] opacity-80">
                {getIntervalPreview(word.card, quality as Quality)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Skip button */}
      <div className="mt-4 text-center">
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          <RotateCcw className="inline mr-1" size={14} />
          Skip for now
        </button>
      </div>
    </div>
  );
}
