import React from 'react';

export enum ToolType {
  Home = 'home',
  ProductPhoto = 'product-photo',
  FashionCatalogue = 'fashion-catalogue',
  FashionMixMatch = 'fashion-mix-match',
  HireModel = 'hire-model',
  PhotoStudio = 'photo-studio',
  PreWedding = 'pre-wedding',
  Rebrand = 'rebrand',
  Mockup = 'mockup',
  GeneratePose = 'generate-pose',
  CharacterGenerator = 'character-generator',
  BabyPhoto = 'baby-photo',
  Gallery = 'gallery'
}

export interface ToolConfig {
  id: ToolType;
  label: string;
  icon: React.FC<any>; // Lucide icon type approximation
  description: string;
  promptPlaceholder?: string;
  requiresImage?: boolean;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface AssetItem {
  id: string;
  type: 'generated' | 'upload' | 'logo';
  data: string; // Base64 string
  prompt?: string;
  timestamp: number;
  title?: string;
}