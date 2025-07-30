import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, Star, Calendar, Globe, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Content } from "@shared/schema";

const UK_AGE_RATINGS = [
  { value: "U", label: "U - Universal", color: "bg-green-600" },
  { value: "PG", label: "PG - Parental Guidance", color: "bg-yellow-600" },
  { value: "12", label: "12 - Ages 12+", color: "bg-orange-600" },
  { value: "15", label: "15 - Ages 15+", color: "bg-red-600" },
  { value: "18", label: "18 - Adults Only", color: "bg-purple-600" }
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Japanese", 
  "Korean", "Chinese", "Hindi", "Portuguese", "Russian", "Arabic"
];

const GENRES = [
  "Drama", "Comedy", "Documentary", "Action", "Animation", "Crime",
  "Romance", "Thriller", "Horror", "Family", "Sci-Fi", "Adventure",
  "Mystery", "Fantasy", "Music"
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: content = [], isLoading, error } = useQuery({
    queryKey: ['/api/content'],
    queryFn: async () => {
      const response = await fetch('/api/content');
      if (!response.ok) throw new Error('Failed to fetch content');
      return response.json() as Content[];
    }
  });

  const filteredContent = useMemo(() => {
    return content.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAge = !selectedAge || item.rating === selectedAge;
      const matchesLanguage = !selectedLanguage || item.language === selectedLanguage;
      const matchesGenre = !selectedGenre || item.genre.includes(selectedGenre);
      
      return matchesSearch && matchesAge && matchesLanguage && matchesGenre;
    });
  }, [content, searchTerm, selectedAge, selectedLanguage, selectedGenre]);

  const clearAllFilters = () => {
    setSelectedAge("");
    setSelectedLanguage("");
    setSelectedGenre("");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedAge || selectedLanguage || selectedGenre || searchTerm;

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">Content Loading Error</h1>
          <p className="text-gray-400">Unable to load Netflix catalog. Please check your connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-900 to-black p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Netflix UK Age Filter</h1>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search movies and TV shows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters {hasActiveFilters && <Badge className="ml-2 bg-red-600">Active</Badge>}
            </Button>
            
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearAllFilters}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="UK Age Rating" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {UK_AGE_RATINGS.map(rating => (
                    <SelectItem key={rating.value} value={rating.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${rating.color}`} />
                        {rating.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {LANGUAGES.map(language => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {GENRES.map(genre => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedAge && (
                <Badge variant="secondary" className="bg-red-600 text-white">
                  <Tag className="w-3 h-3 mr-1" />
                  {selectedAge}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => setSelectedAge("")}
                  />
                </Badge>
              )}
              {selectedLanguage && (
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  <Globe className="w-3 h-3 mr-1" />
                  {selectedLanguage}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => setSelectedLanguage("")}
                  />
                </Badge>
              )}
              {selectedGenre && (
                <Badge variant="secondary" className="bg-green-600 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  {selectedGenre}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => setSelectedGenre("")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content Grid */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="mb-4 text-gray-400">
          {isLoading ? (
            <span>Loading Netflix catalog...</span>
          ) : (
            <span>
              Showing {filteredContent.length} of {content.length} titles
              {hasActiveFilters && " (filtered)"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[2/3] bg-gray-800" />
                <Skeleton className="h-4 bg-gray-800" />
                <Skeleton className="h-3 bg-gray-800 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400 mb-4">No content found</p>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredContent.map((item) => {
              const ageRating = UK_AGE_RATINGS.find(r => r.value === item.rating);
              return (
                <Card key={item.id} className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors">
                  <CardContent className="p-0">
                    <div className="aspect-[2/3] relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-t-lg"
                        loading="lazy"
                      />
                      {ageRating && (
                        <Badge className={`absolute top-2 left-2 ${ageRating.color} text-white text-xs`}>
                          {item.rating}
                        </Badge>
                      )}
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white text-xs">
                        {item.type === 'movie' ? 'Movie' : 'Series'}
                      </Badge>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{item.year}</span>
                        <Globe className="w-3 h-3" />
                        <span>{item.language}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-3">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
