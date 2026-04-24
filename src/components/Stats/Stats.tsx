import { useWordStore } from '../../stores/wordStore';
import { Brain, Calendar, TrendingUp, Target, Award } from 'lucide-react';

export function Stats() {
  const stats = useWordStore(state => state.getStats());
  const words = useWordStore(state => state.getAllWords());

  // Calculate additional stats
  const totalReviews = Object.values(useWordStore.getState().cards).length;
  const averageEaseFactor = totalReviews > 0
    ? Object.values(useWordStore.getState().cards).reduce((sum, c) => sum + c.easeFactor, 0) / totalReviews
    : 2.5;

  const masteredPercent = stats.enabled > 0
    ? Math.round((stats.mastered / stats.enabled) * 100)
    : 0;

  const todayReviews = words.filter(w => {
    const card = w.card;
    if (!card || !card.lastReview) return false;
    const lastReview = new Date(card.lastReview);
    const today = new Date();
    return lastReview.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Statistics</h1>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <Brain size={24} className="opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-sm opacity-80">Total Words</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <Target size={24} className="opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.enabled}</div>
          <div className="text-sm opacity-80">Active Words</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <Award size={24} className="opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.mastered}</div>
          <div className="text-sm opacity-80">Mastered</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={24} className="opacity-80" />
          </div>
          <div className="text-3xl font-bold">{masteredPercent}%</div>
          <div className="text-sm opacity-80">Mastery Rate</div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Activity */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />
            Today's Activity
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Reviews Completed</span>
                <span className="font-medium">{todayReviews}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min((todayReviews / 20) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Due for Review</span>
                <span className="font-medium text-red-600">{stats.due}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">New Words</span>
                <span className="font-medium text-green-600">{stats.new}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Stats */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-purple-500" />
            Learning Progress
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Average Difficulty</span>
                <span className="font-medium">{averageEaseFactor.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-400">
                Lower = harder, Higher = easier
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Words in Learning</span>
                <span className="font-medium">
                  {stats.enabled - stats.new - stats.mastered}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Reviews</span>
                <span className="font-medium">{totalReviews}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mastery Progress */}
      <div className="mt-6 bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Mastery Distribution</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">New</span>
              <span className="font-medium">{stats.new} words</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all"
                style={{ width: `${(stats.new / Math.max(stats.enabled, 1)) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Learning</span>
              <span className="font-medium">
                {stats.enabled - stats.new - stats.mastered} words
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{
                  width: `${((stats.enabled - stats.new - stats.mastered) / Math.max(stats.enabled, 1)) * 100}%`
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Mastered</span>
              <span className="font-medium">{stats.mastered} words</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${(stats.mastered / Math.max(stats.enabled, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
