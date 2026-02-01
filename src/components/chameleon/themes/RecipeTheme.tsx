'use client';

/**
 * RecipeTheme - Food Blog Disguise
 *
 * Looks like a Pinterest/Instagram-style recipe page.
 * The hero image is the stealth trigger zone.
 *
 * FEATURES:
 * - Hero food image (trigger zone)
 * - Recipe title and description
 * - Ingredient list
 * - Step-by-step instructions
 * - Fake comments section
 *
 * TRIGGER: Triple-tap on the hero image
 */

import { useState } from 'react';
import { Heart, Bookmark, Share2, Clock, Users, ChefHat, Star } from 'lucide-react';
import { useBurnerCleanup } from '@/hooks/use-burner-cleanup';
import { StealthTrigger } from '../StealthTrigger';
import { StealthCamera } from '../StealthCamera';

interface RecipeThemeProps {
  /** Recipe slug from URL */
  contentSlug: string;
  /** Public key for encryption (from URL fragment) */
  publicKey: string | null;
  /** Burner link slug (from query param) */
  burnerSlug: string;
}

// Recipe content based on slug
const RECIPES: Record<string, {
  title: string;
  description: string;
  time: string;
  servings: string;
  rating: number;
  image: string;
  ingredients: string[];
  steps: string[];
}> = {
  'apple-pie': {
    title: 'Classic Apple Pie',
    description: 'A timeless American dessert with a flaky butter crust and perfectly spiced apple filling. This recipe has been passed down through generations.',
    time: '1 hr 30 min',
    servings: '8',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=800&h=600&fit=crop',
    ingredients: [
      '6 cups thinly sliced, peeled apples',
      '3/4 cup granulated sugar',
      '2 tablespoons all-purpose flour',
      '1 teaspoon ground cinnamon',
      '1/4 teaspoon ground nutmeg',
      '1 tablespoon butter',
      '2 pie crusts (homemade or store-bought)',
    ],
    steps: [
      'Preheat oven to 425°F (220°C).',
      'Mix sugar, flour, cinnamon, and nutmeg in a large bowl.',
      'Add sliced apples and toss to coat evenly.',
      'Place one crust in a 9-inch pie plate.',
      'Fill with apple mixture and dot with butter.',
      'Cover with top crust, seal edges, and cut slits.',
      'Bake 40-50 minutes until golden brown.',
      'Cool on a wire rack before serving.',
    ],
  },
  'chocolate-cake': {
    title: 'Rich Chocolate Layer Cake',
    description: 'Moist, decadent chocolate cake with silky chocolate buttercream. Perfect for special occasions or when you need a chocolate fix.',
    time: '2 hr',
    servings: '12',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop',
    ingredients: [
      '2 cups all-purpose flour',
      '2 cups sugar',
      '3/4 cup cocoa powder',
      '2 teaspoons baking soda',
      '1 teaspoon salt',
      '2 eggs',
      '1 cup buttermilk',
      '1 cup hot coffee',
    ],
    steps: [
      'Preheat oven to 350°F (175°C). Grease two 9-inch pans.',
      'Whisk together dry ingredients in a large bowl.',
      'Add eggs, buttermilk, and oil. Beat for 2 minutes.',
      'Stir in hot coffee (batter will be thin).',
      'Pour into prepared pans.',
      'Bake 30-35 minutes until a toothpick comes out clean.',
      'Cool completely before frosting.',
      'Frost with chocolate buttercream.',
    ],
  },
  'default': {
    title: 'Grandmother\'s Secret Recipe',
    description: 'A cherished family recipe that has brought joy to countless gatherings. Simple ingredients, extraordinary flavor.',
    time: '45 min',
    servings: '6',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=600&fit=crop',
    ingredients: [
      '2 cups of love',
      '1 cup patience',
      'A handful of tradition',
      'Sprinkle of creativity',
      'Generous portion of family memories',
    ],
    steps: [
      'Gather your loved ones in the kitchen.',
      'Share stories while you prepare.',
      'Add ingredients with care and attention.',
      'Let it cook slowly to develop flavors.',
      'Serve with a smile.',
    ],
  },
};

export function RecipeTheme({ contentSlug, publicKey, burnerSlug }: RecipeThemeProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { wipeAndExit } = useBurnerCleanup();

  // Get recipe content
  const recipe = RECIPES[contentSlug] || RECIPES['default'];

  // Handle unlock (show camera)
  const handleUnlock = () => {
    if (publicKey) {
      setShowCamera(true);
    }
  };

  // Handle camera close
  const handleCameraClose = () => {
    setShowCamera(false);
  };

  // Handle upload complete
  const handleUploadComplete = () => {
    setShowCamera(false);
    setTimeout(() => {
        wipeAndExit();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Camera overlay */}
      {showCamera && publicKey && (
        <StealthCamera
          publicKey={publicKey}
          slug={burnerSlug}
          onComplete={handleUploadComplete}
          onClose={handleCameraClose}
          successMessage="Recipe saved to favorites!"
        />
      )}

      {/* Recipe content */}
      <div className="max-w-2xl mx-auto">
        {/* Hero image with stealth trigger */}
        <StealthTrigger
          onUnlock={handleUnlock}
          triggerType="tripleTap"
          className="w-full"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        </StealthTrigger>

        {/* Recipe info */}
        <div className="p-4">
          {/* Title and actions */}
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <Heart
                  className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                />
              </button>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <Bookmark
                  className={`w-6 h-6 ${isSaved ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`}
                />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Share2 className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-4">{recipe.description}</p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{recipe.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} servings</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{recipe.rating}</span>
            </div>
          </div>

          {/* Ingredients */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <ChefHat className="w-5 h-5" />
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="w-2 h-2 mt-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Instructions</h2>
            <ol className="space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Fake comments */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Comments (47)</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Sarah M.</p>
                  <p className="text-gray-600 text-sm">Made this for Thanksgiving and everyone loved it! Will definitely make again.</p>
                  <p className="text-gray-400 text-xs mt-1">2 days ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Mike R.</p>
                  <p className="text-gray-600 text-sm">Perfect recipe! I added a bit more cinnamon and it was amazing.</p>
                  <p className="text-gray-400 text-xs mt-1">1 week ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeTheme;
