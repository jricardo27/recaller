import { useState, useMemo } from 'react';
import { useWordStore } from '../../stores/wordStore';
import { Search, Eye, EyeOff, RotateCcw, Filter, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export function WordManager() {
  const words = useWordStore(state => state.getAllWords());
  const toggleWord = useWordStore(state => state.toggleWord);
  const resetWord = useWordStore(state => state.resetWord);
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'new' | 'due' | 'mastered'>('all');

  const filteredWords = useMemo(() => {
    return words.filter(word => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        word.hanzi.toLowerCase().includes(searchLower) ||
        word.pinyin.toLowerCase().includes(searchLower) ||
        word.translation.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Category filter
      switch (filter) {
        case 'enabled':
          return word.enabled;
        case 'disabled':
          return !word.enabled;
        case 'new':
          return word.enabled && word.isNew;
        case 'due':
          return word.enabled && word.isDue && !word.isNew;
        case 'mastered':
          return word.enabled && word.card && word.card.interval > 30;
        default:
          return true;
      }
    });
  }, [words, search, filter]);

  const stats = {
    total: words.length,
    enabled: words.filter(w => w.enabled).length,
    disabled: words.filter(w => !w.enabled).length,
    new: words.filter(w => w.enabled && w.isNew).length,
    due: words.filter(w => w.enabled && w.isDue && !w.isNew).length,
    mastered: words.filter(w => w.enabled && w.card && w.card.interval > 30).length,
  };

  const getWordStatus = (word: typeof words[0]) => {
    if (!word.enabled) return { label: 'Disabled', icon: EyeOff, color: 'text-gray-400' };
    if (word.isNew) return { label: 'New', icon: Sparkles, color: 'text-green-500' };
    if (word.card && word.card.interval > 30) return { label: 'Mastered', icon: CheckCircle2, color: 'text-yellow-500' };
    if (word.isDue) return { label: 'Due', icon: Clock, color: 'text-red-500' };
    return { label: 'Learning', icon: Clock, color: 'text-blue-500' };
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Word Manager</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        <div className="bg-white p-3 rounded-lg shadow text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
          <div className="text-xs text-gray-500">Enabled</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
          <div className="text-xs text-gray-500">New</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-red-600">{stats.due}</div>
          <div className="text-xs text-gray-500">Due</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.mastered}</div>
          <div className="text-xs text-gray-500">Mastered</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-gray-400">{stats.disabled}</div>
          <div className="text-xs text-gray-500">Disabled</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Words</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="new">New</option>
            <option value="due">Due for Review</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>
      </div>

      {/* Word List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y">
          {filteredWords.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No words found
            </div>
          ) : (
            filteredWords.map((word) => {
              const status = getWordStatus(word);
              const StatusIcon = status.icon;

              return (
                <div
                  key={word.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold w-20">{word.hanzi}</span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">{word.pinyin}</div>
                      <div className="text-sm text-gray-700">{word.translation}</div>
                      <div className={`flex items-center gap-1 text-xs mt-1 ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                        {!word.isNew && word.card && (
                          <span className="text-gray-400 ml-2">
                            · {word.card.interval}d · EF {word.card.easeFactor.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!word.isNew && (
                      <button
                        onClick={() => resetWord(word.id)}
                        className="p-2 text-gray-400 hover:text-yellow-500 transition"
                        title="Reset progress"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => toggleWord(word.id)}
                      className={`p-2 rounded-lg transition ${
                        word.enabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={word.enabled ? 'Disable word' : 'Enable word'}
                    >
                      {word.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
